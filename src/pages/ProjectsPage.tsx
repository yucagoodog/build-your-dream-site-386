import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { FAB } from "@/components/FAB";
import { StatusDot } from "@/components/StatusDot";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Clapperboard, Loader2, Trash2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type ProjectType = "video" | "image";

const ProjectsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [script, setScript] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeMode, setActiveMode] = useState<ProjectType>("video");
  const [newProjectType, setNewProjectType] = useState<ProjectType>("video");

  // Load default mode from user settings
  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data && (data as any).default_mode) {
          setActiveMode((data as any).default_mode as ProjectType);
          setNewProjectType((data as any).default_mode as ProjectType);
        }
      });
  }, [user]);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const filteredProjects = projects.filter(
    (p: any) => (p.project_type || "video") === activeMode
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("projects").insert({
        user_id: user!.id,
        name: name.trim(),
        description: description.trim(),
        script: script.trim(),
        project_type: newProjectType,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setSheetOpen(false);
      setName("");
      setDescription("");
      setScript("");
      toast({ title: "Project created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setDeleteId(null);
      toast({ title: "Project deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const statusMap: Record<string, "draft" | "queued" | "processing" | "completed" | "failed"> = {
    draft: "draft",
    queued: "queued",
    processing: "processing",
    completed: "completed",
    failed: "failed",
  };

  const handleProjectClick = (project: any) => {
    const type = project.project_type || "video";
    if (type === "image") {
      navigate(`/gallery/${project.id}`);
    } else {
      navigate(`/scenes/${project.id}`);
    }
  };

  return (
    <AppShell title="Projects">
      <div className="p-4 space-y-3">
        {/* Mode Switcher */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          <button
            onClick={() => setActiveMode("video")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
              activeMode === "video"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Clapperboard className="h-3.5 w-3.5" />
            Video
          </button>
          <button
            onClick={() => setActiveMode("image")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
              activeMode === "image"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            Image
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center pt-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-32 text-center">
            {activeMode === "video" ? (
              <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            )}
            <p className="text-muted-foreground text-sm">No {activeMode} projects yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Tap + to create your first {activeMode} project</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project: any) => (
              <Card
                key={project.id}
                className="tap-target cursor-pointer border-border/50 bg-card transition-colors hover:border-primary/30 active:bg-surface-1"
                onClick={() => handleProjectClick(project)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm leading-tight pr-2">{project.name}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusDot status={statusMap[project.status] || "draft"} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(project.id);
                        }}
                        className="tap-target flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{project.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <FAB onClick={() => { setNewProjectType(activeMode); setSheetOpen(true); }} label="New Project" />

      {/* New Project Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>New {newProjectType === "video" ? "Video" : "Image"} Project</SheetTitle>
            <SheetDescription>Create a new {newProjectType} production project.</SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-xs">Project Type</Label>
              <div className="flex rounded-lg bg-muted p-1 gap-1">
                <button
                  onClick={() => setNewProjectType("video")}
                  className={cn(
                    "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
                    newProjectType === "video"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  Video
                </button>
                <button
                  onClick={() => setNewProjectType("image")}
                  className={cn(
                    "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
                    newProjectType === "image"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  Image
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Project Name</Label>
              <Input
                placeholder={newProjectType === "video" ? "My Video Project" : "My Image Project"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-surface-1"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Brief description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="bg-surface-1"
              />
            </div>
            {newProjectType === "video" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Script</Label>
                <Textarea
                  placeholder="Paste your full script here. You can break it into scenes later."
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  className="bg-surface-1 min-h-[120px]"
                />
              </div>
            )}
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!name.trim() || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending && <Loader2 className="animate-spin" />}
              Create Project
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default ProjectsPage;
