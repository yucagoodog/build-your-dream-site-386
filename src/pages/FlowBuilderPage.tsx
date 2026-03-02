import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Play, Save,
  Loader2, GripVertical, ImageIcon, Clapperboard, ZoomIn, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/lib/image-sizes";

type StepType = "image_generation" | "video_generation" | "image_upscale";

const STEP_TYPE_META: Record<StepType, { label: string; icon: any; color: string }> = {
  image_generation: { label: "Image Generation", icon: ImageIcon, color: "text-blue-400" },
  video_generation: { label: "Video Generation", icon: Clapperboard, color: "text-purple-400" },
  image_upscale: { label: "Image Upscale", icon: ZoomIn, color: "text-emerald-400" },
};

interface StepConfig {
  prompt?: string;
  negative_prompt?: string;
  output_size?: string;
  model?: string;
  seed?: number;
  enable_prompt_expansion?: boolean;
  resolution?: string;
  duration?: number;
  shot_type?: string;
  generate_audio?: boolean;
  target_resolution?: string;
  creativity?: number;
}

const DEFAULT_CONFIGS: Record<StepType, StepConfig> = {
  image_generation: {
    prompt: "", negative_prompt: "", output_size: "1280*1280",
    model: "alibaba/wan-2.6/image-edit", seed: -1, enable_prompt_expansion: true,
  },
  video_generation: {
    prompt: "", negative_prompt: "", resolution: "720p", duration: 5,
    shot_type: "single", seed: -1, enable_prompt_expansion: true, generate_audio: false,
  },
  image_upscale: {
    target_resolution: "4k", creativity: 2,
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

  const addStep = (type: StepType) => {
    const newStep = {
      id: `new-${Date.now()}`,
      flow_id: flowId,
      user_id: user!.id,
      step_number: localSteps.length + 1,
      step_type: type,
      config: DEFAULT_CONFIGS[type],
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
      next[index] = { ...next[index], step_type: newType, config: DEFAULT_CONFIGS[newType] };
      return next;
    });
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    if (!user || !flowId) return;
    setSaving(true);
    try {
      // Update flow name/desc
      await supabase.from("flows").update({ name: flowName, description: flowDesc } as any).eq("id", flowId);

      // Delete existing steps and re-insert
      await supabase.from("flow_steps").delete().eq("flow_id", flowId);

      if (localSteps.length > 0) {
        const inserts = localSteps.map((s, i) => ({
          flow_id: flowId,
          user_id: user.id,
          step_number: i + 1,
          step_type: s.step_type,
          config: s.config,
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
    } finally {
      setSaving(false);
    }
  }, [user, flowId, flowName, flowDesc, localSteps, queryClient]);

  const handleStartRun = async (mode: "full_auto" | "step_by_step") => {
    if (!user || !flowId || localSteps.length === 0) return;
    // Save first if dirty
    if (dirty) await handleSave();
    setStartingRun(true);
    try {
      // Re-fetch saved steps to get real IDs
      const { data: savedSteps } = await supabase
        .from("flow_steps").select("*").eq("flow_id", flowId).order("step_number");
      if (!savedSteps || savedSteps.length === 0) throw new Error("No steps to run");

      // Create execution
      const { data: exec, error: execErr } = await supabase
        .from("flow_executions")
        .insert({ flow_id: flowId, user_id: user.id, mode, status: "pending" } as any)
        .select()
        .single();
      if (execErr) throw execErr;

      // Create step executions
      const stepExecs = savedSteps.map((s: any) => ({
        execution_id: exec.id,
        step_id: s.id,
        user_id: user.id,
        step_number: s.step_number,
        status: "pending",
        config_snapshot: s.config,
      }));
      const { error: seErr } = await supabase.from("flow_step_executions").insert(stepExecs as any);
      if (seErr) throw seErr;

      navigate(`/flows/${flowId}/run/${exec.id}`);
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally {
      setStartingRun(false);
    }
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
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={saving || !dirty} className="gap-1.5 h-8">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
          </Button>
        </div>
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
                <StepCard
                  step={step} index={idx} totalSteps={localSteps.length}
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

          {/* Add step */}
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

/* ── Step Card ── */
function StepCard({ step, index, totalSteps, onRemove, onUpdateConfig, onUpdateType }: {
  step: any; index: number; totalSteps: number;
  onRemove: () => void;
  onUpdateConfig: (key: string, value: any) => void;
  onUpdateType: (type: StepType) => void;
}) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const meta = STEP_TYPE_META[step.step_type as StepType];
  const Icon = meta.icon;
  const config = step.config || {};

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
          <CardContent className="pt-0 pb-4 px-3 space-y-3">
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

            {/* Image Generation controls */}
            {step.step_type === "image_generation" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prompt</Label>
                  <Textarea value={config.prompt || ""} onChange={(e) => onUpdateConfig("prompt", e.target.value)}
                    className="bg-surface-1 min-h-[80px] text-xs" placeholder="Describe the edit..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Negative Prompt</Label>
                  <Input value={config.negative_prompt || ""} onChange={(e) => onUpdateConfig("negative_prompt", e.target.value)}
                    className="bg-surface-1 text-xs h-9" placeholder="What to avoid..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Output Size</Label>
                    <Select value={config.output_size || "1280*1280"} onValueChange={(v) => onUpdateConfig("output_size", v)}>
                      <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{IMAGE_SIZES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Model</Label>
                    <Select value={config.model || "alibaba/wan-2.6/image-edit"} onValueChange={(v) => onUpdateConfig("model", v)}>
                      <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alibaba/wan-2.6/image-edit" className="text-xs">WAN 2.6 Edit</SelectItem>
                        <SelectItem value="alibaba/qwen-edit-plus" className="text-xs">Qwen Edit Plus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><Switch checked={config.enable_prompt_expansion ?? true} onCheckedChange={(v) => onUpdateConfig("enable_prompt_expansion", v)} /><Label className="text-xs">Expand</Label></div>
                </div>
              </div>
            )}

            {/* Video Generation controls */}
            {step.step_type === "video_generation" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Prompt</Label>
                  <Textarea value={config.prompt || ""} onChange={(e) => onUpdateConfig("prompt", e.target.value)}
                    className="bg-surface-1 min-h-[80px] text-xs" placeholder="Describe the motion..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Negative Prompt</Label>
                  <Input value={config.negative_prompt || ""} onChange={(e) => onUpdateConfig("negative_prompt", e.target.value)}
                    className="bg-surface-1 text-xs h-9" placeholder="What to avoid..." />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Resolution</Label>
                    <Select value={config.resolution || "720p"} onValueChange={(v) => onUpdateConfig("resolution", v)}>
                      <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="720p">720p</SelectItem><SelectItem value="1080p">1080p</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground">Shot Type</Label>
                    <Select value={config.shot_type || "single"} onValueChange={(v) => onUpdateConfig("shot_type", v)}>
                      <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="multi">Multi</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] text-muted-foreground">Duration</Label>
                    <span className="text-xs text-muted-foreground font-mono">{config.duration || 5}s</span>
                  </div>
                  <Slider value={[config.duration || 5]} onValueChange={(v) => onUpdateConfig("duration", v[0])} min={2} max={15} step={1} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2"><Switch checked={config.enable_prompt_expansion ?? true} onCheckedChange={(v) => onUpdateConfig("enable_prompt_expansion", v)} /><Label className="text-xs">Expand</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={config.generate_audio ?? false} onCheckedChange={(v) => onUpdateConfig("generate_audio", v)} /><Label className="text-xs">Audio</Label></div>
                </div>
              </div>
            )}

            {/* Upscale controls */}
            {step.step_type === "image_upscale" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">Target Resolution</Label>
                  <Select value={config.target_resolution || "4k"} onValueChange={(v) => onUpdateConfig("target_resolution", v)}>
                    <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2k">2K</SelectItem>
                      <SelectItem value="4k">4K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export default FlowBuilderPage;
