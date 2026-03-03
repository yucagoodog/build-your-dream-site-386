import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Download, Search, Copy, Trash2, Clock, DollarSign,
  AlertCircle, Sparkles, Loader2, Filter, ImageIcon, Clapperboard, Play, RotateCcw, ZoomIn, FolderOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { saveToDrive } from "@/lib/save-to-drive";
import { formatDistanceToNow } from "date-fns";

type LibraryItem = {
  id: string;
  type: "image" | "video";
  prompt: string | null;
  negative_prompt: string | null;
  model: string;
  status: string;
  cost: number | null;
  error_message: string | null;
  created_at: string;
  project_id: string | null;
  is_final: boolean;
  // Image-specific
  output_size?: string | null;
  seed?: number | null;
  enable_prompt_expansion?: boolean | null;
  source_image_urls?: string[] | null;
  output_image_url?: string | null;
  // Video-specific
  video_url?: string | null;
  parameters?: Record<string, any> | null;
  scene_id?: string;
};

const statusColors: Record<string, string> = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  processing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  failed: "bg-destructive/15 text-destructive border-destructive/20",
  queued: "bg-muted text-muted-foreground border-border",
};

const LibraryPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Fetch image edits
  const { data: imageEdits = [], isLoading: loadingImages } = useQuery({
    queryKey: ["library_image_edits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_edits")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any): LibraryItem => ({
        id: e.id,
        type: "image",
        prompt: e.prompt,
        negative_prompt: e.negative_prompt,
        model: e.model,
        status: e.status,
        cost: e.cost,
        error_message: e.error_message,
        created_at: e.created_at,
        project_id: e.project_id,
        is_final: e.is_final,
        output_size: e.output_size,
        seed: e.seed,
        enable_prompt_expansion: e.enable_prompt_expansion,
        source_image_urls: e.source_image_urls,
        output_image_url: e.output_image_url,
      }));
    },
    enabled: !!user,
  });

  // Fetch video generations
  const { data: videoGens = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["library_video_gens", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((g: any): LibraryItem => ({
        id: g.id,
        type: "video",
        prompt: g.prompt_used,
        negative_prompt: g.negative_prompt_used,
        model: (g.parameters as any)?.model || "wan26-i2v-flash",
        status: g.status,
        cost: g.cost,
        error_message: g.error_message,
        created_at: g.created_at,
        project_id: null,
        is_final: g.is_final,
        video_url: g.video_url,
        parameters: g.parameters as any,
        scene_id: g.scene_id,
      }));
    },
    enabled: !!user,
  });

  const isLoading = loadingImages || loadingVideos;
  const allItems = [...imageEdits, ...videoGens];

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_lookup", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

  // Filter & search
  const filtered = allItems.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchPrompt = e.prompt?.toLowerCase().includes(q);
      const matchNeg = e.negative_prompt?.toLowerCase().includes(q);
      const matchModel = e.model?.toLowerCase().includes(q);
      if (!matchPrompt && !matchNeg && !matchModel) return false;
    }
    return true;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "cost") return (b.cost || 0) - (a.cost || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCopyParams = (item: LibraryItem) => {
    const params = item.type === "image"
      ? {
          prompt: item.prompt || "",
          negative_prompt: item.negative_prompt || "",
          model: item.model,
          output_size: item.output_size || "1024*1024",
          seed: item.seed,
          enable_prompt_expansion: item.enable_prompt_expansion,
        }
      : {
          prompt: item.prompt || "",
          negative_prompt: item.negative_prompt || "",
          model: item.model,
          ...(item.parameters || {}),
        };
    navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    toast({ title: "Parameters copied to clipboard" });
  };

  const handleReEdit = (item: LibraryItem) => {
    if (item.type === "video") {
      const params = item.parameters || {};
      navigate("/", {
        state: {
          reEdit: {
            mode: "video",
            prompt: item.prompt || "",
            negative_prompt: item.negative_prompt || "",
            seed_image_url: params.seed_image_url || "",
            resolution: params.resolution || "720p",
            duration: params.duration || 5,
            shot_type: params.shot_type || "single",
            seed: params.seed,
            prompt_expansion: params.prompt_expansion ?? true,
            audio: params.audio ?? false,
          },
        },
      });
      return;
    }

    // For image, navigate to Create with pre-filled params
    navigate("/", {
      state: {
        reEdit: {
          mode: "image",
          prompt: item.prompt || "",
          negative_prompt: item.negative_prompt || "",
          output_size: item.output_size || "1024*1024",
          model: item.model,
          seed: item.seed,
          enable_prompt_expansion: item.enable_prompt_expansion ?? true,
          source_image_urls: item.source_image_urls || [],
        },
      },
    });
  };

  const [upscaling, setUpscaling] = useState<Set<string>>(new Set());

  const handleUpscale = async (item: LibraryItem) => {
    const imageUrl = item.output_image_url;
    if (!imageUrl) {
      toast({ title: "No output image to upscale", variant: "destructive" });
      return;
    }

    setUpscaling((prev) => new Set(prev).add(item.id));
    toast({ title: "Starting upscale…" });

    try {
      const { data: startData, error: startError } = await supabase.functions.invoke("upscale-image", {
        body: {
          action: "start",
          image_url: imageUrl,
          prompt: "Enhance this image to higher quality and resolution with maximum detail",
          output_format: "png",
          source_edit_id: item.id,
          project_id: item.project_id,
        },
      });

      if (startError || startData?.error) {
        toast({ title: "Upscale failed", description: startData?.error || startError?.message, variant: "destructive" });
        setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
        return;
      }

      const editId = startData.edit.id;

      // Poll
      const poll = async () => {
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const { data } = await supabase.functions.invoke("upscale-image", {
            body: { action: "poll", edit_id: editId },
          });
          if (data?.status === "completed") {
            toast({ title: "Upscale complete!" });
            queryClient.invalidateQueries({ queryKey: ["library_image_edits"] });
            break;
          }
          if (data?.status === "failed") {
            toast({ title: "Upscale failed", description: data.error, variant: "destructive" });
            break;
          }
        }
        setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
      };
      poll();
    } catch (err: any) {
      toast({ title: "Upscale error", description: err.message, variant: "destructive" });
      setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const handleDelete = async (item: LibraryItem) => {
    const table = item.type === "image" ? "image_edits" : "generations";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: item.type === "image" ? ["library_image_edits"] : ["library_video_gens"] });
      toast({ title: "Deleted" });
    }
  };

  const totalCost = allItems.reduce((sum, e) => sum + (e.cost || 0), 0);
  const completedCount = allItems.filter((e) => e.status === "completed").length;
  const imageCount = allItems.filter((e) => e.type === "image").length;
  const videoCount = allItems.filter((e) => e.type === "video").length;

  return (
    <AppShell title="Library">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        {/* Stats strip */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {allItems.length} total
          </span>
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {imageCount} images
          </span>
          <span className="flex items-center gap-1">
            <Clapperboard className="h-3.5 w-3.5" />
            {videoCount} videos
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${totalCost.toFixed(3)}
          </span>
        </div>

        {/* Type switcher */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {[
            { value: "all", label: "All", icon: Sparkles },
            { value: "image", label: "Image", icon: ImageIcon },
            { value: "video", label: "Video", icon: Clapperboard },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                typeFilter === value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs bg-surface-1"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-surface-1">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="processing" className="text-xs">Processing</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-surface-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">Newest</SelectItem>
              <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
              <SelectItem value="cost" className="text-xs">Highest Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Sparkles className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all" || typeFilter !== "all" ? "No results match your filters." : "No generations yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                userId={user!.id}
                projectName={item.project_id ? projectMap.get(item.project_id) || null : null}
                onCopyParams={() => handleCopyParams(item)}
                onReEdit={() => handleReEdit(item)}
                onUpscale={() => handleUpscale(item)}
                isUpscaling={upscaling.has(item.id)}
                onDelete={() => handleDelete(item)}
                onNavigateProject={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

function LibraryCard({
  item,
  userId,
  projectName,
  onCopyParams,
  onReEdit,
  onUpscale,
  isUpscaling,
  onDelete,
  onNavigateProject,
}: {
  item: LibraryItem;
  userId: string;
  projectName: string | null;
  onCopyParams: () => void;
  onReEdit: () => void;
  onUpscale: () => void;
  isUpscaling: boolean;
  onDelete: () => void;
  onNavigateProject: () => void;
}) {
  const inputUrls: string[] = item.source_image_urls || [];
  const params = item.parameters || {};

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Preview */}
          <div className="lg:w-48 lg:shrink-0 bg-muted relative">
            {item.type === "image" && item.output_image_url ? (
              <img
                src={item.output_image_url}
                alt="Output"
                className="w-full h-48 lg:h-full object-cover"
                loading="lazy"
              />
            ) : item.type === "video" && item.video_url ? (
              <video
                src={item.video_url}
                className="w-full h-48 lg:h-full object-cover"
                muted
                playsInline
                preload="metadata"
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
              />
            ) : (
              <div className="w-full h-48 lg:h-full flex items-center justify-center">
                {item.status === "processing" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : item.status === "failed" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : item.type === "video" ? (
                  <Clapperboard className="h-5 w-5 text-muted-foreground/30" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                )}
              </div>
            )}
            {/* Type badge overlay */}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
                {item.type === "video" ? <Clapperboard className="h-2.5 w-2.5 mr-0.5" /> : <ImageIcon className="h-2.5 w-2.5 mr-0.5" />}
                {item.type}
              </Badge>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 p-3 lg:p-4 space-y-2.5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] border", statusColors[item.status] || statusColors.queued)}
                >
                  {item.status}
                </Badge>
                {item.is_final && (
                  <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">
                    Approved
                  </Badge>
                )}
                {projectName && (
                  <button
                    onClick={onNavigateProject}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {projectName}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                <span className="flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />{item.cost?.toFixed(3)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Prompt */}
            {item.prompt && (
              <p className="text-xs text-foreground whitespace-pre-wrap break-words">{item.prompt}</p>
            )}
            {item.negative_prompt && (
              <p className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words">
                <span className="font-medium">Neg:</span> {item.negative_prompt}
              </p>
            )}

            {/* Parameters */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span>Model: <span className="text-foreground">{item.model}</span></span>
              {item.type === "image" && (
                <>
                  <span>Size: <span className="text-foreground">{item.output_size?.replace("*", "×")}</span></span>
                  {item.seed != null && <span>Seed: <span className="text-foreground">{item.seed}</span></span>}
                  <span>Expand: <span className="text-foreground">{item.enable_prompt_expansion ? "On" : "Off"}</span></span>
                </>
              )}
              {item.type === "video" && (
                <>
                  {params.resolution && <span>Res: <span className="text-foreground">{params.resolution}</span></span>}
                  {params.duration && <span>Duration: <span className="text-foreground">{params.duration}s</span></span>}
                  {params.shot_type && <span>Shot: <span className="text-foreground">{params.shot_type}</span></span>}
                  {params.seed != null && <span>Seed: <span className="text-foreground">{params.seed}</span></span>}
                </>
              )}
            </div>

            {/* Source images (image edits only) */}
            {inputUrls.length > 0 && (
              <div className="flex gap-1">
                {inputUrls.map((url, i) => (
                  <div key={i} className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0 border border-border/50">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                <span className="text-[10px] text-muted-foreground self-center ml-1">
                  {inputUrls.length} source{inputUrls.length > 1 ? "s" : ""}
                </span>
              </div>
            )}

            {/* Seed image for video */}
            {item.type === "video" && params.seed_image_url && (
              <div className="flex gap-1 items-center">
                <div className="w-8 h-8 rounded overflow-hidden bg-muted shrink-0 border border-border/50">
                  <img src={params.seed_image_url} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-muted-foreground ml-1">seed image</span>
              </div>
            )}

            {/* Error */}
            {item.status === "failed" && item.error_message && (
              <div className="flex items-start gap-1.5 text-[11px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="whitespace-pre-wrap break-words">{item.error_message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onReEdit}>
                <RotateCcw className="h-3 w-3" /> Re-edit
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onCopyParams}>
                <Copy className="h-3 w-3" /> Copy Params
              </Button>
              {item.type === "image" && item.status === "completed" && item.output_image_url && item.model !== "google/nano-banana-2/edit" && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onUpscale} disabled={isUpscaling}>
                  {isUpscaling ? <Loader2 className="h-3 w-3 animate-spin" /> : <ZoomIn className="h-3 w-3" />}
                  {isUpscaling ? "Upscaling…" : "Upscale 4K"}
                </Button>
              )}
              {item.type === "image" && item.output_image_url && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => saveToDrive(item.output_image_url!, userId)}>
                    <FolderOpen className="h-3 w-3" /> Save to Drive
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => downloadFile(item.output_image_url!, `image-${item.id.slice(0,8)}.png`)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </>
              )}
              {item.type === "video" && item.video_url && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => saveToDrive(item.video_url!, userId)}>
                    <FolderOpen className="h-3 w-3" /> Save to Drive
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => downloadFile(item.video_url!, `video-${item.id.slice(0,8)}.mp4`)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-[11px] px-2 text-destructive hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default LibraryPage;
