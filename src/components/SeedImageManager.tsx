import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FolderOpen, Upload, Trash2, Loader2, ArrowLeft, CheckSquare, Square, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { LazyImage } from "@/components/ImageSkeleton";

interface SeedImageManagerProps {
  onBack: () => void;
}

export function SeedImageManager({ onBack }: SeedImageManagerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["seed_image_drive", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("seed-images")
        .list(`drive/${user!.id}`, { limit: 500, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data || []).filter((f) => !f.id?.endsWith("/")).map((f) => ({
        name: f.name,
        path: `drive/${user!.id}/${f.name}`,
        url: supabase.storage.from("seed-images").getPublicUrl(`drive/${user!.id}/${f.name}`).data.publicUrl,
        created: f.created_at,
      }));
    },
    enabled: !!user,
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    let count = 0;
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const path = `drive/${user.id}/${safeName}`;
        const { error } = await supabase.storage.from("seed-images").upload(path, file);
        if (error) throw error;
        count++;
      }
      queryClient.invalidateQueries({ queryKey: ["seed_image_drive"] });
      toast({ title: `${count} image(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDeleteSingle = async (path: string) => {
    setDeleting((prev) => new Set(prev).add(path));
    const { error } = await supabase.storage.from("seed-images").remove([path]);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else queryClient.invalidateQueries({ queryKey: ["seed_image_drive"] });
    setDeleting((prev) => { const n = new Set(prev); n.delete(path); return n; });
  };

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    const paths = Array.from(selected);
    setDeleting(new Set(paths));
    const { error } = await supabase.storage.from("seed-images").remove(paths);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      queryClient.invalidateQueries({ queryKey: ["seed_image_drive"] });
      toast({ title: `${paths.length} image(s) deleted` });
    }
    setSelected(new Set());
    setSelectMode(false);
    setDeleting(new Set());
  };

  const toggleSelect = (path: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(path)) n.delete(path); else n.add(path);
      return n;
    });
  };

  const selectAll = () => {
    if (selected.size === images.length) setSelected(new Set());
    else setSelected(new Set(images.map((i) => i.path)));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <FolderOpen className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm flex-1">My Images</h2>
        <span className="text-[10px] text-muted-foreground tabular-nums">{images.length} images</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-1.5">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Upload
        </Button>
        {!selectMode ? (
          <Button size="sm" variant="outline" onClick={() => setSelectMode(true)} disabled={images.length === 0} className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            Select
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={selectAll} className="gap-1.5 text-xs">
              {selected.size === images.length ? "Deselect All" : "Select All"}
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={selected.size === 0 || deleting.size > 0} className="gap-1.5 text-xs">
              {deleting.size > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete ({selected.size})
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <FolderOpen className="h-8 w-8 text-muted-foreground/20" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">No saved images yet</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Upload seed images to reuse across generations</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {images.map((img) => (
            <div
              key={img.path}
              className={cn(
                "relative group rounded-lg overflow-hidden bg-muted aspect-square transition-all",
                selectMode && "cursor-pointer active:scale-[0.97]",
                selected.has(img.path) && "ring-2 ring-primary ring-offset-1 ring-offset-background"
              )}
              onClick={() => selectMode && toggleSelect(img.path)}
            >
              <LazyImage
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              {selectMode && (
                <div className={cn(
                  "absolute top-1.5 left-1.5 h-6 w-6 rounded-md flex items-center justify-center transition-colors",
                  selected.has(img.path)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/60 backdrop-blur text-muted-foreground"
                )}>
                  {selected.has(img.path) ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </div>
              )}
              {!selectMode && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteSingle(img.path); }}
                  className="absolute top-1 right-1 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity tap-target"
                >
                  {deleting.has(img.path) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
