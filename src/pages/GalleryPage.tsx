import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Upload, X, Loader2, ChevronDown, Sparkles, Play,
  ImagePlus, Download, Clock, DollarSign, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { formatDistanceToNow } from "date-fns";

const MAX_IMAGES = 4;

const GalleryPage = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Canvas state — up to 4 images
  const [slotImages, setSlotImages] = useState<(string | null)[]>([null, null, null, null]);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);

  // Prompt / settings
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [outputSize, setOutputSize] = useState("1024*1024");
  const [model, setModel] = useState("alibaba/wan-2.6/image-edit");
  const [seed, setSeed] = useState("");
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [promptExpansion, setPromptExpansion] = useState(true);
  const [generating, setGenerating] = useState(false);

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

  // Past generations
  const { data: generations = [], isLoading: gensLoading } = useQuery({
    queryKey: ["image_generations", projectId],
    queryFn: async () => {
      // Get all source_images for this project to find related edits
      const { data: sources } = await supabase
        .from("source_images")
        .select("id")
        .eq("project_id", projectId!);
      const sourceIds = sources?.map((s: any) => s.id) || [];

      // Get edits that belong to this project's source images OR have project-level URLs
      let query = supabase
        .from("image_edits")
        .select("*")
        .order("created_at", { ascending: false });

      if (sourceIds.length > 0) {
        query = query.or(`source_image_id.in.(${sourceIds.join(",")}),source_image_id.is.null`);
      }

      // Filter by user
      query = query.eq("user_id", user!.id);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId && !!user,
  });

  // Prompt blocks
  const { data: promptBlocks = [] } = useQuery({
    queryKey: ["img_prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_blocks")
        .select("*")
        .like("category", "img_%")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const blocksByCategory = promptBlocks.reduce((acc: Record<string, any[]>, block: any) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    img_realism: "Photo Realism",
    img_lighting: "Lighting",
    img_subject: "Subject Edits",
    img_enhance: "Enhancement",
    img_negative: "Negative Presets",
  };

  const filledSlots = slotImages.filter(Boolean) as string[];

  // Upload handler
  const handleSlotClick = (index: number) => {
    activeSlotRef.current = index;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !projectId) return;
    const slotIndex = activeSlotRef.current;
    setUploading(slotIndex);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("seed-images")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("seed-images")
        .getPublicUrl(path);

      // Also add to source_images library
      await supabase.from("source_images").insert({
        project_id: projectId,
        user_id: user.id,
        image_url: urlData.publicUrl,
        original_filename: file.name,
        file_size: file.size,
      });

      setSlotImages((prev) => {
        const next = [...prev];
        next[slotIndex] = urlData.publicUrl;
        return next;
      });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSlot = (index: number) => {
    setSlotImages((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  };

  const toggleBlock = (value: string) => {
    setPrompt((prev) => {
      if (prev.includes(value)) return prev.replace(value, "").replace(/\s{2,}/g, " ").trim();
      return prev ? `${prev} ${value}` : value;
    });
  };

  const applyNegativePreset = (value: string) => {
    setNegativePrompt(value);
  };

  const handleGenerate = async () => {
    if (filledSlots.length === 0 || !prompt.trim() || !user || !projectId) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          action: "start",
          project_id: projectId,
          image_urls: filledSlots,
          prompt,
          negative_prompt: negativePrompt,
          output_size: outputSize,
          seed: useRandomSeed ? -1 : parseInt(seed) || -1,
          enable_prompt_expansion: promptExpansion,
          model,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Generation started!" });
      queryClient.invalidateQueries({ queryKey: ["image_generations", projectId] });

      // Poll
      if (data?.edit?.id) {
        const poll = setInterval(async () => {
          try {
            const { data: pollData } = await supabase.functions.invoke("generate-image", {
              body: { action: "poll", edit_id: data.edit.id },
            });
            if (pollData?.status === "completed" || pollData?.status === "failed") {
              clearInterval(poll);
              queryClient.invalidateQueries({ queryKey: ["image_generations", projectId] });
              if (pollData.status === "completed") {
                toast({ title: "Generation completed!" });
              } else {
                toast({ title: "Generation failed", description: pollData.error, variant: "destructive" });
              }
            }
          } catch {}
        }, 4000);
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const costPerGen = 0.021 * filledSlots.length;

  return (
    <AppShell
      title={project?.name || "Image Workspace"}
      headerLeft={
        <button onClick={() => navigate("/")} className="tap-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col gap-6 p-4 pb-8">
        {/* ── Canvas: Image Slots ── */}
        <section>
          <Label className="text-xs text-muted-foreground mb-2 block">
            Source Images ({filledSlots.length}/{MAX_IMAGES})
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {slotImages.map((url, i) => (
              <div
                key={i}
                className={cn(
                  "relative aspect-square rounded-lg border-2 border-dashed transition-colors overflow-hidden",
                  url
                    ? "border-border bg-muted"
                    : "border-border/50 bg-surface-1 hover:border-primary/40 cursor-pointer"
                )}
                onClick={() => !url && handleSlotClick(i)}
              >
                {url ? (
                  <>
                    <img src={url} alt={`Slot ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSlot(i); }}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : uploading === i ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-1">
                    <ImagePlus className="h-6 w-6 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/50">Add image</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <Separator />

        {/* ── Prompt Builder ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Edit Prompt</Label>
            <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
          </div>
          <Textarea
            placeholder="Describe the edit you want applied to all selected images..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="bg-surface-1 min-h-[80px]"
            maxLength={2000}
          />

          {/* Block pickers */}
          {Object.entries(blocksByCategory)
            .filter(([cat]) => cat !== "img_negative")
            .map(([category, blocks]) => (
              <Collapsible key={category}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
                  {categoryLabels[category] || category}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(blocks as any[]).map((block: any) => (
                      <button
                        key={block.id}
                        onClick={() => toggleBlock(block.value)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                          prompt.includes(block.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface-1 text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {block.label}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

          {/* Negative prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Negative Prompt</Label>
            <Textarea
              placeholder="What to avoid..."
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="bg-surface-1 min-h-[50px]"
            />
            {blocksByCategory["img_negative"] && (
              <div className="flex gap-1.5 pt-1 flex-wrap">
                {(blocksByCategory["img_negative"] as any[]).map((block: any) => (
                  <button
                    key={block.id}
                    onClick={() => applyNegativePreset(block.value)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-surface-1 text-foreground border-border hover:border-primary/50 transition-colors"
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <Separator />

        {/* ── Settings Row ── */}
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Output Size</Label>
              <Select value={outputSize} onValueChange={setOutputSize}>
                <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alibaba/wan-2.6/image-edit" className="text-xs">WAN 2.6 Edit</SelectItem>
                  <SelectItem value="alibaba/qwen-edit-plus" className="text-xs">Qwen Edit Plus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch checked={useRandomSeed} onCheckedChange={setUseRandomSeed} />
              <Label className="text-xs">Random Seed</Label>
            </div>
            {!useRandomSeed && (
              <Input
                type="number"
                placeholder="Seed"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="bg-surface-1 h-9 w-24 text-xs"
              />
            )}
            <div className="flex items-center gap-2">
              <Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} />
              <Label className="text-xs">Expand</Label>
            </div>
          </div>
        </section>

        {/* ── Generate Button ── */}
        <Button
          onClick={handleGenerate}
          disabled={filledSlots.length === 0 || !prompt.trim() || generating}
          className="w-full h-12 text-sm"
          size="lg"
        >
          {generating ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Generate · ${costPerGen.toFixed(3)}
        </Button>

        <Separator />

        {/* ── Generation History ── */}
        <section>
          <h2 className="text-xs font-medium text-muted-foreground mb-3">Generations</h2>
          {gensLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : generations.length === 0 ? (
            <p className="text-xs text-muted-foreground/60 text-center py-8">
              No generations yet. Add images and a prompt above to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {generations.map((gen: any) => (
                <GenerationCard key={gen.id} gen={gen} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};

function GenerationCard({ gen }: { gen: any }) {
  const inputUrls: string[] = gen.source_image_urls || [];
  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    failed: "bg-destructive/15 text-destructive border-destructive/20",
    queued: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] border", statusColors[gen.status] || statusColors.queued)}>
            {gen.status}
          </Badge>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{gen.cost}</span>
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Input thumbnails */}
        {inputUrls.length > 0 && (
          <div className="flex gap-1">
            {inputUrls.map((url: string, i: number) => (
              <div key={i} className="w-12 h-12 rounded overflow-hidden bg-muted shrink-0">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="flex items-center px-2">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          </div>
        )}

        {/* Prompt */}
        {gen.prompt && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{gen.prompt}</p>
        )}

        {/* Output */}
        {gen.output_image_url && (
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img src={gen.output_image_url} alt="Output" className="w-full" loading="lazy" />
            <a
              href={gen.output_image_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Error */}
        {gen.status === "failed" && gen.error_message && (
          <div className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{gen.error_message}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GalleryPage;
