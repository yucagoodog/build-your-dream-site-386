import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { FAB } from "@/components/FAB";
import { StatusDot } from "@/components/StatusDot";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Clapperboard, Loader2, Image, ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const ScenesPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newDirection, setNewDirection] = useState("");

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

  const { data: scenes = [], isLoading } = useQuery({
    queryKey: ["scenes", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("project_id", projectId!)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!projectId && !!user,
  });

  const createScene = useMutation({
    mutationFn: async () => {
      const nextNumber = scenes.length + 1;
      const { error } = await supabase.from("scenes").insert({
        user_id: user!.id,
        project_id: projectId!,
        scene_number: nextNumber,
        sort_order: nextNumber,
        direction: newDirection.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes", projectId] });
      setSheetOpen(false);
      setNewDirection("");
      toast({ title: "Scene added" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteScene = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scenes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes", projectId] });
      toast({ title: "Scene deleted" });
    },
  });

  if (!projectId) {
    return (
      <AppShell title="Scenes">
        <div className="flex flex-col items-center justify-center pt-32 text-center px-4">
          <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-sm">Select a project first</p>
          <p className="text-muted-foreground/70 text-xs mt-1">Go to Projects and tap a project to view its scenes</p>
        </div>
      </AppShell>
    );
  }

  const headerRight = (
    <button onClick={() => navigate("/")} className="tap-target flex items-center gap-1 text-xs text-muted-foreground">
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );

  return (
    <AppShell title={project?.name || "Scenes"} headerRight={headerRight}>
      <div className="px-4 pt-2 pb-1 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{scenes.length} scene{scenes.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="p-4 pt-2 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center pt-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <Image className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No scenes yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Tap + to add your first scene</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenes.map((scene) => (
              <Card
                key={scene.id}
                className="tap-target cursor-pointer border-border/50 bg-card transition-colors hover:border-primary/30 active:bg-surface-1"
                onClick={() => navigate(`/scene/${scene.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-1 flex items-center justify-center overflow-hidden">
                      {scene.seed_image_url ? (
                        <img src={scene.seed_image_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image className="h-5 w-5 text-muted-foreground/40" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Scene {scene.scene_number}</span>
                        <div className="flex items-center gap-2">
                          <StatusDot status={(scene.status as any) || "draft"} />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteScene.mutate(scene.id);
                            }}
                            className="tap-target flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {scene.direction && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{scene.direction}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/60">
                        <span>{scene.resolution}</span>
                        <span>·</span>
                        <span>{scene.duration}s</span>
                        {!scene.seed_image_url && (
                          <>
                            <span>·</span>
                            <span className="text-status-warning">No image</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => setSheetOpen(true)} label="Add Scene" />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>Add Scene</SheetTitle>
            <SheetDescription>Add a new scene to this project. You can add the seed image and prompt in the editor.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Scene Direction (optional)</Label>
              <Textarea
                placeholder="Describe what happens in this scene..."
                value={newDirection}
                onChange={(e) => setNewDirection(e.target.value)}
                className="bg-surface-1 min-h-[80px]"
              />
            </div>
            <Button
              onClick={() => createScene.mutate()}
              disabled={createScene.isPending}
              className="w-full"
            >
              {createScene.isPending && <Loader2 className="animate-spin" />}
              Add Scene
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default ScenesPage;
