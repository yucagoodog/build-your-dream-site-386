import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { StatusDot } from "@/components/StatusDot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, Image as ImageIcon, Upload, Clipboard, X, Loader2,
  Copy, RotateCcw, ChevronDown, Play, AlertCircle, Sparkles,
  Download, Clock, DollarSign, CheckCircle2, XCircle, Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadFile } from "@/lib/download";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { usePromptBlockPrefs } from "@/hooks/use-prompt-block-prefs";

function estimateCost(resolution: string, duration: number): number {
  const base = resolution === "1080p" ? 0.12 : 0.06;
  return base * duration;
}

const SceneEditorPage = () => {
  const { sceneId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Scene state
  const [direction, setDirection] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [seedImageUrl, setSeedImageUrl] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [seed, setSeed] = useState<string>("");
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [shotType, setShotType] = useState("single");
  const [promptExpansion, setPromptExpansion] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  const { data: scene, isLoading } = useQuery({
    queryKey: ["scene", sceneId],
    queryFn: async () => {
      const { data, error } = await supabase.from("scenes").select("*").eq("id", sceneId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId && !!user,
  });

  const { data: promptBlocks = [] } = useQuery({
    queryKey: ["prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompt_blocks").select("*").not("category", "like", "img_%").order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: generations = [] } = useQuery({
    queryKey: ["generations", sceneId],
    queryFn: async () => {
      const { data, error } = await supabase.from("generations").select("*").eq("scene_id", sceneId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId && !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!scene) return;
    setDirection(scene.direction || "");
    setPrompt(scene.prompt || "");
    setNegativePrompt(scene.negative_prompt || "");
    setSeedImageUrl(scene.seed_image_url || "");
    setResolution(scene.resolution);
    setDuration(scene.duration);
    setSeed(scene.seed?.toString() || "");
    setUseRandomSeed(scene.use_random_seed);
    setShotType(scene.shot_type || "single");
    setPromptExpansion(scene.prompt_expansion);
    setAudioEnabled(scene.audio_enabled);
  }, [scene]);

  const saveScene = useCallback(async () => {
    if (!sceneId || !user) return;
    setSaving(true);
    await supabase.from("scenes").update({
      direction, prompt, negative_prompt: negativePrompt,
      seed_image_url: seedImageUrl || null, resolution, duration,
      seed: seed ? parseInt(seed) : null, use_random_seed: useRandomSeed,
      shot_type: shotType, prompt_expansion: promptExpansion,
      audio_enabled: audioEnabled, cost_estimate: estimateCost(resolution, duration),
    }).eq("id", sceneId);
    setSaving(false);
  }, [sceneId, user, direction, prompt, negativePrompt, seedImageUrl, resolution, duration, seed, useRandomSeed, shotType, promptExpansion, audioEnabled]);

  // Debounced auto-save
  useEffect(() => {
    if (!scene) return;
    const timer = setTimeout(() => saveScene(), 1500);
    return () => clearTimeout(timer);
  }, [direction, prompt, negativePrompt, seedImageUrl, resolution, duration, seed, useRandomSeed, shotType, promptExpansion, audioEnabled]);

  const { applyPrefs, isCategoryHidden, applyCategoryPrefs } = usePromptBlockPrefs();

  const blocksByCategory = applyPrefs(promptBlocks).reduce((acc: Record<string, any[]>, block: any) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {});

  const videoCategoryLabels: Record<string, string> = {
    shot_setup: "Shot Setup", camera: "Camera Move", motion: "Subject Motion",
    style: "Style & Mood", identity: "Identity Preserve",
    multi_char: "Multi-Character", multi_shot: "Multi-Shot",
  };

  const sortedFormulaCategories = applyCategoryPrefs(
    ["shot_setup", "camera", "motion", "style", "identity", "multi_char", "multi_shot"]
      .filter((k) => (blocksByCategory[k] || []).length > 0)
  );

  const toggleBlock = (blockId: string, value: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
        setPrompt((p) => p.replace(` ${value}`, "").replace(`${value} `, "").replace(value, "").trim());
      } else {
        next.add(blockId);
        setPrompt((p) => (p ? `${p} ${value}` : value));
      }
      return next;
    });
  };

  const toggleNegativeBlock = (blockId: string, value: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
        setNegativePrompt((p) => p.replace(`, ${value}`, "").replace(`${value}, `, "").replace(value, "").trim());
      } else {
        next.add(blockId);
        setNegativePrompt((p) => (p ? `${p}, ${value}` : value));
      }
      return next;
    });
  };

  const applyTemplate = (templateValue: string) => {
    try {
      const t = JSON.parse(templateValue);
      setPrompt(t.positive || "");
      setNegativePrompt(t.negative || "");
      setSelectedBlocks(new Set());
      toast({ title: "Template applied" });
    } catch { toast({ title: "Invalid template", variant: "destructive" }); }
  };

  const handleUpload = async (capture?: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${sceneId}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("seed-images").upload(path, file);
      if (error) {
        toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      } else {
        const { data: urlData } = supabase.storage.from("seed-images").getPublicUrl(path);
        setSeedImageUrl(urlData.publicUrl);
      }
      setUploading(false);
    };
    input.click();
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await saveScene();
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { scene_id: sceneId, action: "start" },
      });
      if (error) {
        let msg = error.message;
        try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch {}
        throw new Error(msg || "Edge function error");
      }
      if (data?.error) throw new Error(data.error);
      toast({ title: "Generation started!" });
      queryClient.invalidateQueries({ queryKey: ["generations", sceneId] });
      queryClient.invalidateQueries({ queryKey: ["scene", sceneId] });
      if (data?.generation?.id) {
        const poll = setInterval(async () => {
          try {
            const { data: pollData } = await supabase.functions.invoke("generate-video", {
              body: { action: "poll", generation_id: data.generation.id },
            });
            if (pollData?.status === "completed" || pollData?.status === "failed") {
              clearInterval(poll);
              queryClient.invalidateQueries({ queryKey: ["generations", sceneId] });
              queryClient.invalidateQueries({ queryKey: ["scene", sceneId] });
              toast({
                title: pollData.status === "completed" ? "Video ready!" : "Generation failed",
                description: pollData.status === "failed" ? pollData.error : undefined,
                variant: pollData.status === "failed" ? "destructive" : undefined,
              });
            }
          } catch {}
        }, 4000);
        pollingRef.current = poll;
      }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const charCount = prompt.length;
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charColor = charCount > 2000 ? "text-destructive" : charCount > 1800 ? "text-amber-400" : "text-emerald-400";
  const cost = estimateCost(resolution, duration);
  const canGenerate = !!seedImageUrl && prompt.length > 0;

  if (isLoading) {
    return (
      <AppShell hideNav title="Loading...">
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!scene) {
    return (
      <AppShell hideNav title="Not Found">
        <div className="flex flex-col items-center justify-center pt-32 text-center">
          <p className="text-muted-foreground">Scene not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="tap-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Scene {scene.scene_number}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusDot status={(scene.status as any) || "draft"} showLabel />
          <span className="text-xs font-mono text-muted-foreground">${cost.toFixed(2)}</span>
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
      </header>

      {/* Desktop: side-by-side | Mobile: stacked */}
      <div className="lg:grid lg:grid-cols-[1fr,1fr] xl:grid-cols-[minmax(0,560px),1fr] lg:gap-0 lg:divide-x lg:divide-border flex-1">
        {/* ── Left Panel: Canvas + Controls ── */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)] space-y-5">

          {/* Seed Image */}
          <section>
            <Label className="text-xs text-muted-foreground mb-2 block">Seed Image</Label>
            {seedImageUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-muted group">
                <img src={seedImageUrl} alt="Seed" className="w-full aspect-video object-cover" />
                <button
                  onClick={() => setSeedImageUrl("")}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface-1/50 p-8 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => handleUpload()}
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs text-muted-foreground">Click to upload seed image</p>
              </div>
            )}
            {!seedImageUrl && (
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" className="flex-1 tap-target" disabled={uploading} onClick={() => handleUpload()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                </Button>
                <Button variant="outline" size="sm" className="flex-1 tap-target" disabled={uploading} onClick={() => handleUpload(true)}>
                  <ImageIcon className="h-4 w-4" /> Camera
                </Button>
                <Button variant="outline" size="sm" className="flex-1 tap-target" onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.startsWith("http")) setSeedImageUrl(text);
                    else toast({ title: "No URL found in clipboard" });
                  } catch { toast({ title: "Clipboard access denied" }); }
                }}>
                  <Clipboard className="h-4 w-4" /> Paste
                </Button>
              </div>
            )}
            {!seedImageUrl && (
              <div className="flex gap-2 mt-2">
                <Input placeholder="Paste image URL..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className="bg-surface-1 text-sm" />
                <Button size="sm" disabled={!imageUrlInput} onClick={() => { setSeedImageUrl(imageUrlInput); setImageUrlInput(""); }}>Add</Button>
              </div>
            )}
          </section>

          {/* Scene Direction */}
          <div className="space-y-1.5">
            <Label className="text-xs">Scene Direction</Label>
            <Textarea placeholder="Describe what happens in this scene..." value={direction} onChange={(e) => setDirection(e.target.value)} className="bg-surface-1 min-h-[60px]" />
          </div>

          <Separator />

          {/* Prompt Builder */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Prompt</Label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-muted-foreground">{wordCount}w</span>
                <span className={cn("text-[10px] font-mono", charColor)}>{charCount}/2000</span>
              </div>
            </div>
            <Textarea
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
              className="bg-surface-1 min-h-[80px] lg:min-h-[100px] text-sm"
              placeholder="Build your prompt using blocks below or type directly..."
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(prompt); toast({ title: "Copied" }); }}>
                <Copy className="h-3 w-3" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setPrompt(""); setSelectedBlocks(new Set()); }}>
                <RotateCcw className="h-3 w-3" /> Reset
              </Button>
            </div>

            {/* Templates */}
            {!isCategoryHidden("template") && (blocksByCategory["template"] || []).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">
                  ⚡ Quick Templates
                  <ChevronDown className="h-3.5 w-3.5" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(blocksByCategory["template"] || []).map((block: any) => (
                      <button key={block.id} onClick={() => applyTemplate(block.value)}
                        className="rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors">
                        {block.label}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Formula blocks — dynamically ordered and filtered */}
            <p className="text-[10px] text-muted-foreground/60">Formula: {sortedFormulaCategories.map((k) => videoCategoryLabels[k] || k).join(" → ")}</p>
            {sortedFormulaCategories.map((key) => (
              <Collapsible key={key}>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-surface-1 px-3 py-2.5 text-xs font-medium">
                  {videoCategoryLabels[key] || key}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">{(blocksByCategory[key] || []).length}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(blocksByCategory[key] || []).map((block: any) => (
                      <button key={block.id} onClick={() => toggleBlock(block.id, block.value)}
                        className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                          selectedBlocks.has(block.id) ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                        {block.label}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Super Prompts */}
            {!isCategoryHidden("super_prompt") && (blocksByCategory["super_prompt"] || []).length > 0 && (
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-accent/30 px-3 py-2.5 text-xs font-medium">
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Super Prompts</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  <p className="text-[10px] text-muted-foreground/70 px-1">Pick 3–4 terms max — more compete and cancel.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(blocksByCategory["super_prompt"] || []).map((block: any) => (
                      <button key={block.id} onClick={() => toggleBlock(block.id, block.value)}
                        className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                          selectedBlocks.has(block.id) ? "bg-accent text-accent-foreground ring-1 ring-accent-foreground/20" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                        {block.label}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Negative prompt */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
                Negative Prompt
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-1">
                <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)}
                  className="bg-surface-1 min-h-[50px] text-sm" placeholder="What to avoid..." />
                <div className="flex flex-wrap gap-1.5">
                  {(blocksByCategory["negative"] || []).map((block: any) => (
                    <button key={block.id} onClick={() => toggleNegativeBlock(block.id, block.value)}
                      className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        selectedBlocks.has(block.id) ? "bg-destructive/20 text-destructive" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                      {block.label}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </section>

          <Separator />

          {/* Parameters */}
          <section className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">Shot Type</Label>
                <Select value={shotType} onValueChange={setShotType}>
                  <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="multi">Multi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] text-muted-foreground">Duration</Label>
                <span className="text-xs text-muted-foreground font-mono">{duration}s</span>
              </div>
              <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={2} max={15} step={1} />
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={useRandomSeed} onCheckedChange={setUseRandomSeed} />
                <Label className="text-xs">Random Seed</Label>
              </div>
              {!useRandomSeed && (
                <Input type="number" placeholder="Seed" value={seed} onChange={(e) => setSeed(e.target.value)}
                  className="bg-surface-1 h-9 w-24 text-xs font-mono" />
              )}
              <div className="flex items-center gap-2">
                <Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} />
                <Label className="text-xs">Expand</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
                <Label className="text-xs">Audio</Label>
              </div>
            </div>
          </section>

          {/* Generate */}
          <div className="space-y-2">
            <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full h-12 text-sm" size="lg">
              {generating ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
              Generate · ${cost.toFixed(2)}
            </Button>
            {!canGenerate && (
              <div className="flex items-start gap-2 rounded-lg bg-surface-1 p-2.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground space-y-0.5">
                  {!seedImageUrl && <p>• Seed image is required</p>}
                  {!prompt && <p>• Prompt cannot be empty</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right Panel: Generation History ── */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)]">
          <Separator className="lg:hidden mb-5" />
          <h2 className="text-xs font-medium text-muted-foreground mb-3">
            Generations {generations.length > 0 && `(${generations.length})`}
          </h2>

          {generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Video className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">No generations yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Generated videos will appear here</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {generations.map((gen: any) => (
                <VideoGenCard key={gen.id} gen={gen} sceneId={sceneId!} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function VideoGenCard({ gen, sceneId }: { gen: any; sceneId: string }) {
  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    failed: "bg-destructive/15 text-destructive border-destructive/20",
    queued: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] border", statusColors[gen.status] || statusColors.queued)}>
            {gen.status}
          </Badge>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {gen.cost && <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{Number(gen.cost).toFixed(2)}</span>}
            <span className="flex items-center gap-0.5">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(gen.created_at), { addSuffix: true })}
            </span>
          </div>
        </div>

        {gen.prompt_used && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{gen.prompt_used}</p>
        )}

        {gen.video_url && (
          <div className="space-y-2">
            <video src={gen.video_url} controls className="w-full rounded-lg" preload="metadata" />
            <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => downloadFile(gen.video_url!, `scene-${sceneId.slice(0, 6)}-gen-${gen.id.slice(0, 6)}.mp4`)}>
              <Download className="h-4 w-4" /> Download
            </Button>
          </div>
        )}

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

export default SceneEditorPage;
