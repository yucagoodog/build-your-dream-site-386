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
  AlertCircle, Sparkles, Loader2, Filter, ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type ImageEdit = {
  id: string;
  prompt: string | null;
  negative_prompt: string | null;
  model: string;
  output_size: string | null;
  seed: number | null;
  enable_prompt_expansion: boolean | null;
  source_image_urls: string[] | null;
  output_image_url: string | null;
  status: string;
  cost: number | null;
  error_message: string | null;
  created_at: string;
  project_id: string | null;
  is_final: boolean;
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
  const [sortBy, setSortBy] = useState<string>("newest");

  const { data: edits = [], isLoading } = useQuery({
    queryKey: ["library_all_edits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_edits")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ImageEdit[];
    },
    enabled: !!user,
  });

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
  const filtered = edits.filter((e) => {
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

  const handleCopyParams = (edit: ImageEdit) => {
    const params = {
      prompt: edit.prompt || "",
      negative_prompt: edit.negative_prompt || "",
      model: edit.model,
      output_size: edit.output_size || "1280*1280",
      seed: edit.seed,
      enable_prompt_expansion: edit.enable_prompt_expansion,
    };
    navigator.clipboard.writeText(JSON.stringify(params, null, 2));
    toast({ title: "Parameters copied to clipboard" });
  };

  const handleDelete = async (editId: string) => {
    const { error } = await supabase.from("image_edits").delete().eq("id", editId);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["library_all_edits"] });
      toast({ title: "Deleted" });
    }
  };

  const totalCost = edits.reduce((sum, e) => sum + (e.cost || 0), 0);
  const completedCount = edits.filter((e) => e.status === "completed").length;

  return (
    <AppShell title="Library">
      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-5">
        {/* Stats strip */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" />
            {edits.length} generations
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {completedCount} completed
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            ${totalCost.toFixed(3)} total
          </span>
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
            <ImageIcon className="h-8 w-8 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {search || statusFilter !== "all" ? "No results match your filters." : "No generations yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((edit) => (
              <LibraryCard
                key={edit.id}
                edit={edit}
                projectName={edit.project_id ? projectMap.get(edit.project_id) || null : null}
                onCopyParams={() => handleCopyParams(edit)}
                onDelete={() => handleDelete(edit.id)}
                onNavigateProject={() => edit.project_id && navigate(`/gallery/${edit.project_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

function LibraryCard({
  edit,
  projectName,
  onCopyParams,
  onDelete,
  onNavigateProject,
}: {
  edit: ImageEdit;
  projectName: string | null;
  onCopyParams: () => void;
  onDelete: () => void;
  onNavigateProject: () => void;
}) {
  const inputUrls: string[] = edit.source_image_urls || [];

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          {/* Output image */}
          <div className="lg:w-48 lg:shrink-0 bg-muted">
            {edit.output_image_url ? (
              <img
                src={edit.output_image_url}
                alt="Output"
                className="w-full h-48 lg:h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-48 lg:h-full flex items-center justify-center">
                {edit.status === "processing" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : edit.status === "failed" ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                )}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 p-3 lg:p-4 space-y-2.5">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge
                  variant="outline"
                  className={cn("text-[10px] border", statusColors[edit.status] || statusColors.queued)}
                >
                  {edit.status}
                </Badge>
                {edit.is_final && (
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
                  <DollarSign className="h-3 w-3" />{edit.cost?.toFixed(3)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(edit.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Prompt */}
            {edit.prompt && (
              <p className="text-xs text-foreground line-clamp-2">{edit.prompt}</p>
            )}
            {edit.negative_prompt && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                <span className="font-medium">Neg:</span> {edit.negative_prompt}
              </p>
            )}

            {/* Parameters */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span>Model: <span className="text-foreground">{edit.model}</span></span>
              <span>Size: <span className="text-foreground">{edit.output_size?.replace("*", "×")}</span></span>
              {edit.seed != null && <span>Seed: <span className="text-foreground">{edit.seed}</span></span>}
              <span>Expand: <span className="text-foreground">{edit.enable_prompt_expansion ? "On" : "Off"}</span></span>
            </div>

            {/* Source images */}
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

            {/* Error */}
            {edit.status === "failed" && edit.error_message && (
              <div className="flex items-start gap-1.5 text-[11px] text-destructive">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{edit.error_message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-1.5 pt-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={onCopyParams}>
                <Copy className="h-3 w-3" /> Copy Params
              </Button>
              {edit.output_image_url && (
                <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" asChild>
                  <a href={edit.output_image_url} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-3 w-3" /> Download
                  </a>
                </Button>
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
