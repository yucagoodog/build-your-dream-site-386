import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Play, Save,
  Loader2, ImageIcon, Clapperboard, ZoomIn, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ImageSourceSlots, SeedImageUpload,
  ImagePromptSection, ImageParamsSection,
  VideoPromptSection, VideoParamsSection,
  UpscaleParamsSection,
} from "@/components/generation/SharedGenerationUI";

type StepType = "image_generation" | "video_generation" | "image_upscale";

const STEP_TYPE_META: Record<StepType, { label: string; icon: any; color: string }> = {
  image_generation: { label: "Image Generation", icon: ImageIcon, color: "text-blue-400" },
  video_generation: { label: "Video Generation", icon: Clapperboard, color: "text-purple-400" },
  image_upscale: { label: "Image Upscale", icon: ZoomIn, color: "text-emerald-400" },
};

const DEFAULT_CONFIGS: Record<StepType, any> = {
  image_generation: {
    prompt: "", negative_prompt: "", output_size: "1280*1280",
    model: "alibaba/wan-2.6/image-edit", seed: -1, enable_prompt_expansion: true,
    source_image_urls: [null, null, null, null],
  },
  video_generation: {
    prompt: "", negative_prompt: "", resolution: "720p", duration: 5,
    shot_type: "single", seed: -1, enable_prompt_expansion: true, generate_audio: false,
    seed_image_url: "",
  },
  image_upscale: {
    target_resolution: "4k", creativity: 2, source_image_url: "",
  },
};

const FlowBuilderPage = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowDesc, setFlowDesc] = useState("");
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  const [startingRun, setStartingRun] = useState(false);

  // Load flow
  const { isLoading: flowLoading } = useQuery({
    queryKey: ["flow", flowId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flows").select("*").eq("id", flowId!).single();
      if (error) throw error;
      setFlowName(data.name);
      setFlowDesc(data.description || "");
      return data;
    },
    enabled: !!flowId && !!user,
  });

  // Load steps
  const { isLoading: stepsLoading } = useQuery({
    queryKey: ["flow_steps", flowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_steps").select("*").eq("flow_id", flowId!)
        .order("step_number");
      if (error) throw error;
      setLocalSteps(data || []);
      return data;
    },
    enabled: !!flowId && !!user,
  });

  // Prompt blocks for pickers
  const { data: imgBlocks = [] } = useQuery({
    queryKey: ["img_prompt_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("prompt_blocks").select("*").like("category", "img_%").order("sort_order");
      return data || [];
    },
  });

  const { data: vidBlocks = [] } = useQuery({
    queryKey: ["vid_prompt_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("prompt_blocks").select("*").not("category", "like", "img_%").order("sort_order");
      return data || [];
    },
    enabled: !!user,
  });

  const imgBlocksByCategory = imgBlocks.reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const vidBlocksByCategory = vidBlocks.reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const addStep = (type: StepType) => {
    const newStep = {
      id: `new-${Date.now()}`,
      flow_id: flowId,
      user_id: user!.id,
      step_number: localSteps.length + 1,
      step_type: type,
      config: { ...DEFAULT_CONFIGS[type] },
    };
    setLocalSteps((prev) => [...prev, newStep]);
    setDirty(true);
  };

  const removeStep = (index: number) => {
    setLocalSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    setDirty(true);
  };

  const updateStepConfig = (index: number, key: string, value: any) => {
    setLocalSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], config: { ...next[index].config, [key]: value } };
      return next;
    });
    setDirty(true);
  };

  const updateStepType = (index: number, newType: StepType) => {
    setLocalSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], step_type: newType, config: { ...DEFAULT_CONFIGS[newType] } };
      return next;
    });
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    if (!user || !flowId) return;
    setSaving(true);
    try {
      await supabase.from("flows").update({ name: flowName, description: flowDesc } as any).eq("id", flowId);
      await supabase.from("flow_steps").delete().eq("flow_id", flowId);
      if (localSteps.length > 0) {
        const inserts = localSteps.map((s, i) => ({
          flow_id: flowId, user_id: user.id, step_number: i + 1,
          step_type: s.step_type, config: s.config,
        }));
        const { error } = await supabase.from("flow_steps").insert(inserts as any);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["flow", flowId] });
      queryClient.invalidateQueries({ queryKey: ["flow_steps", flowId] });
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      queryClient.invalidateQueries({ queryKey: ["flow_step_counts"] });
      toast({ title: "Flow saved" });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }, [user, flowId, flowName, flowDesc, localSteps, queryClient]);

  const handleStartRun = async (mode: "full_auto" | "step_by_step") => {
    if (!user || !flowId || localSteps.length === 0) return;
    if (dirty) await handleSave();
    setStartingRun(true);
    try {
      const { data: savedSteps } = await supabase
        .from("flow_steps").select("*").eq("flow_id", flowId).order("step_number");
      if (!savedSteps || savedSteps.length === 0) throw new Error("No steps to run");
      const { data: exec, error: execErr } = await supabase
        .from("flow_executions")
        .insert({ flow_id: flowId, user_id: user.id, mode, status: "pending" } as any)
        .select().single();
      if (execErr) throw execErr;
      const stepExecs = savedSteps.map((s: any) => ({
        execution_id: exec.id, step_id: s.id, user_id: user.id,
        step_number: s.step_number, status: "pending", config_snapshot: s.config,
      }));
      const { error: seErr } = await supabase.from("flow_step_executions").insert(stepExecs as any);
      if (seErr) throw seErr;
      navigate(`/flows/${flowId}/run/${exec.id}`);
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally { setStartingRun(false); }
  };

  const loading = flowLoading || stepsLoading;

  return (
    <AppShell title="Flow Builder"
      headerLeft={
        <button onClick={() => navigate("/flows")} className="h-10 w-10 flex items-center justify-center rounded-lg active:bg-foreground/10 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
      headerRight={
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !dirty} className="gap-1.5 h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 max-w-xl mx-auto space-y-4">
          {/* Flow info */}
          <div className="space-y-2">
            <Input value={flowName} onChange={(e) => { setFlowName(e.target.value); setDirty(true); }}
              className="bg-surface-1 font-medium" placeholder="Flow name" />
            <Input value={flowDesc} onChange={(e) => { setFlowDesc(e.target.value); setDirty(true); }}
              className="bg-surface-1 text-xs" placeholder="Description (optional)" />
          </div>

          {/* Steps */}
          <div className="space-y-1">
            {localSteps.map((step, idx) => (
              <div key={step.id}>
                <FullStepCard
                  step={step} index={idx}
                  imgBlocksByCategory={imgBlocksByCategory}
                  vidBlocksByCategory={vidBlocksByCategory}
                  onRemove={() => removeStep(idx)}
                  onUpdateConfig={(k, v) => updateStepConfig(idx, k, v)}
                  onUpdateType={(t) => updateStepType(idx, t)}
                />
                {idx < localSteps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add step buttons */}
          <div className="flex gap-2">
            {(Object.keys(STEP_TYPE_META) as StepType[]).map((type) => {
              const meta = STEP_TYPE_META[type];
              return (
                <Button key={type} variant="outline" size="sm" className="flex-1 gap-1.5 text-[11px] h-10"
                  onClick={() => addStep(type)}>
                  <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />
                  {meta.label.replace("Generation", "Gen").replace("Image ", "Img ")}
                </Button>
              );
            })}
          </div>

          <Separator />

          {/* Run buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => handleStartRun("full_auto")} disabled={localSteps.length === 0 || startingRun}
              className="gap-1.5 h-11">
              {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Full Auto
            </Button>
            <Button variant="outline" onClick={() => handleStartRun("step_by_step")}
              disabled={localSteps.length === 0 || startingRun} className="gap-1.5 h-11">
              {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Step-by-Step
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
};

/* ── Full Step Card with complete generation UI ── */
function FullStepCard({ step, index, imgBlocksByCategory, vidBlocksByCategory, onRemove, onUpdateConfig, onUpdateType }: {
  step: any; index: number;
  imgBlocksByCategory: Record<string, any[]>;
  vidBlocksByCategory: Record<string, any[]>;
  onRemove: () => void;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateType: (type: StepType) => void;
}) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const meta = STEP_TYPE_META[step.step_type as StepType];
  const Icon = meta.icon;
  const config = step.config || {};

  // Local state wrappers that sync to config
  const setConfigPrompt = (v: string) => onUpdateConfig("prompt", v);
  const setConfigNeg = (v: string) => onUpdateConfig("negative_prompt", v);

  return (
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            step.step_type === "image_generation" ? "bg-blue-500/10" :
            step.step_type === "video_generation" ? "bg-purple-500/10" : "bg-emerald-500/10"
          )}>
            <Icon className={cn("h-4 w-4", meta.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full text-left">
              <span className="text-xs font-medium">Step {index + 1}</span>
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{meta.label}</Badge>
              {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto" /> : <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto" />}
            </CollapsibleTrigger>
          </div>
          <button onClick={onRemove} className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-3 space-y-4">
            {/* Type selector */}
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Step Type</Label>
              <Select value={step.step_type} onValueChange={(v) => onUpdateType(v as StepType)}>
                <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(STEP_TYPE_META) as StepType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{STEP_TYPE_META[t].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {index > 0 && (
              <p className="text-[10px] text-muted-foreground/60 bg-surface-1 rounded-md px-2.5 py-1.5">
                ↑ Input: Previous step's output artifact
              </p>
            )}

            {/* ── Image Generation: Full UI ── */}
            {step.step_type === "image_generation" && (
              <div className="space-y-4">
                {index === 0 && (
                  <ImageSourceSlots
                    slotImages={config.source_image_urls || [null, null, null, null]}
                    setSlotImages={(v) => {
                      const val = typeof v === "function" ? v(config.source_image_urls || [null, null, null, null]) : v;
                      onUpdateConfig("source_image_urls", val);
                    }}
                  />
                )}
                <Separator />
                <ImagePromptSection
                  prompt={config.prompt || ""}
                  setPrompt={setConfigPrompt}
                  negativePrompt={config.negative_prompt || ""}
                  setNegativePrompt={setConfigNeg}
                  blocksByCategory={imgBlocksByCategory}
                />
                <Separator />
                <ImageParamsSection
                  outputSize={config.output_size || "1280*1280"}
                  setOutputSize={(v) => onUpdateConfig("output_size", v)}
                  imageModel={config.model || "alibaba/wan-2.6/image-edit"}
                  setImageModel={(v) => onUpdateConfig("model", v)}
                  randomSeed={config.seed === -1 || config.seed === undefined}
                  setRandomSeed={(v) => onUpdateConfig("seed", v ? -1 : 0)}
                  seed={config.seed === -1 ? "" : String(config.seed || "")}
                  setSeed={(v) => onUpdateConfig("seed", parseInt(v) || 0)}
                  promptExpansion={config.enable_prompt_expansion ?? true}
                  setPromptExpansion={(v) => onUpdateConfig("enable_prompt_expansion", v)}
                />
              </div>
            )}

            {/* ── Video Generation: Full UI ── */}
            {step.step_type === "video_generation" && (
              <div className="space-y-4">
                {index === 0 && (
                  <SeedImageUpload
                    imageUrl={config.seed_image_url || ""}
                    setImageUrl={(v) => onUpdateConfig("seed_image_url", v)}
                  />
                )}
                <Separator />
                <VideoPromptSection
                  prompt={config.prompt || ""}
                  setPrompt={setConfigPrompt}
                  negativePrompt={config.negative_prompt || ""}
                  setNegativePrompt={setConfigNeg}
                  blocksByCategory={vidBlocksByCategory}
                  duration={config.duration || 5}
                />
                <Separator />
                <VideoParamsSection
                  resolution={config.resolution || "720p"}
                  setResolution={(v) => onUpdateConfig("resolution", v)}
                  shotType={config.shot_type || "single"}
                  setShotType={(v) => onUpdateConfig("shot_type", v)}
                  duration={config.duration || 5}
                  setDuration={(v) => onUpdateConfig("duration", v)}
                  randomSeed={config.seed === -1 || config.seed === undefined}
                  setRandomSeed={(v) => onUpdateConfig("seed", v ? -1 : 0)}
                  seed={config.seed === -1 ? "" : String(config.seed || "")}
                  setSeed={(v) => onUpdateConfig("seed", parseInt(v) || 0)}
                  promptExpansion={config.enable_prompt_expansion ?? true}
                  setPromptExpansion={(v) => onUpdateConfig("enable_prompt_expansion", v)}
                  audioEnabled={config.generate_audio ?? false}
                  setAudioEnabled={(v) => onUpdateConfig("generate_audio", v)}
                />
              </div>
            )}

            {/* ── Image Upscale: Full UI ── */}
            {step.step_type === "image_upscale" && (
              <div className="space-y-4">
                {index === 0 && (
                  <SeedImageUpload
                    imageUrl={config.source_image_url || ""}
                    setImageUrl={(v) => onUpdateConfig("source_image_url", v)}
                    label="Image to Upscale"
                  />
                )}
                <UpscaleParamsSection
                  targetResolution={config.target_resolution || "4k"}
                  setTargetResolution={(v) => onUpdateConfig("target_resolution", v)}
                />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default FlowBuilderPage;
