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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ArrowLeft, Image as ImageIcon, Upload, Link, Clipboard, X, Loader2, Copy, RotateCcw, ChevronDown, Play, AlertCircle, Video, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Cost calculation based on Atlas Cloud pricing
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

  const { data: scene, isLoading } = useQuery({
    queryKey: ["scene", sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scenes")
        .select("*")
        .eq("id", sceneId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId && !!user,
  });

  const { data: promptBlocks = [] } = useQuery({
    queryKey: ["prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_blocks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Load scene data
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

  // Auto-save
  const saveScene = useCallback(async () => {
    if (!sceneId || !user) return;
    setSaving(true);
    const { error } = await supabase
      .from("scenes")
      .update({
        direction,
        prompt,
        negative_prompt: negativePrompt,
        seed_image_url: seedImageUrl || null,
        resolution,
        duration,
        seed: seed ? parseInt(seed) : null,
        use_random_seed: useRandomSeed,
        shot_type: shotType,
        prompt_expansion: promptExpansion,
        audio_enabled: audioEnabled,
        cost_estimate: estimateCost(resolution, duration),
      })
      .eq("id", sceneId);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
    }
    setSaving(false);
  }, [sceneId, user, direction, prompt, negativePrompt, seedImageUrl, resolution, duration, seed, useRandomSeed, shotType, promptExpansion, audioEnabled]);

  // Debounced auto-save
  useEffect(() => {
    if (!scene) return;
    const timer = setTimeout(() => saveScene(), 1500);
    return () => clearTimeout(timer);
  }, [direction, prompt, negativePrompt, seedImageUrl, resolution, duration, seed, useRandomSeed, shotType, promptExpansion, audioEnabled]);

  // Prompt block helpers
  const blocksByCategory = promptBlocks.reduce((acc, block) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {} as Record<string, typeof promptBlocks>);

  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  const toggleBlock = (blockId: string, value: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
        // Remove sentence from prompt (with trailing space)
        setPrompt((p) => p.replace(` ${value}`, "").replace(`${value} `, "").replace(value, "").trim());
      } else {
        next.add(blockId);
        // Append as a new sentence (space-separated)
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
    } catch {
      toast({ title: "Invalid template", variant: "destructive" });
    }
  };

  const charCount = prompt.length;
  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charColor = charCount > 2000 ? "text-status-failed" : charCount > 1800 ? "text-status-warning" : "text-status-completed";
  const wordColor = wordCount > 120 ? "text-status-warning" : wordCount >= 80 ? "text-status-completed" : "text-muted-foreground";

  const cost = estimateCost(resolution, duration);
  const canGenerate = !!seedImageUrl && prompt.length > 0;

  if (isLoading) {
    return (
      <AppShell hideNav>
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  if (!scene) {
    return (
      <AppShell hideNav>
        <div className="flex flex-col items-center justify-center pt-32 text-center">
          <p className="text-muted-foreground">Scene not found</p>
          <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </div>
      </AppShell>
    );
  }

  const headerRight = (
    <div className="flex items-center gap-2">
      <StatusDot status={(scene.status as any) || "draft"} showLabel />
      <span className="text-xs font-mono text-muted-foreground">${cost.toFixed(2)}</span>
      {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-lg">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="tap-target flex items-center justify-center">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">Scene {scene.scene_number}</h1>
        </div>
        {headerRight}
      </header>

      {/* Tabs */}
      <Tabs defaultValue="image" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-2 grid grid-cols-4">
          <TabsTrigger value="image" className="text-xs">Image</TabsTrigger>
          <TabsTrigger value="prompt" className="text-xs">Prompt</TabsTrigger>
          <TabsTrigger value="params" className="text-xs">Params</TabsTrigger>
          <TabsTrigger value="results" className="text-xs">Results</TabsTrigger>
        </TabsList>

        {/* TAB 1: Image */}
        <TabsContent value="image" className="flex-1 p-4 space-y-4">
          {seedImageUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-surface-1">
                <img src={seedImageUrl} alt="Seed" className="w-full aspect-video object-cover" />
                <button
                  onClick={() => setSeedImageUrl("")}
                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setSeedImageUrl("")}>
                  Replace
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface-1/50 p-8">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Seed image required</p>
                <p className="text-[10px] text-muted-foreground/60">Add an image to generate video from</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="tap-target" disabled={uploading} onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
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
                }}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                </Button>
                <Button variant="outline" size="sm" className="tap-target" disabled={uploading} onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";
                  input.capture = "environment";
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file || !user) return;
                    setUploading(true);
                    const ext = file.name.split(".").pop();
                    const path = `${user.id}/${sceneId}_cam_${Date.now()}.${ext}`;
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
                }}>
                  <ImageIcon className="h-4 w-4" /> Camera
                </Button>
                <Button variant="outline" size="sm" className="tap-target" onClick={() => {
                  if (imageUrlInput) {
                    setSeedImageUrl(imageUrlInput);
                    setImageUrlInput("");
                  }
                }}>
                  <Link className="h-4 w-4" /> URL
                </Button>
                <Button variant="outline" size="sm" className="tap-target" onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.startsWith("http")) setSeedImageUrl(text);
                    else toast({ title: "No URL found in clipboard" });
                  } catch { toast({ title: "Clipboard access denied" }); }
                }}>
                  <Clipboard className="h-4 w-4" /> Paste
                </Button>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Paste image URL..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="bg-surface-1 text-sm"
                />
                <Button
                  size="sm"
                  disabled={!imageUrlInput}
                  onClick={() => {
                    setSeedImageUrl(imageUrlInput);
                    setImageUrlInput("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">Scene Direction</Label>
            <Textarea
              placeholder="Describe what happens in this scene..."
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="bg-surface-1 min-h-[80px]"
            />
          </div>
        </TabsContent>

        {/* TAB 2: Prompt Builder */}
        <TabsContent value="prompt" className="flex-1 p-4 space-y-4 overflow-y-auto">
          {/* Assembled prompt */}
          <div className="space-y-1.5 sticky top-0 z-10 bg-background pb-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Assembled Prompt</Label>
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-mono", wordColor)}>{wordCount}w</span>
                <span className={cn("text-xs font-mono", charColor)}>{charCount}/2000</span>
              </div>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="bg-surface-1 min-h-[80px] text-sm"
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
          </div>

          {/* Templates */}
          {(blocksByCategory["template"] || []).length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">
                ⚡ Quick Templates
                <ChevronDown className="h-3.5 w-3.5" />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-1.5">
                  {(blocksByCategory["template"] || []).map((block) => {
                    let useFor = "";
                    try { useFor = JSON.parse(block.value).use_for; } catch {}
                    return (
                      <button
                        key={block.id}
                        onClick={() => applyTemplate(block.value)}
                        className="rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                        title={useFor}
                      >
                        {block.label}
                      </button>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* i2v Formula block pickers */}
          <p className="text-[10px] text-muted-foreground/60 px-1">Formula: Shot Setup → Camera → Motion → Style → Super Prompt</p>
          {[
            { key: "shot_setup", label: "① Shot Setup" },
            { key: "camera", label: "② Camera Move" },
            { key: "motion", label: "③ Subject Motion" },
            { key: "style", label: "④ Style & Mood" },
          ].map(({ key, label }) => (
            <Collapsible key={key}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-surface-1 px-3 py-2.5 text-xs font-medium">
                {label}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{(blocksByCategory[key] || []).length}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="flex flex-wrap gap-1.5">
                  {(blocksByCategory[key] || []).map((block) => (
                    <button
                      key={block.id}
                      onClick={() => toggleBlock(block.id, block.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        selectedBlocks.has(block.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2 text-muted-foreground hover:bg-surface-3"
                      )}
                    >
                      {block.label}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}

          {/* ⑥ Super Prompts — Cinematic Quality Boosters */}
          {(blocksByCategory["super_prompt"] || []).length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-accent/30 px-3 py-2.5 text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  ⑥ Super Prompts
                </span>
                <div className="flex items-center gap-1.5">
                  {(() => {
                    const superSelected = (blocksByCategory["super_prompt"] || []).filter(b => selectedBlocks.has(b.id)).length;
                    return superSelected > 0 ? (
                      <span className={cn("text-[10px] font-mono", superSelected > 4 ? "text-status-warning" : "text-status-completed")}>
                        {superSelected}/4
                      </span>
                    ) : null;
                  })()}
                  <span className="text-[10px] text-muted-foreground">{(blocksByCategory["super_prompt"] || []).length}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2">
                <p className="text-[10px] text-muted-foreground/70 px-1">
                  Add ONE aesthetic signature sentence. Pick 3–4 terms max — more compete and cancel.
                </p>
                {(() => {
                  const superSelected = (blocksByCategory["super_prompt"] || []).filter(b => selectedBlocks.has(b.id)).length;
                  return superSelected > 4 ? (
                    <div className="flex items-center gap-1.5 rounded-md bg-status-warning/10 px-2.5 py-1.5 text-[11px] text-status-warning">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Too many super prompts selected — terms will compete and cancel each other. Keep to 3–4 max.
                    </div>
                  ) : null;
                })()}
                <div className="flex flex-wrap gap-1.5">
                  {(blocksByCategory["super_prompt"] || []).map((block) => (
                    <button
                      key={block.id}
                      onClick={() => toggleBlock(block.id, block.value)}
                      className={cn(
                        "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        selectedBlocks.has(block.id)
                          ? "bg-accent text-accent-foreground ring-1 ring-accent-foreground/20"
                          : "bg-surface-2 text-muted-foreground hover:bg-surface-3"
                      )}
                    >
                      {block.label}
                    </button>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* Negative prompt */}
          <div className="space-y-2">
            <Label className="text-xs">⑤ Negative Prompt</Label>
            <Textarea
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="bg-surface-1 min-h-[60px] text-sm"
              placeholder="What to avoid in the generation..."
            />
            <div className="flex flex-wrap gap-1.5">
              {(blocksByCategory["negative"] || []).map((block) => (
                <button
                  key={block.id}
                  onClick={() => toggleNegativeBlock(block.id, block.value)}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    selectedBlocks.has(block.id)
                      ? "bg-destructive/20 text-destructive"
                      : "bg-surface-2 text-muted-foreground hover:bg-surface-3"
                  )}
                >
                  {block.label}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: Parameters */}
        <TabsContent value="params" className="flex-1 p-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Model</Label>
            <Select value="wan-2.6-i2v-flash" disabled>
              <SelectTrigger className="bg-surface-1 text-sm h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wan-2.6-i2v-flash">Wan 2.6 Image-to-Video Flash</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => saveScene()}
            disabled={saving}
            className="w-full"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Changes
          </Button>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Resolution</Label>
              <Select value={resolution} onValueChange={setResolution}>
                <SelectTrigger className="bg-surface-1 text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Duration</Label>
                <span className="text-xs text-muted-foreground font-mono">{duration}s</span>
              </div>
              <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={2} max={15} step={1} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Seed</Label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Random</span>
                  <Switch checked={useRandomSeed} onCheckedChange={setUseRandomSeed} />
                </div>
              </div>
              {!useRandomSeed && (
                <Input
                  type="number"
                  placeholder="Enter seed"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="bg-surface-1 text-sm font-mono"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Shot Type</Label>
              <Select value={shotType} onValueChange={setShotType}>
                <SelectTrigger className="bg-surface-1 text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multi">Multi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Prompt Expansion</Label>
              <Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Audio</Label>
              <Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} />
            </div>
          </div>

          <Separator />

          {/* Cost Preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-3 space-y-1">
              <p className="text-xs font-semibold">Cost Estimate</p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{resolution} × {duration}s</span>
                <span className="font-mono font-semibold text-foreground">${cost.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Results */}
        <TabsContent value="results" className="flex-1 p-4 space-y-4 overflow-y-auto">
          <Button
            className="w-full"
            disabled={!canGenerate || generating}
            onClick={async () => {
              setGenerating(true);
              try {
                // Save first
                await saveScene();
                const { data, error } = await supabase.functions.invoke("generate-video", {
                  body: { scene_id: sceneId, action: "start" },
                });
                if (error) throw new Error(error.message);
                if (data?.error) throw new Error(data.error);
                
                toast({ title: "Generation started!" });
                queryClient.invalidateQueries({ queryKey: ["generations", sceneId] });
                queryClient.invalidateQueries({ queryKey: ["scene", sceneId] });

                // Start polling
                const genId = data.generation.id;
                const poll = setInterval(async () => {
                  try {
                    const { data: pollData } = await supabase.functions.invoke("generate-video", {
                      body: { action: "poll", generation_id: genId },
                    });
                    if (pollData?.status === "completed" || pollData?.status === "failed") {
                      clearInterval(poll);
                      queryClient.invalidateQueries({ queryKey: ["generations", sceneId] });
                      queryClient.invalidateQueries({ queryKey: ["scene", sceneId] });
                      if (pollData.status === "completed") {
                        toast({ title: "Video ready!", description: "Your video has been generated." });
                      } else {
                        toast({ title: "Generation failed", description: pollData.error, variant: "destructive" });
                      }
                    }
                  } catch {}
                }, 4000);
                pollingRef.current = poll;
              } catch (err: any) {
                toast({ title: "Generation failed", description: err.message, variant: "destructive" });
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Generate This Scene
          </Button>

          {!canGenerate && (
            <div className="flex items-start gap-2 rounded-lg bg-surface-1 p-3">
              <AlertCircle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground space-y-0.5">
                {!seedImageUrl && <p>• Seed image is required</p>}
                {!prompt && <p>• Prompt cannot be empty</p>}
              </div>
            </div>
          )}

          <Separator />

          {/* Generation history */}
          <GenerationHistory sceneId={sceneId!} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Generation history sub-component
function GenerationHistory({ sceneId }: { sceneId: string }) {
  const { user } = useAuth();
  const { data: generations = [], isLoading } = useQuery({
    queryKey: ["generations", sceneId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("scene_id", sceneId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sceneId && !!user,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <div className="flex justify-center pt-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  if (generations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center pt-8 text-center">
        <Play className="h-10 w-10 text-muted-foreground/30 mb-3" />
        <p className="text-xs text-muted-foreground">No generations yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">Generated videos will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{generations.length} generation{generations.length !== 1 ? "s" : ""}</p>
      {generations.map((gen) => (
        <Card key={gen.id} className="border-border/50">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {gen.status === "completed" && <CheckCircle2 className="h-4 w-4 text-status-completed" />}
                {gen.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-status-warning" />}
                {gen.status === "failed" && <XCircle className="h-4 w-4 text-status-failed" />}
                <span className="text-xs font-medium capitalize">{gen.status}</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {gen.cost ? `$${gen.cost.toFixed(2)}` : ""}
              </span>
            </div>
            {gen.video_url && (
              <video
                src={gen.video_url}
                controls
                className="w-full rounded-lg"
                preload="metadata"
              />
            )}
            {gen.error_message && (
              <p className="text-xs text-status-failed">{gen.error_message}</p>
            )}
            <p className="text-[10px] text-muted-foreground">
              {new Date(gen.created_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default SceneEditorPage;
