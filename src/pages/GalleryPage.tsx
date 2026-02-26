import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { FAB } from "@/components/FAB";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ArrowLeft, Upload, ImagePlus, Loader2, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const GalleryPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  const { data: sourceImages = [], isLoading } = useQuery({
    queryKey: ["source_images", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_images")
        .select("*")
        .eq("project_id", projectId!)
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  // Get edit counts per source image
  const { data: editCounts = {} } = useQuery({
    queryKey: ["image_edit_counts", projectId],
    queryFn: async () => {
      const imageIds = sourceImages.map((si: any) => si.id);
      if (imageIds.length === 0) return {};
      const { data, error } = await supabase
        .from("image_edits")
        .select("source_image_id")
        .in("source_image_id", imageIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((e: any) => {
        counts[e.source_image_id] = (counts[e.source_image_id] || 0) + 1;
      });
      return counts;
    },
    enabled: sourceImages.length > 0,
  });

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !user || !projectId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${projectId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("seed-images")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("seed-images")
          .getPublicUrl(path);

        await supabase.from("source_images").insert({
          project_id: projectId,
          user_id: user.id,
          image_url: urlData.publicUrl,
          original_filename: file.name,
          file_size: file.size,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["source_images", projectId] });
      setUploadOpen(false);
      toast({ title: `${files.length} image(s) uploaded` });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const totalCost = sourceImages.reduce((sum: number) => sum, 0); // placeholder

  return (
    <AppShell
      title={project?.name || "Gallery"}
      headerLeft={
        <button onClick={() => navigate("/")} className="tap-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
    >
      <div className="p-4">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          <span>{sourceImages.length} image{sourceImages.length !== 1 ? "s" : ""}</span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {totalCost.toFixed(2)}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center pt-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sourceImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-32 text-center">
            <ImagePlus className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No images yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Tap + to upload source images</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {sourceImages.map((img: any) => (
              <Card
                key={img.id}
                className="relative cursor-pointer overflow-hidden border-border/50 hover:border-primary/30 transition-colors"
                onClick={() => navigate(`/image/${img.id}`)}
              >
                <div className="aspect-square bg-muted">
                  <img
                    src={img.image_url}
                    alt={img.original_filename || "Source image"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {(editCounts as any)[img.id] > 0 && (
                  <Badge
                    variant="secondary"
                    className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0"
                  >
                    {(editCounts as any)[img.id]} edit{(editCounts as any)[img.id] !== 1 ? "s" : ""}
                  </Badge>
                )}
                <div className="p-2">
                  <p className="text-[10px] text-muted-foreground truncate">
                    {img.original_filename || "Untitled"}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => setUploadOpen(true)} label="Upload Images" />

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Upload Images</SheetTitle>
            <SheetDescription>Add source images to this project for editing.</SheetDescription>
          </SheetHeader>
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full"
              size="lg"
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading..." : "Choose Files"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default GalleryPage;
