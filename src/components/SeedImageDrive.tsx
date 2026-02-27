import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderOpen, Upload, Trash2, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SeedImageDriveProps {
  onSelect: (url: string) => void;
  triggerLabel?: string;
}

export function SeedImageDrive({ onSelect, triggerLabel = "My Images" }: SeedImageDriveProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["seed_image_drive", user?.id],
    queryFn: async () => {
      // List files in user's drive folder
      const { data, error } = await supabase.storage
        .from("seed-images")
        .list(`drive/${user!.id}`, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      if (error) throw error;
      return (data || []).filter((f) => !f.id?.endsWith("/")).map((f) => ({
        name: f.name,
        path: `drive/${user!.id}/${f.name}`,
        url: supabase.storage.from("seed-images").getPublicUrl(`drive/${user!.id}/${f.name}`).data.publicUrl,
        created: f.created_at,
      }));
    },
    enabled: !!user && open,
  });

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || !user) return;
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const ext = file.name.split(".").pop();
          const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
          const path = `drive/${user.id}/${safeName}`;
          const { error } = await supabase.storage.from("seed-images").upload(path, file);
          if (error) throw error;
        }
        queryClient.invalidateQueries({ queryKey: ["seed_image_drive"] });
        toast({ title: `${files.length} image(s) uploaded` });
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleDelete = async (path: string) => {
    setDeleting(path);
    const { error } = await supabase.storage.from("seed-images").remove([path]);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["seed_image_drive"] });
    }
    setDeleting(null);
  };

  const handleSelect = (url: string) => {
    onSelect(url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <FolderOpen className="h-3.5 w-3.5" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <FolderOpen className="h-4 w-4" />
            Seed Image Drive
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <Button size="sm" onClick={handleUpload} disabled={uploading} className="gap-1.5">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
          <span className="text-[10px] text-muted-foreground">{images.length} images</span>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : images.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <FolderOpen className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">No saved images yet. Upload some to reuse across generations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div key={img.path} className="relative group rounded-lg overflow-hidden bg-muted aspect-square cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                  onClick={() => handleSelect(img.url)}>
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/30 transition-colors flex items-center justify-center">
                    <Check className="h-6 w-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(img.path); }}
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    {deleting === img.path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
