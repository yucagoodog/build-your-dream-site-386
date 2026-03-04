import { useState, useEffect, useRef, useCallback } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Play, Save,
  Loader2, ImageIcon, Clapperboard, ZoomIn, ArrowDown, Layers,
  Clock, Check, X, RotateCcw, Download, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import {
  ImageSourceSlots, SeedImageUpload,
  ImagePromptSection, ImageParamsSection,
  VideoModelSelector, VideoPromptSection, VideoParamsSection,
  UpscaleParamsSection, OverlayParamsSection,
} from "@/components/generation/SharedGenerationUI";

type StepType = "image_generation" | "video_generation" | "image_upscale" | "image_overlay";

const STEP_TYPE_META: Record<StepType, { label: string; icon: any; color: string }> = {
  image_generation: { label: "Image Generation", icon: ImageIcon, color: "text-blue-400" },
  video_generation: { label: "Video Generation", icon: Clapperboard, color: "text-purple-400" },
  image_upscale: { label: "Image Upscale", icon: ZoomIn, color: "text-emerald-400" },
  image_overlay: { label: "Image Overlay", icon: Layers, color: "text-orange-400" },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-muted", text: "text-muted-foreground", label: "Pending" },
  running: { bg: "bg-[hsl(var(--status-processing))]/10", text: "text-[hsl(var(--status-processing))]", label: "Running" },
  completed: { bg: "bg-[hsl(var(--status-completed))]/10", text: "text-[hsl(var(--status-completed))]", label: "Done" },
  failed: { bg: "bg-[hsl(var(--status-failed))]/10", text: "text-[hsl(var(--status-failed))]", label: "Failed" },
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
    seed_image_url: "", model: "alibaba/wan-2.6/image-to-video-flash",
  },
  image_upscale: {
    prompt: "Enhance this image to higher quality and resolution with maximum detail",
    aspect_ratio: "original", output_format: "png", resolution: "1k", source_image_url: "",
  },
  image_overlay: {
    overlay_image_url: "", source_image_url: "",
    opacity: 100, scale: 100, position_x: 0, position_y: 0,
  },
};

function getStepDefaults(type: StepType, settings: any): any {
  if (!settings) return { ...DEFAULT_CONFIGS[type] };
  if (type === "image_generation") {
    return {
      ...DEFAULT_CONFIGS.image_generation,
      output_size: settings.default_image_output_size || "1280*1280",
      model: settings.default_image_model || "alibaba/wan-2.6/image-edit",
      enable_prompt_expansion: settings.default_image_prompt_expansion ?? true,
    };
  }
  if (type === "video_generation") {
    return {
      ...DEFAULT_CONFIGS.video_generation,
      resolution: settings.default_resolution || "720p",
      duration: settings.default_duration || 5,
      shot_type: settings.default_shot_type || "single",
      enable_prompt_expansion: settings.default_prompt_expansion ?? true,
      generate_audio: settings.default_audio ?? false,
    };
  }
  return { ...DEFAULT_CONFIGS[type] };
}

const FlowBuilderPage = () => {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Build state
  const [saving, setSaving] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [flowDesc, setFlowDesc] = useState("");
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  const [dirty, setDirty] = useState(false);
  const [startingRun, setStartingRun] = useState(false);
  const [activeTab, setActiveTab] = useState("build");

  // Run tab: first-step input (ephemeral, not saved to flow config)
  const [runInput, setRunInput] = useState<{
    source_image_urls?: (string | null)[];
    seed_image_url?: string;
    source_image_url?: string;
  }>({});

  // Running tab state
  const [activeExecId, setActiveExecId] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

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

  const { data: userSettings } = useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { isLoading: stepsLoading } = useQuery({
    queryKey: ["flow_steps", flowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_steps").select("*").eq("flow_id", flowId!).order("step_number");
      if (error) throw error;
      setLocalSteps(data || []);
      return data;
    },
    enabled: !!flowId && !!user,
  });

  // Load past runs
  const { data: pastRuns = [], refetch: refetchRuns } = useQuery({
    queryKey: ["flow_runs", flowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_executions").select("*").eq("flow_id", flowId!)
        .order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!flowId && !!user,
  });

  // Load active execution
  const { data: activeExec, refetch: refetchExec } = useQuery({
    queryKey: ["flow_execution", activeExecId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_executions").select("*").eq("id", activeExecId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!activeExecId,
  });

  // Load step executions for active run
  const { data: stepExecs = [], refetch: refetchStepExecs } = useQuery({
    queryKey: ["flow_step_executions", activeExecId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_step_executions")
        .select("*, flow_steps!flow_step_executions_step_id_fkey(step_type)")
        .eq("execution_id", activeExecId!)
        .order("step_number");
      if (error) throw error;
      return (data || []).map((se: any) => ({
        ...se,
        step_type: se.flow_steps?.step_type || null,
      }));
    },
    enabled: !!activeExecId,
  });

  const refetchAll = useCallback(() => {
    refetchExec();
    refetchStepExecs();
    refetchRuns();
  }, [refetchExec, refetchStepExecs, refetchRuns]);

  // Prompt blocks
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

  // ── Build actions ──
  const addStep = (type: StepType, atIndex?: number) => {
    const newStep = {
      id: `new-${Date.now()}`, flow_id: flowId, user_id: user!.id,
      step_number: 0, step_type: type, config: getStepDefaults(type, userSettings),
    };
    setLocalSteps((prev) => {
      const idx = atIndex !== undefined ? atIndex : prev.length;
      const next = [...prev.slice(0, idx), newStep, ...prev.slice(idx)];
      return next.map((s, i) => ({ ...s, step_number: i + 1 }));
    });
    setDirty(true);
  };

  const removeStep = (index: number) => {
    setLocalSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_number: i + 1 })));
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
      next[index] = { ...next[index], step_type: newType, config: getStepDefaults(newType, userSettings) };
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

  // ── Start a run (used by both Build and Run tabs) ──
  const handleStartRun = async (mode: "full_auto" | "step_by_step", inputOverride?: any) => {
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

      const stepExecsToInsert = savedSteps.map((s: any, i: number) => {
        const cfg = s.config ? { ...s.config } : {};
        // For first step, apply run-time input override
        if (i === 0 && inputOverride) {
          if (inputOverride.source_image_urls) cfg.source_image_urls = inputOverride.source_image_urls;
          if (inputOverride.seed_image_url) cfg.seed_image_url = inputOverride.seed_image_url;
          if (inputOverride.source_image_url) cfg.source_image_url = inputOverride.source_image_url;
        }

        const firstSourceImage = Array.isArray(cfg.source_image_urls)
          ? cfg.source_image_urls.find((url: string | null) => Boolean(url))
          : null;
        const initialInput = cfg.source_image_url || cfg.seed_image_url || firstSourceImage || null;

        return {
          execution_id: exec.id, step_id: s.id, user_id: user.id,
          step_number: s.step_number, status: "pending",
          input_artifact_url: i === 0 ? initialInput : null,
          config_snapshot: cfg,
        };
      });

      const { error: seErr } = await supabase.from("flow_step_executions").insert(stepExecsToInsert as any);
      if (seErr) throw seErr;

      setActiveExecId(exec.id);
      setActiveTab("running");
      refetchRuns();
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally { setStartingRun(false); }
  };

  // ── Execution logic (Running tab) ──
  const pollForResult = useCallback((fn: string, body: any, urlField: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const { data } = await supabase.functions.invoke(fn, { body });
          if (data?.status === "completed") {
            clearInterval(interval);
            const url = data?.[urlField] || data?.result_url || data?.atlas_result_url;
            if (url) resolve(url);
            else reject(new Error("Completed but no artifact URL"));
          } else if (data?.status === "failed") {
            clearInterval(interval);
            reject(new Error(data?.error || "Step failed"));
          } else if (attempts >= maxAttempts) {
            clearInterval(interval);
            reject(new Error("Timeout waiting for result"));
          }
        } catch (err) { clearInterval(interval); reject(err); }
      }, 4000);
    });
  }, []);

  const executeStep = useCallback(async (stepExec: any): Promise<boolean> => {
    if (!user || !activeExecId) return false;
    const config = stepExec.config_snapshot || {};
    const stepType = stepExec.step_type || null;

    const getConfigInput = (cfg: any): string | null => {
      const first = Array.isArray(cfg?.source_image_urls)
        ? cfg.source_image_urls.find((url: string | null) => Boolean(url)) : null;
      return cfg?.source_image_url || cfg?.seed_image_url || first || null;
    };

    let inputUrl = stepExec.input_artifact_url || getConfigInput(config);
    if (!inputUrl) {
      const { data: latestStep } = await supabase
        .from("flow_step_executions").select("input_artifact_url, config_snapshot")
        .eq("id", stepExec.id).single();
      inputUrl = latestStep?.input_artifact_url || getConfigInput(latestStep?.config_snapshot || {}) || null;
    }

    await supabase.from("flow_step_executions")
      .update({ status: "running", started_at: new Date().toISOString() } as any).eq("id", stepExec.id);
    await supabase.from("flow_executions")
      .update({ current_step: stepExec.step_number, status: "running" } as any).eq("id", activeExecId);
    refetchAll();

    try {
      let resultUrl: string | null = null;

      if (stepType === "image_generation") {
        const explicitSources = Array.isArray(config.source_image_urls)
          ? config.source_image_urls.filter(Boolean)
          : [];
        const isFirstStep = stepExec.step_number === 1;
        if (!isFirstStep && !inputUrl) {
          throw new Error("No chained input for image generation step");
        }
        const imageUrls = isFirstStep
          ? (explicitSources.length > 0 ? explicitSources : (inputUrl ? [inputUrl] : []))
          : [inputUrl as string];
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            action: "start", image_urls: imageUrls,
            prompt: config.prompt || "", negative_prompt: config.negative_prompt || "",
            output_size: config.output_size || "1280*1280", seed: config.seed ?? -1,
            enable_prompt_expansion: config.enable_prompt_expansion ?? true,
            model: config.model || "alibaba/wan-2.6/image-edit",
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        if (!data?.edit?.id) throw new Error("No edit ID returned");
        resultUrl = await pollForResult("generate-image", { action: "poll", edit_id: data.edit.id }, "output_image_url");

      } else if (stepType === "video_generation") {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: {
            action: "start", prompt: config.prompt || "", negative_prompt: config.negative_prompt || "",
            seed_image_url: inputUrl || "", resolution: config.resolution || "720p",
            duration: config.duration || 5, shot_type: config.shot_type || "single",
            seed: config.seed ?? -1, enable_prompt_expansion: config.enable_prompt_expansion ?? true,
            generate_audio: config.generate_audio ?? false,
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        if (!data?.generation?.id) throw new Error("No generation ID returned");
        resultUrl = await pollForResult("generate-video", { action: "poll", generation_id: data.generation.id }, "video_url");

      } else if (stepType === "image_upscale") {
        if (!inputUrl) throw new Error("No input image for upscale");
        const { data, error } = await supabase.functions.invoke("upscale-image", {
          body: {
            action: "start", image_url: inputUrl,
            prompt: config.prompt || "Enhance this image to higher quality and resolution with maximum detail",
            aspect_ratio: config.aspect_ratio === "original" ? undefined : config.aspect_ratio,
            output_format: config.output_format || "png", resolution: config.resolution || "1k",
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message || "Upscale failed");
        if (!data?.edit?.id) throw new Error("No edit ID returned");
        resultUrl = await pollForResult("upscale-image", { action: "poll", edit_id: data.edit.id }, "output_image_url");

      } else if (stepType === "image_overlay") {
        if (!config.overlay_image_url) throw new Error("No overlay image configured");
        if (!inputUrl) throw new Error("No base image for overlay");
        const { data, error } = await supabase.functions.invoke("composite-image", {
          body: {
            base_image_url: inputUrl, overlay_image_url: config.overlay_image_url,
            opacity: config.opacity ?? 100, scale: config.scale ?? 100,
            position_x: config.position_x ?? 0, position_y: config.position_y ?? 0,
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message || "Overlay failed");
        resultUrl = data?.result_url;
      }

      if (!resultUrl) throw new Error("No output artifact produced");

      await supabase.from("flow_step_executions")
        .update({ status: "completed", output_artifact_url: resultUrl, prompt_used: config.prompt || "", completed_at: new Date().toISOString() } as any)
        .eq("id", stepExec.id);
      refetchAll();
      return true;
    } catch (err: any) {
      await supabase.from("flow_step_executions")
        .update({ status: "failed", error_message: err.message, completed_at: new Date().toISOString() } as any)
        .eq("id", stepExec.id);
      await supabase.from("flow_executions")
        .update({ status: "failed" } as any).eq("id", activeExecId);
      refetchAll();
      return false;
    }
  }, [user, activeExecId, refetchAll, pollForResult]);

  const runFullAuto = useCallback(async () => {
    setExecuting(true);
    for (let i = 0; i < stepExecs.length; i++) {
      const { data: latestExec } = await supabase
        .from("flow_executions").select("status").eq("id", activeExecId!).single();
      if (latestExec?.status === "failed" || latestExec?.status === "completed") break;
      const se = stepExecs[i];
      if (se.status === "completed") continue;

      let inputUrl: string | null = null;
      if (i > 0) {
        const { data: prevStep } = await supabase
          .from("flow_step_executions").select("output_artifact_url")
          .eq("id", stepExecs[i - 1].id).single();
        inputUrl = prevStep?.output_artifact_url || null;
        if (!inputUrl) {
          toast({ title: "Missing input", description: `Step ${i + 1} has no output to chain`, variant: "destructive" });
          break;
        }
      }
      if (inputUrl) {
        await supabase.from("flow_step_executions")
          .update({ input_artifact_url: inputUrl } as any).eq("id", se.id);
        se.input_artifact_url = inputUrl;
      }
      const ok = await executeStep(se);
      if (!ok) break;
    }
    const { data: updated } = await supabase
      .from("flow_step_executions").select("status").eq("execution_id", activeExecId!);
    if (updated?.every((s: any) => s.status === "completed")) {
      await supabase.from("flow_executions")
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", activeExecId);
    }
    refetchAll();
    setExecuting(false);
  }, [stepExecs, executeStep, activeExecId, refetchAll]);

  const runNextStep = useCallback(async () => {
    const nextStep = stepExecs.find((s: any) => s.status === "pending");
    if (!nextStep) return;
    setExecuting(true);
    const idx = stepExecs.indexOf(nextStep);
    let inputUrl: string | null = null;
    if (idx > 0) {
      const { data: prevStep } = await supabase
        .from("flow_step_executions").select("output_artifact_url")
        .eq("id", stepExecs[idx - 1].id).single();
      inputUrl = prevStep?.output_artifact_url || null;
      if (!inputUrl) {
        toast({ title: "Missing input", description: "Previous step hasn't completed", variant: "destructive" });
        setExecuting(false);
        return;
      }
    }
    if (inputUrl) {
      await supabase.from("flow_step_executions")
        .update({ input_artifact_url: inputUrl } as any).eq("id", nextStep.id);
      nextStep.input_artifact_url = inputUrl;
    }
    const ok = await executeStep(nextStep);
    if (ok) {
      const remaining = stepExecs.filter((s: any) => s.id !== nextStep.id && s.status === "pending");
      if (remaining.length === 0) {
        await supabase.from("flow_executions")
          .update({ status: "completed", completed_at: new Date().toISOString() } as any)
          .eq("id", activeExecId);
      }
    }
    refetchAll();
    setExecuting(false);
  }, [stepExecs, executeStep, activeExecId, refetchAll]);

  const rerunFromStep = useCallback(async (fromIndex: number) => {
    for (let i = fromIndex; i < stepExecs.length; i++) {
      await supabase.from("flow_step_executions")
        .update({ status: "pending", output_artifact_url: null, input_artifact_url: null, error_message: null, started_at: null, completed_at: null } as any)
        .eq("id", stepExecs[i].id);
    }
    await supabase.from("flow_executions")
      .update({ status: "pending", current_step: fromIndex + 1 } as any)
      .eq("id", activeExecId);
    refetchAll();
    toast({ title: `Reset from step ${fromIndex + 1}` });
  }, [stepExecs, activeExecId, refetchAll]);

  // Auto-start full_auto when execution is set
  useEffect(() => {
    if (activeExec?.status === "pending" && stepExecs.length > 0 && !executing && activeTab === "running") {
      if (activeExec.mode === "full_auto") {
        runFullAuto();
      }
    }
  }, [activeExec?.status, stepExecs.length, activeTab]);

  const deleteRun = async (runId: string) => {
    await supabase.from("flow_step_executions").delete().eq("execution_id", runId);
    await supabase.from("flow_executions").delete().eq("id", runId);
    if (activeExecId === runId) setActiveExecId(null);
    refetchRuns();
    toast({ title: "Run deleted" });
  };

  const loading = flowLoading || stepsLoading;

  // Running tab derived state
  const isStepByStep = activeExec?.mode === "step_by_step";
  const nextPending = stepExecs.find((s: any) => s.status === "pending");
  const allCompleted = stepExecs.length > 0 && stepExecs.every((s: any) => s.status === "completed");
  const isFailed = activeExec?.status === "failed";

  // First step type for Run tab input
  const firstStepType = localSteps[0]?.step_type as StepType | undefined;

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

          {/* 3 Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="build" className="gap-1.5 text-xs">
                <Layers className="h-3.5 w-3.5" /> Build
              </TabsTrigger>
              <TabsTrigger value="run" className="gap-1.5 text-xs">
                <Play className="h-3.5 w-3.5" /> Run
              </TabsTrigger>
              <TabsTrigger value="running" className="gap-1.5 text-xs relative">
                <Zap className="h-3.5 w-3.5" /> Running
                {executing && <span className="absolute top-0.5 right-1 h-2 w-2 rounded-full bg-[hsl(var(--status-processing))] animate-pulse" />}
              </TabsTrigger>
            </TabsList>

            {/* ═══════ BUILD TAB ═══════ */}
            <TabsContent value="build" className="space-y-4 mt-4">
              <div className="space-y-1">
                {localSteps.length > 0 && <InsertStepRow onInsert={(type) => addStep(type, 0)} />}
                {localSteps.map((step, idx) => (
                  <div key={step.id}>
                    <FullStepCard step={step} index={idx}
                      imgBlocksByCategory={imgBlocksByCategory} vidBlocksByCategory={vidBlocksByCategory}
                      onRemove={() => removeStep(idx)}
                      onUpdateConfig={(k, v) => updateStepConfig(idx, k, v)}
                      onUpdateType={(t) => updateStepType(idx, t)} />
                    {idx < localSteps.length - 1 && <InsertStepRow onInsert={(type) => addStep(type, idx + 1)} />}
                  </div>
                ))}
              </div>
              <AddStepRow onAdd={(type) => addStep(type)} />

              {localSteps.length > 0 && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handleStartRun("full_auto")} disabled={startingRun} className="gap-1.5 h-11">
                      {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Full Auto
                    </Button>
                    <Button variant="outline" onClick={() => handleStartRun("step_by_step")} disabled={startingRun} className="gap-1.5 h-11">
                      {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Step-by-Step
                    </Button>
                  </div>
                  {dirty && <p className="text-[10px] text-amber-500 text-center">Unsaved changes — will auto-save before running</p>}
                </>
              )}
            </TabsContent>

            {/* ═══════ RUN TAB ═══════ */}
            <TabsContent value="run" className="space-y-4 mt-4">
              {localSteps.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <p className="text-sm text-muted-foreground">No steps configured</p>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab("build")}>Go to Build</Button>
                </div>
              ) : (
                <>
                  {/* Flow summary */}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Flow Pipeline</Label>
                    <div className="flex items-center gap-1 flex-wrap">
                      {localSteps.map((step, idx) => {
                        const meta = STEP_TYPE_META[step.step_type as StepType];
                        const Icon = meta.icon;
                        return (
                          <div key={step.id} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px] h-6 gap-1 px-2">
                              <Icon className={cn("h-3 w-3", meta.color)} />
                              {meta.label.replace("Generation", "Gen").replace("Image ", "")}
                            </Badge>
                            {idx < localSteps.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground/40 -rotate-90" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* First-step input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Step 1 Input</Label>
                    {firstStepType === "image_generation" && (
                      <ImageSourceSlots
                        slotImages={runInput.source_image_urls || [null, null, null, null]}
                        setSlotImages={(v) => {
                          const val = typeof v === "function" ? v(runInput.source_image_urls || [null, null, null, null]) : v;
                          setRunInput((prev) => ({ ...prev, source_image_urls: val }));
                        }}
                      />
                    )}
                    {firstStepType === "video_generation" && (
                      <SeedImageUpload
                        imageUrl={runInput.seed_image_url || ""}
                        setImageUrl={(v) => setRunInput((prev) => ({ ...prev, seed_image_url: v }))}
                      />
                    )}
                    {firstStepType === "image_upscale" && (
                      <SeedImageUpload
                        imageUrl={runInput.source_image_url || ""}
                        setImageUrl={(v) => setRunInput((prev) => ({ ...prev, source_image_url: v }))}
                        label="Image to Upscale"
                      />
                    )}
                    {firstStepType === "image_overlay" && (
                      <SeedImageUpload
                        imageUrl={runInput.source_image_url || ""}
                        setImageUrl={(v) => setRunInput((prev) => ({ ...prev, source_image_url: v }))}
                        label="Base Image"
                      />
                    )}
                  </div>

                  <Separator />

                  {/* Run buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => handleStartRun("full_auto", runInput)} disabled={startingRun} className="gap-1.5 h-11">
                      {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Full Auto
                    </Button>
                    <Button variant="outline" onClick={() => handleStartRun("step_by_step", runInput)} disabled={startingRun} className="gap-1.5 h-11">
                      {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Step-by-Step
                    </Button>
                  </div>

                  {dirty && <p className="text-[10px] text-amber-500 text-center">Unsaved changes — will auto-save before running</p>}
                </>
              )}
            </TabsContent>

            {/* ═══════ RUNNING TAB ═══════ */}
            <TabsContent value="running" className="space-y-4 mt-4">
              {!activeExecId ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted-foreground">No active run</p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm" onClick={() => setActiveTab("run")}>Start a Run</Button>
                  </div>

                  {/* Run history */}
                  {pastRuns.length > 0 && (
                    <div className="space-y-2 pt-4 text-left">
                      <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Past Runs</Label>
                      {pastRuns.map((run: any) => (
                        <RunHistoryCard key={run.id} run={run}
                          onOpen={() => { setActiveExecId(run.id); }}
                          onDelete={() => deleteRun(run.id)} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Active run header */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveExecId(null)} className="text-muted-foreground hover:text-foreground">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-medium flex-1">
                      {activeExec?.mode === "full_auto" ? "Full Auto" : "Step-by-Step"} Run
                    </span>
                    <Badge variant="secondary" className={cn("text-[9px]",
                      allCompleted ? "text-[hsl(var(--status-completed))]" :
                      isFailed ? "text-[hsl(var(--status-failed))]" :
                      executing ? "text-[hsl(var(--status-processing))]" : ""
                    )}>
                      {allCompleted ? "Completed" : isFailed ? "Failed" : executing ? "Running..." : isStepByStep ? "Step-by-Step" : "Pending"}
                    </Badge>
                  </div>

                  {/* Step execution cards */}
                  {stepExecs.map((se: any, idx: number) => {
                    const stepType = se.step_type as StepType;
                    const meta = STEP_TYPE_META[stepType] || STEP_TYPE_META.image_generation;
                    const Icon = meta.icon;
                    const status = STATUS_STYLES[se.status] || STATUS_STYLES.pending;

                    return (
                      <div key={se.id}>
                        <Card className={cn("border-border/50 transition-colors",
                          se.status === "running" && "border-[hsl(var(--status-processing))]/40 shadow-sm",
                          se.status === "completed" && "border-[hsl(var(--status-completed))]/30",
                          se.status === "failed" && "border-[hsl(var(--status-failed))]/30",
                        )}>
                          <CardContent className="p-3 space-y-3">
                            <div className="flex items-center gap-2">
                              <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", status.bg)}>
                                {se.status === "running" ? <Loader2 className={cn("h-4 w-4 animate-spin", status.text)} />
                                  : se.status === "completed" ? <Check className={cn("h-4 w-4", status.text)} />
                                  : se.status === "failed" ? <X className={cn("h-4 w-4", status.text)} />
                                  : <Icon className="h-4 w-4 text-muted-foreground" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">Step {se.step_number}</p>
                                <p className={cn("text-[10px]", status.text)}>{meta.label} · {status.label}</p>
                              </div>
                              {se.status === "completed" && (
                                <button onClick={() => rerunFromStep(idx)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Artifact preview */}
                            {se.output_artifact_url && (
                              <div className="relative rounded-lg overflow-hidden bg-muted group">
                                {stepType === "video_generation" ? (
                                  <video src={se.output_artifact_url} controls className="w-full aspect-video" />
                                ) : (
                                  <img src={se.output_artifact_url} alt={`Step ${se.step_number}`} className="w-full aspect-square object-cover" />
                                )}
                                <button onClick={() => downloadFile(se.output_artifact_url, `flow-step-${se.step_number}`)}
                                  className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            )}

                            {se.error_message && (
                              <p className="text-[10px] text-[hsl(var(--status-failed))] bg-[hsl(var(--status-failed))]/5 rounded-md px-2.5 py-1.5">
                                {se.error_message}
                              </p>
                            )}
                            {se.prompt_used && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2">{se.prompt_used}</p>
                            )}
                          </CardContent>
                        </Card>
                        {idx < stepExecs.length - 1 && (
                          <div className="flex justify-center py-1">
                            <ArrowDown className="h-4 w-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Controls */}
                  {isStepByStep && nextPending && !executing && (
                    <Button onClick={runNextStep} className="w-full h-11 gap-1.5">
                      <Play className="h-4 w-4" /> Run Step {nextPending.step_number}
                    </Button>
                  )}
                  {isFailed && !executing && (
                    <Button variant="outline" onClick={() => {
                      const failedIdx = stepExecs.findIndex((s: any) => s.status === "failed");
                      if (failedIdx >= 0) rerunFromStep(failedIdx);
                    }} className="w-full h-11 gap-1.5">
                      <RotateCcw className="h-4 w-4" /> Retry Failed Step
                    </Button>
                  )}
                  {executing && (
                    <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-xs">Executing...</span>
                    </div>
                  )}
                  {allCompleted && (
                    <div className="text-center py-4">
                      <p className="text-xs text-[hsl(var(--status-completed))] font-medium">✓ Flow completed successfully</p>
                    </div>
                  )}

                  <Separator />

                  {/* Run history */}
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Run History</Label>
                    {pastRuns.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 text-center">No runs yet</p>
                    ) : (
                      pastRuns.map((run: any) => (
                        <RunHistoryCard key={run.id} run={run}
                          isActive={run.id === activeExecId}
                          onOpen={() => setActiveExecId(run.id)}
                          onDelete={() => deleteRun(run.id)} />
                      ))
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AppShell>
  );
};

/* ── Run History Card ── */
function RunHistoryCard({ run, isActive, onOpen, onDelete }: {
  run: any; isActive?: boolean; onOpen: () => void; onDelete: () => void;
}) {
  const statusMap: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
    running: { icon: Loader2, color: "text-[hsl(var(--status-processing))]", label: "Running" },
    completed: { icon: Check, color: "text-[hsl(var(--status-completed))]", label: "Completed" },
    failed: { icon: X, color: "text-[hsl(var(--status-failed))]", label: "Failed" },
  };
  const s = statusMap[run.status] || statusMap.pending;
  const Icon = s.icon;
  const date = new Date(run.created_at);
  const timeStr = date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  return (
    <Card className={cn("border-border/50 hover:border-border transition-colors cursor-pointer",
      isActive && "border-primary/50 bg-primary/5"
    )} onClick={onOpen}>
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          run.status === "completed" ? "bg-[hsl(var(--status-completed))]/10" :
          run.status === "failed" ? "bg-[hsl(var(--status-failed))]/10" :
          run.status === "running" ? "bg-[hsl(var(--status-processing))]/10" : "bg-muted"
        )}>
          <Icon className={cn("h-4 w-4", s.color, run.status === "running" && "animate-spin")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium">{run.mode === "full_auto" ? "Full Auto" : "Step-by-Step"}</p>
          <p className="text-[10px] text-muted-foreground">{timeStr}</p>
        </div>
        <Badge variant="secondary" className={cn("text-[9px] h-5", s.color)}>{s.label}</Badge>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      </CardContent>
    </Card>
  );
}

/* ── Full Step Card ── */
function FullStepCard({ step, index, imgBlocksByCategory, vidBlocksByCategory, onRemove, onUpdateConfig, onUpdateType }: {
  step: any; index: number;
  imgBlocksByCategory: Record<string, any[]>; vidBlocksByCategory: Record<string, any[]>;
  onRemove: () => void; onUpdateConfig: (key: string, value: any) => void; onUpdateType: (type: StepType) => void;
}) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const meta = STEP_TYPE_META[step.step_type as StepType];
  const Icon = meta.icon;
  const config = step.config || {};
  const setConfigPrompt = (v: string) => onUpdateConfig("prompt", v);
  const setConfigNeg = (v: string) => onUpdateConfig("negative_prompt", v);

  return (
    <Card className="border-border/50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2 p-3">
          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
            step.step_type === "image_generation" ? "bg-blue-500/10" :
            step.step_type === "video_generation" ? "bg-purple-500/10" :
            step.step_type === "image_overlay" ? "bg-orange-500/10" : "bg-emerald-500/10"
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

            {step.step_type === "image_generation" && (
              <div className="space-y-4">
                {index === 0 && (
                  <ImageSourceSlots slotImages={config.source_image_urls || [null, null, null, null]}
                    setSlotImages={(v) => {
                      const val = typeof v === "function" ? v(config.source_image_urls || [null, null, null, null]) : v;
                      onUpdateConfig("source_image_urls", val);
                    }} />
                )}
                <Separator />
                <ImagePromptSection prompt={config.prompt || ""} setPrompt={setConfigPrompt}
                  negativePrompt={config.negative_prompt || ""} setNegativePrompt={setConfigNeg}
                  blocksByCategory={imgBlocksByCategory} />
                <Separator />
                <ImageParamsSection outputSize={config.output_size || "1280*1280"} setOutputSize={(v) => onUpdateConfig("output_size", v)}
                  imageModel={config.model || "alibaba/wan-2.6/image-edit"} setImageModel={(v) => onUpdateConfig("model", v)}
                  randomSeed={config.seed === -1 || config.seed === undefined} setRandomSeed={(v) => onUpdateConfig("seed", v ? -1 : 0)}
                  seed={config.seed === -1 ? "" : String(config.seed || "")} setSeed={(v) => onUpdateConfig("seed", parseInt(v) || 0)}
                  promptExpansion={config.enable_prompt_expansion ?? true} setPromptExpansion={(v) => onUpdateConfig("enable_prompt_expansion", v)} />
              </div>
            )}

            {step.step_type === "video_generation" && (
              <div className="space-y-4">
                <VideoModelSelector videoModel={config.model || "alibaba/wan-2.6/image-to-video-flash"} setVideoModel={(v) => onUpdateConfig("model", v)} />
                <Separator />
                {index === 0 && (
                  <SeedImageUpload imageUrl={config.seed_image_url || ""} setImageUrl={(v) => onUpdateConfig("seed_image_url", v)} />
                )}
                {index === 0 && <Separator />}
                <VideoPromptSection prompt={config.prompt || ""} setPrompt={setConfigPrompt}
                  negativePrompt={config.negative_prompt || ""} setNegativePrompt={setConfigNeg}
                  blocksByCategory={vidBlocksByCategory} duration={config.duration || 5} />
                <Separator />
                <VideoParamsSection resolution={config.resolution || "720p"} setResolution={(v) => onUpdateConfig("resolution", v)}
                  shotType={config.shot_type || "single"} setShotType={(v) => onUpdateConfig("shot_type", v)}
                  duration={config.duration || 5} setDuration={(v) => onUpdateConfig("duration", v)}
                  randomSeed={config.seed === -1 || config.seed === undefined} setRandomSeed={(v) => onUpdateConfig("seed", v ? -1 : 0)}
                  seed={config.seed === -1 ? "" : String(config.seed || "")} setSeed={(v) => onUpdateConfig("seed", parseInt(v) || 0)}
                  promptExpansion={config.enable_prompt_expansion ?? true} setPromptExpansion={(v) => onUpdateConfig("enable_prompt_expansion", v)}
                  audioEnabled={config.generate_audio ?? false} setAudioEnabled={(v) => onUpdateConfig("generate_audio", v)}
                  videoModel={config.model || "alibaba/wan-2.6/image-to-video-flash"} />
              </div>
            )}

            {step.step_type === "image_upscale" && (
              <div className="space-y-4">
                {index === 0 && (
                  <SeedImageUpload imageUrl={config.source_image_url || ""} setImageUrl={(v) => onUpdateConfig("source_image_url", v)} label="Image to Upscale" />
                )}
                <UpscaleParamsSection prompt={config.prompt || "Enhance this image to higher quality and resolution with maximum detail"} setPrompt={(v) => onUpdateConfig("prompt", v)}
                  aspectRatio={config.aspect_ratio || "original"} setAspectRatio={(v) => onUpdateConfig("aspect_ratio", v)}
                  outputFormat={config.output_format || "png"} setOutputFormat={(v) => onUpdateConfig("output_format", v)}
                  resolution={config.resolution || "1k"} setResolution={(v) => onUpdateConfig("resolution", v)} />
              </div>
            )}

            {step.step_type === "image_overlay" && (
              <div className="space-y-4">
                {index === 0 && (
                  <SeedImageUpload imageUrl={config.source_image_url || ""} setImageUrl={(v) => onUpdateConfig("source_image_url", v)} label="Base Image" />
                )}
                <SeedImageUpload imageUrl={config.overlay_image_url || ""} setImageUrl={(v) => onUpdateConfig("overlay_image_url", v)} label="Overlay PNG" />
                <Separator />
                <OverlayParamsSection opacity={config.opacity ?? 100} setOpacity={(v) => onUpdateConfig("opacity", v)}
                  scale={config.scale ?? 100} setScale={(v) => onUpdateConfig("scale", v)}
                  positionX={config.position_x ?? 0} setPositionX={(v) => onUpdateConfig("position_x", v)}
                  positionY={config.position_y ?? 0} setPositionY={(v) => onUpdateConfig("position_y", v)} />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/* ── Add Step Row ── */
function AddStepRow({ onAdd }: { onAdd: (type: StepType) => void }) {
  return (
    <div className="flex gap-2">
      {(Object.keys(STEP_TYPE_META) as StepType[]).map((type) => {
        const meta = STEP_TYPE_META[type];
        return (
          <Button key={type} variant="outline" size="sm" className="flex-1 gap-1.5 text-[11px] h-10"
            onClick={() => onAdd(type)}>
            <meta.icon className={cn("h-3.5 w-3.5", meta.color)} />
            {meta.label.replace("Generation", "Gen").replace("Image ", "Img ")}
          </Button>
        );
      })}
    </div>
  );
}

/* ── Insert Step Between ── */
function InsertStepRow({ onInsert }: { onInsert: (type: StepType) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-center py-1">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors group">
          <ArrowDown className="h-3.5 w-3.5" />
          <Plus className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ) : (
        <div className="flex gap-1.5 items-center">
          {(Object.keys(STEP_TYPE_META) as StepType[]).map((type) => {
            const meta = STEP_TYPE_META[type];
            return (
              <Button key={type} variant="ghost" size="sm" className="h-7 px-2 text-[10px] gap-1"
                onClick={() => { onInsert(type); setOpen(false); }}>
                <meta.icon className={cn("h-3 w-3", meta.color)} />
                {meta.label.replace("Generation", "Gen").replace("Image ", "Img ")}
              </Button>
            );
          })}
          <button onClick={() => setOpen(false)} className="text-muted-foreground/50 hover:text-muted-foreground text-xs px-1">✕</button>
        </div>
      )}
    </div>
  );
}

export default FlowBuilderPage;
