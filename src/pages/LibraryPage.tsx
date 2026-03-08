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
  Grid3X3, List, Star, Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { saveToDrive } from "@/lib/save-to-drive";
import { formatDistanceToNow } from "date-fns";
import { LazyImage } from "@/components/ImageSkeleton";
import { LibraryItemDetail } from "@/components/LibraryItemDetail";

export type LibraryItem = {
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
  is_favorite: boolean;
  output_size?: string | null;
  seed?: number | null;
  enable_prompt_expansion?: boolean | null;
  source_image_urls?: string[] | null;
  output_image_url?: string | null;
  video_url?: string | null;
  parameters?: Record<string, any> | null;
  scene_id?: string;
};

const statusColors: Record<string, string> = {
  completed: "bg-[hsl(var(--status-completed))]/15 text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed))]/20",
  processing: "bg-[hsl(var(--status-processing))]/15 text-[hsl(var(--status-processing))] border-[hsl(var(--status-processing))]/20",
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LibraryItem | null>(null);

  const { data: imageEdits = [], isLoading: loadingImages } = useQuery({
    queryKey: ["library_image_edits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_edits").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((e: any): LibraryItem => ({
        id: e.id, type: "image", prompt: e.prompt, negative_prompt: e.negative_prompt,
        model: e.model, status: e.status, cost: e.cost, error_message: e.error_message,
        created_at: e.created_at, project_id: e.project_id, is_final: e.is_final,
        is_favorite: e.is_favorite ?? false,
        output_size: e.output_size, seed: e.seed, enable_prompt_expansion: e.enable_prompt_expansion,
        source_image_urls: e.source_image_urls, output_image_url: e.output_image_url,
      }));
    },
    enabled: !!user,
  });

  const { data: videoGens = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["library_video_gens", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((g: any): LibraryItem => ({
        id: g.id, type: "video", prompt: g.prompt_used, negative_prompt: g.negative_prompt_used,
        model: (g.parameters as any)?.model || "wan26-i2v-flash", status: g.status,
        cost: g.cost, error_message: g.error_message, created_at: g.created_at,
        project_id: null, is_final: g.is_final, is_favorite: g.is_favorite ?? false,
        video_url: g.video_url,
        parameters: g.parameters as any, scene_id: g.scene_id,
      }));
    },
    enabled: !!user,
  });

  const isLoading = loadingImages || loadingVideos;
  const allItems = [...imageEdits, ...videoGens];

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_lookup", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const projectMap = new Map(projects.map((p: any) => [p.id, p.name]));

  const filtered = allItems.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    if (favoritesOnly && !e.is_favorite) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!e.prompt?.toLowerCase().includes(q) && !e.negative_prompt?.toLowerCase().includes(q) && !e.model?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (sortBy === "cost") return (b.cost || 0) - (a.cost || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCopyParams = (item: LibraryItem) => {
    const params = item.type === "image"
      ? { prompt: item.prompt || "", negative_prompt: item.negative_prompt || "", model: item.model, output_size: item.output_size || "1024*1024", seed: item.seed, enable_prompt_expansion: item.enable_prompt_expansion }
      : { prompt: item.prompt || "", negative_prompt: item.negative_prompt || "", model: item.model, ...(item.parameters || {}) };
    navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    toast({ title: "Parameters copied" });
  };

  const handleReEdit = (item: LibraryItem) => {
    if (item.type === "video") {
      const params = item.parameters || {};
      navigate("/", { state: { reEdit: { mode: "video", prompt: item.prompt || "", negative_prompt: item.negative_prompt || "", seed_image_url: params.seed_image_url || "", resolution: params.resolution || "720p", duration: params.duration || 5, shot_type: params.shot_type || "single", seed: params.seed, prompt_expansion: params.prompt_expansion ?? true, audio: params.audio ?? false } } });
      return;
    }
    navigate("/", { state: { reEdit: { mode: "image", prompt: item.prompt || "", negative_prompt: item.negative_prompt || "", output_size: item.output_size || "1024*1024", model: item.model, seed: item.seed, enable_prompt_expansion: item.enable_prompt_expansion ?? true, source_image_urls: item.source_image_urls || [] } } });
  };

  const [upscaling, setUpscaling] = useState<Set<string>>(new Set());

  const handleUpscale = async (item: LibraryItem) => {
    const imageUrl = item.output_image_url;
    if (!imageUrl) { toast({ title: "No output image to upscale", variant: "destructive" }); return; }
    setUpscaling((prev) => new Set(prev).add(item.id));
    toast({ title: "Starting upscale…" });
    try {
      const { data: startData, error: startError } = await supabase.functions.invoke("upscale-image", {
        body: { action: "start", image_url: imageUrl, prompt: "Enhance this image to higher quality and resolution with maximum detail", output_format: "png", source_edit_id: item.id, project_id: item.project_id },
      });
      if (startError || startData?.error) { toast({ title: "Upscale failed", description: startData?.error || startError?.message, variant: "destructive" }); setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; }); return; }
      const editId = startData.edit.id;
      const poll = async () => {
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 4000));
          const { data } = await supabase.functions.invoke("upscale-image", { body: { action: "poll", edit_id: editId } });
          if (data?.status === "completed") { toast({ title: "Upscale complete!" }); queryClient.invalidateQueries({ queryKey: ["library_image_edits"] }); break; }
          if (data?.status === "failed") { toast({ title: "Upscale failed", description: data.error, variant: "destructive" }); break; }
        }
        setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
      };
      poll();
    } catch (err: any) {
      toast({ title: "Upscale error", description: err.message, variant: "destructive" });
      setUpscaling((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const handleToggleFavorite = async (item: LibraryItem) => {
    const table = item.type === "image" ? "image_edits" : "generations";
    const newVal = !item.is_favorite;
    const { error } = await supabase.from(table).update({ is_favorite: newVal } as any).eq("id", item.id);
    if (error) { toast({ title: "Failed to update", variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: item.type === "image" ? ["library_image_edits"] : ["library_video_gens"] });
  };

  const handleDelete = async (item: LibraryItem) => {
    const table = item.type === "image" ? "image_edits" : "generations";
    const { error } = await supabase.from(table).delete().eq("id", item.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
    else { queryClient.invalidateQueries({ queryKey: item.type === "image" ? ["library_image_edits"] : ["library_video_gens"] }); toast({ title: "Deleted" }); }
  };

  const totalCost = allItems.reduce((sum, e) => sum + (e.cost || 0), 0);
  const imageCount = allItems.filter((e) => e.type === "image").length;
  const videoCount = allItems.filter((e) => e.type === "video").length;
  const favCount = allItems.filter((e) => e.is_favorite).length;

  return (
    <AppShell title="Library">
      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" />{allItems.length} total</span>
          <span className="flex items-center gap-1"><ImageIcon className="h-3.5 w-3.5" />{imageCount}</span>
          <span className="flex items-center gap-1"><Clapperboard className="h-3.5 w-3.5" />{videoCount}</span>
          {favCount > 0 && <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{favCount}</span>}
          <span className="flex items-center gap-1 ml-auto"><DollarSign className="h-3.5 w-3.5" />${totalCost.toFixed(3)}</span>
        </div>

        {/* Type switcher + view toggle + favorites */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-muted p-1 gap-1 flex-1">
            {[
              { value: "all", label: "All", icon: Sparkles },
              { value: "image", label: "Image", icon: ImageIcon },
              { value: "video", label: "Video", icon: Clapperboard },
            ].map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTypeFilter(value)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors",
                  typeFilter === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>
          <button onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={cn("h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
              favoritesOnly ? "bg-[hsl(var(--status-warning))]/20 text-[hsl(var(--status-warning))]" : "bg-muted text-muted-foreground hover:text-foreground")}>
            <Star className={cn("h-3.5 w-3.5", favoritesOnly && "fill-current")} />
          </button>
          <div className="flex rounded-lg bg-muted p-1 gap-0.5">
            <button onClick={() => setViewMode("grid")}
              className={cn("h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setViewMode("list")}
              className={cn("h-8 w-8 rounded-md flex items-center justify-center transition-colors",
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search prompts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-xs bg-surface-1" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-surface-1"><Filter className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="completed" className="text-xs">Completed</SelectItem>
              <SelectItem value="processing" className="text-xs">Processing</SelectItem>
              <SelectItem value="failed" className="text-xs">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[110px] h-9 text-xs bg-surface-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest" className="text-xs">Newest</SelectItem>
              <SelectItem value="oldest" className="text-xs">Oldest</SelectItem>
              <SelectItem value="cost" className="text-xs">Highest Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className={cn(viewMode === "grid"
            ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
            : "space-y-3")}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={cn("rounded-lg bg-muted animate-pulse",
                viewMode === "grid" ? "aspect-square" : "h-32")} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="h-20 w-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              {favoritesOnly ? (
                <Star className="h-10 w-10 text-muted-foreground/20" />
              ) : (
                <Sparkles className="h-10 w-10 text-muted-foreground/20" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {favoritesOnly ? "No favorites yet" :
                 search || statusFilter !== "all" || typeFilter !== "all" ? "No results match your filters" :
                 "Your library is empty"}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {favoritesOnly ? "Star your best generations to find them quickly" :
                 search || statusFilter !== "all" || typeFilter !== "all" ? "Try adjusting your search or filters" :
                 "Generate your first image or video to see it here"}
              </p>
            </div>
            {!favoritesOnly && !search && statusFilter === "all" && typeFilter === "all" && (
              <Button size="sm" className="gap-1.5" onClick={() => navigate("/")}>
                <Plus className="h-3.5 w-3.5" /> Create Something
              </Button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {sorted.map((item) => (
              <GridCard key={item.id} item={item} userId={user!.id}
                onClick={() => setSelectedItem(item)}
                onCopyParams={() => handleCopyParams(item)}
                onReEdit={() => handleReEdit(item)}
                onUpscale={() => handleUpscale(item)}
                isUpscaling={upscaling.has(item.id)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onDelete={() => handleDelete(item)} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((item) => (
              <ListCard key={item.id} item={item} userId={user!.id}
                onClick={() => setSelectedItem(item)}
                projectName={item.project_id ? projectMap.get(item.project_id) || null : null}
                onCopyParams={() => handleCopyParams(item)}
                onReEdit={() => handleReEdit(item)}
                onUpscale={() => handleUpscale(item)}
                isUpscaling={upscaling.has(item.id)}
                onToggleFavorite={() => handleToggleFavorite(item)}
                onDelete={() => handleDelete(item)} />
            ))}
          </div>
        )}

        {/* Detail view */}
        {selectedItem && (
          <LibraryItemDetail
            item={selectedItem}
            open={!!selectedItem}
            onOpenChange={(open) => { if (!open) setSelectedItem(null); }}
            userId={user!.id}
            projectName={selectedItem.project_id ? projectMap.get(selectedItem.project_id) || null : null}
            onReEdit={() => { handleReEdit(selectedItem); setSelectedItem(null); }}
            onCopyParams={() => handleCopyParams(selectedItem)}
            onUpscale={() => handleUpscale(selectedItem)}
            isUpscaling={upscaling.has(selectedItem.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedItem)}
            onDelete={() => { handleDelete(selectedItem); setSelectedItem(null); }}
            onDownload={() => {
              const url = selectedItem.type === "image" ? selectedItem.output_image_url : selectedItem.video_url;
              if (url) downloadFile(url, `${selectedItem.type}-${selectedItem.id.slice(0,8)}.${selectedItem.type === "video" ? 'mp4' : 'png'}`);
            }}
            onSaveToDrive={() => {
              const url = selectedItem.type === "image" ? selectedItem.output_image_url : selectedItem.video_url;
              if (url) saveToDrive(url, user!.id);
            }}
          />
        )}
      </div>
    </AppShell>
  );
};

/* ─── Grid Card (visual, compact) ─── */
function GridCard({ item, userId, onClick, onCopyParams, onReEdit, onUpscale, isUpscaling, onToggleFavorite, onDelete }: {
  item: LibraryItem; userId: string; onClick: () => void; onCopyParams: () => void; onReEdit: () => void;
  onUpscale: () => void; isUpscaling: boolean; onToggleFavorite: () => void; onDelete: () => void;
}) {
  const outputUrl = item.type === "image" ? item.output_image_url : item.video_url;
  const isVideo = item.type === "video";

  return (
    <div className="group relative rounded-lg overflow-hidden bg-muted aspect-square cursor-pointer" onClick={onClick}>
      {/* Preview */}
      {item.status === "completed" && outputUrl ? (
        isVideo ? (
          <video src={outputUrl} className="w-full h-full object-cover" muted playsInline preload="metadata"
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
            onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
        ) : (
          <LazyImage src={outputUrl} alt="Output" className="w-full h-full object-cover" />
        )
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {item.status === "processing" ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : item.status === "failed" ? (
            <AlertCircle className="h-6 w-6 text-destructive/60" />
          ) : isVideo ? (
            <Clapperboard className="h-6 w-6 text-muted-foreground/20" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
          )}
        </div>
      )}

      {/* Type badge */}
      <div className="absolute top-1.5 left-1.5">
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-5 bg-background/80 backdrop-blur-sm border-0">
          {isVideo ? <Clapperboard className="h-2.5 w-2.5 mr-0.5" /> : <ImageIcon className="h-2.5 w-2.5 mr-0.5" />}
          {item.type}
        </Badge>
      </div>

      {/* Favorite star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
        className={cn("absolute top-1.5 right-1.5 h-6 w-6 rounded-full flex items-center justify-center transition-all",
          item.is_favorite
            ? "bg-[hsl(var(--status-warning))]/20 text-[hsl(var(--status-warning))]"
            : "bg-background/60 text-muted-foreground/40 opacity-0 group-hover:opacity-100"
        )}
      >
        <Star className={cn("h-3 w-3", item.is_favorite && "fill-current")} />
      </button>

      {/* Status indicator */}
      {item.status !== "completed" && (
        <div className="absolute top-1.5 right-8">
          <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-5 border", statusColors[item.status] || statusColors.queued)}>
            {item.status}
          </Badge>
        </div>
      )}

      {/* Hover overlay with actions */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 gap-1">
        {item.prompt && (
          <p className="text-[10px] text-foreground line-clamp-2 mb-1">{item.prompt}</p>
        )}
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground mb-1">
          {item.cost != null && <span>${Number(item.cost).toFixed(3)}</span>}
          <span className="ml-auto">{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={onReEdit} className="h-7 px-2 rounded-md bg-background/80 backdrop-blur text-[10px] font-medium text-foreground hover:bg-background flex items-center gap-1">
            <RotateCcw className="h-3 w-3" /> Re-edit
          </button>
          {item.status === "completed" && outputUrl && (
            <>
              <button onClick={() => downloadFile(outputUrl, `${item.type}-${item.id.slice(0,8)}.${isVideo ? 'mp4' : 'png'}`)}
                className="h-7 w-7 rounded-md bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background">
                <Download className="h-3 w-3" />
              </button>
              <button onClick={() => saveToDrive(outputUrl, userId)}
                className="h-7 w-7 rounded-md bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background">
                <FolderOpen className="h-3 w-3" />
              </button>
            </>
          )}
          <button onClick={onDelete}
            className="h-7 w-7 rounded-md bg-background/80 backdrop-blur flex items-center justify-center text-destructive hover:bg-background ml-auto">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── List Card (detailed) ─── */
function ListCard({ item, userId, onClick, projectName, onCopyParams, onReEdit, onUpscale, isUpscaling, onToggleFavorite, onDelete }: {
  item: LibraryItem; userId: string; onClick: () => void; projectName: string | null;
  onCopyParams: () => void; onReEdit: () => void; onUpscale: () => void;
  isUpscaling: boolean; onToggleFavorite: () => void; onDelete: () => void;
}) {
  const inputUrls: string[] = item.source_image_urls || [];
  const params = item.parameters || {};
  const isVideo = item.type === "video";
  const outputUrl = isVideo ? item.video_url : item.output_image_url;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Preview */}
          <div className="lg:w-48 lg:shrink-0 bg-muted relative">
            {!isVideo && outputUrl ? (
              <LazyImage src={outputUrl} alt="Output" className="w-full h-48 lg:h-full object-cover" />
            ) : isVideo && outputUrl ? (
              <video src={outputUrl} className="w-full h-48 lg:h-full object-cover" muted playsInline preload="metadata"
                onMouseEnter={(e) => (e.target as HTMLVideoElement).play()}
                onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }} />
            ) : (
              <div className="w-full h-48 lg:h-full flex items-center justify-center">
                {item.status === "processing" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
                 item.status === "failed" ? <AlertCircle className="h-5 w-5 text-destructive" /> :
                 isVideo ? <Clapperboard className="h-5 w-5 text-muted-foreground/30" /> :
                 <ImageIcon className="h-5 w-5 text-muted-foreground/30" />}
              </div>
            )}
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm">
                {isVideo ? <Clapperboard className="h-2.5 w-2.5 mr-0.5" /> : <ImageIcon className="h-2.5 w-2.5 mr-0.5" />}
                {item.type}
              </Badge>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 p-3 lg:p-4 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className={cn("text-[10px] border", statusColors[item.status] || statusColors.queued)}>{item.status}</Badge>
                {item.is_final && <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10">Approved</Badge>}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={onToggleFavorite}
                  className={cn("h-6 w-6 rounded-full flex items-center justify-center transition-colors",
                    item.is_favorite ? "text-[hsl(var(--status-warning))]" : "text-muted-foreground/40 hover:text-muted-foreground")}>
                  <Star className={cn("h-3.5 w-3.5", item.is_favorite && "fill-current")} />
                </button>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{item.cost?.toFixed(3)}</span>
                  <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            {item.prompt && <p className="text-xs text-foreground whitespace-pre-wrap break-words line-clamp-3">{item.prompt}</p>}

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span>Model: <span className="text-foreground">{item.model}</span></span>
              {!isVideo && <>
                {item.output_size && <span>Size: <span className="text-foreground">{item.output_size.replace("*", "×")}</span></span>}
                {item.seed != null && <span>Seed: <span className="text-foreground">{item.seed}</span></span>}
              </>}
              {isVideo && <>
                {params.resolution && <span>Res: <span className="text-foreground">{params.resolution}</span></span>}
                {params.duration && <span>Dur: <span className="text-foreground">{params.duration}s</span></span>}
              </>}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onReEdit}><RotateCcw className="h-3 w-3" /> Re-edit</Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onCopyParams}><Copy className="h-3 w-3" /> Copy</Button>
              {!isVideo && item.status === "completed" && item.output_image_url && item.model !== "google/nano-banana-2/edit" && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onUpscale} disabled={isUpscaling}>
                  {isUpscaling ? <Loader2 className="h-3 w-3 animate-spin" /> : <ZoomIn className="h-3 w-3" />}
                  {isUpscaling ? "Upscaling…" : "Upscale"}
                </Button>
              )}
              {outputUrl && (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => saveToDrive(outputUrl, userId)}>
                    <FolderOpen className="h-3 w-3" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => downloadFile(outputUrl, `${item.type}-${item.id.slice(0,8)}.${isVideo ? 'mp4' : 'png'}`)}>
                    <Download className="h-3 w-3" /> Download
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-destructive hover:text-destructive" onClick={onDelete}>
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
