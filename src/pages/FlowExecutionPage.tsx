import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Play, Pause, RotateCcw, Loader2, Check, X,
  ImageIcon, Clapperboard, ZoomIn, ArrowDown, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";

const STEP_ICONS: Record<string, any> = {
  image_generation: ImageIcon,
  video_generation: Clapperboard,
  image_upscale: ZoomIn,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-muted", text: "text-muted-foreground", label: "Pending" },
  running: { bg: "bg-[hsl(var(--status-processing))]/10", text: "text-[hsl(var(--status-processing))]", label: "Running" },
  completed: { bg: "bg-[hsl(var(--status-completed))]/10", text: "text-[hsl(var(--status-completed))]", label: "Done" },
  failed: { bg: "bg-[hsl(var(--status-failed))]/10", text: "text-[hsl(var(--status-failed))]", label: "Failed" },
};

const FlowExecutionPage = () => {
  const { flowId, execId } = useParams<{ flowId: string; execId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [executing, setExecuting] = useState(false);

  // Load execution
  const { data: execution, refetch: refetchExec } = useQuery({
    queryKey: ["flow_execution", execId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_executions").select("*").eq("id", execId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!execId,
  });

  // Load step executions with step_type from flow_steps
  const { data: stepExecs = [], refetch: refetchSteps } = useQuery({
    queryKey: ["flow_step_executions", execId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_step_executions")
        .select("*, flow_steps!flow_step_executions_step_id_fkey(step_type)")
        .eq("execution_id", execId!)
        .order("step_number");
      if (error) throw error;
      // Flatten step_type from joined data
      return (data || []).map((se: any) => ({
        ...se,
        step_type: se.flow_steps?.step_type || null,
      }));
    },
    enabled: !!execId,
  });

  // Load flow name
  const { data: flow } = useQuery({
    queryKey: ["flow", flowId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flows").select("name").eq("id", flowId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!flowId,
  });

  // Cleanup polling
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const refetchAll = useCallback(() => {
    refetchExec();
    refetchSteps();
  }, [refetchExec, refetchSteps]);

  // Execute a single step
  const executeStep = useCallback(async (stepExec: any): Promise<boolean> => {
    if (!user) return false;
    const config = stepExec.config_snapshot || {};
    const inputUrl = stepExec.input_artifact_url;

    // Mark step as running
    await supabase.from("flow_step_executions")
      .update({ status: "running", started_at: new Date().toISOString() } as any)
      .eq("id", stepExec.id);
    await supabase.from("flow_executions")
      .update({ current_step: stepExec.step_number, status: "running" } as any)
      .eq("id", execId);
    refetchAll();

    try {
      let resultUrl: string | null = null;

      if (stepExec.step_type === "image_generation" || (config.model && !config.target_resolution && !config.resolution)) {
        // Determine step type from config
        const imageUrls = inputUrl ? [inputUrl] : [];
        const { data, error } = await supabase.functions.invoke("generate-image", {
          body: {
            action: "start",
            image_urls: imageUrls,
            prompt: config.prompt || "",
            negative_prompt: config.negative_prompt || "",
            output_size: config.output_size || "1280*1280",
            seed: config.seed ?? -1,
            enable_prompt_expansion: config.enable_prompt_expansion ?? true,
            model: config.model || "alibaba/wan-2.6/image-edit",
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        const editId = data?.edit?.id;
        if (!editId) throw new Error("No edit ID returned");

        // Poll for completion
        resultUrl = await pollForResult("generate-image", { action: "poll", edit_id: editId }, "output_image_url");

      } else if (stepExec.step_type === "video_generation" || config.resolution) {
        const { data, error } = await supabase.functions.invoke("generate-video", {
          body: {
            action: "start",
            prompt: config.prompt || "",
            negative_prompt: config.negative_prompt || "",
            seed_image_url: inputUrl || "",
            resolution: config.resolution || "720p",
            duration: config.duration || 5,
            shot_type: config.shot_type || "single",
            seed: config.seed ?? -1,
            enable_prompt_expansion: config.enable_prompt_expansion ?? true,
            generate_audio: config.generate_audio ?? false,
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        const genId = data?.generation?.id;
        if (!genId) throw new Error("No generation ID returned");

        resultUrl = await pollForResult("generate-video", { action: "poll", generation_id: genId }, "video_url");

      } else if (stepExec.step_type === "image_upscale" || config.target_resolution) {
        if (!inputUrl) throw new Error("No input image for upscale");
        const { data, error } = await supabase.functions.invoke("upscale-image", {
          body: {
            action: "start",
            image_url: inputUrl,
            target_resolution: config.target_resolution || "4k",
            creativity: config.creativity ?? 2,
          },
        });
        if (error || data?.error) throw new Error(data?.error || error?.message);
        const editId = data?.edit?.id;
        if (!editId) throw new Error("No edit ID returned");

        resultUrl = await pollForResult("generate-image", { action: "poll", edit_id: editId }, "output_image_url");
      }

      if (!resultUrl) throw new Error("No output artifact produced");

      // Mark completed
      await supabase.from("flow_step_executions")
        .update({
          status: "completed",
          output_artifact_url: resultUrl,
          prompt_used: config.prompt || "",
          completed_at: new Date().toISOString(),
        } as any)
        .eq("id", stepExec.id);
      refetchAll();
      return true;

    } catch (err: any) {
      await supabase.from("flow_step_executions")
        .update({ status: "failed", error_message: err.message, completed_at: new Date().toISOString() } as any)
        .eq("id", stepExec.id);
      await supabase.from("flow_executions")
        .update({ status: "failed" } as any)
        .eq("id", execId);
      refetchAll();
      return false;
    }
  }, [user, execId, refetchAll]);

  // Poll helper
  const pollForResult = (fn: string, body: any, urlField: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 120; // 8 minutes max
      const interval = setInterval(async () => {
        attempts++;
        try {
          const { data } = await supabase.functions.invoke(fn, { body });
          if (data?.status === "completed") {
            clearInterval(interval);
            // Get the URL from the edit/generation record
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
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 4000);
    });
  };

  // Run full auto
  const runFullAuto = useCallback(async () => {
    setExecuting(true);
    for (let i = 0; i < stepExecs.length; i++) {
      const se = stepExecs[i];
      if (se.status === "completed") continue;

      // Wire input from previous step — read fresh from DB to avoid stale closure
      let inputUrl: string | null = null;
      if (i > 0) {
        const { data: prevStep } = await supabase
          .from("flow_step_executions")
          .select("output_artifact_url")
          .eq("id", stepExecs[i - 1].id)
          .single();
        inputUrl = prevStep?.output_artifact_url || null;
        if (!inputUrl) {
          toast({ title: "Missing input", description: `Step ${i} has no output to chain`, variant: "destructive" });
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

    // Check if all completed
    const { data: updated } = await supabase
      .from("flow_step_executions").select("status").eq("execution_id", execId!);
    const allDone = updated?.every((s: any) => s.status === "completed");
    if (allDone) {
      await supabase.from("flow_executions")
        .update({ status: "completed", completed_at: new Date().toISOString() } as any)
        .eq("id", execId);
    }
    refetchAll();
    setExecuting(false);
  }, [stepExecs, executeStep, execId, refetchAll]);

  // Run single step (step-by-step mode)
  const runNextStep = useCallback(async () => {
    const nextStep = stepExecs.find((s: any) => s.status === "pending");
    if (!nextStep) return;
    setExecuting(true);

    const idx = stepExecs.indexOf(nextStep);

    // Read fresh from DB to avoid stale closure data
    let inputUrl: string | null = null;
    if (idx > 0) {
      const { data: prevStep } = await supabase
        .from("flow_step_executions")
        .select("output_artifact_url")
        .eq("id", stepExecs[idx - 1].id)
        .single();
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
      // Check if all done
      const remaining = stepExecs.filter((s: any) => s.id !== nextStep.id && s.status === "pending");
      if (remaining.length === 0) {
        await supabase.from("flow_executions")
          .update({ status: "completed", completed_at: new Date().toISOString() } as any)
          .eq("id", execId);
      }
    }
    refetchAll();
    setExecuting(false);
  }, [stepExecs, executeStep, execId, refetchAll]);

  // Re-run from step
  const rerunFromStep = useCallback(async (fromIndex: number) => {
    // Reset this step and all subsequent
    for (let i = fromIndex; i < stepExecs.length; i++) {
      await supabase.from("flow_step_executions")
        .update({ status: "pending", output_artifact_url: null, input_artifact_url: null, error_message: null, started_at: null, completed_at: null } as any)
        .eq("id", stepExecs[i].id);
    }
    await supabase.from("flow_executions")
      .update({ status: "pending", current_step: fromIndex + 1 } as any)
      .eq("id", execId);
    refetchAll();
    toast({ title: `Reset from step ${fromIndex + 1}` });
  }, [stepExecs, execId, refetchAll]);

  // Auto-start on mount if pending
  useEffect(() => {
    if (execution?.status === "pending" && stepExecs.length > 0 && !executing) {
      if (execution.mode === "full_auto") {
        runFullAuto();
      }
    }
  }, [execution?.status, stepExecs.length]);

  const isStepByStep = execution?.mode === "step_by_step";
  const nextPending = stepExecs.find((s: any) => s.status === "pending");
  const allCompleted = stepExecs.length > 0 && stepExecs.every((s: any) => s.status === "completed");
  const isFailed = execution?.status === "failed";

  return (
    <AppShell title={flow?.name || "Flow Run"}
      headerLeft={
        <button onClick={() => navigate("/executions")} className="h-10 w-10 flex items-center justify-center rounded-lg active:bg-foreground/10 -ml-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
      headerRight={
        <Badge variant="secondary" className={cn("text-[10px]",
          allCompleted ? "bg-[hsl(var(--status-completed))]/10 text-[hsl(var(--status-completed))]" :
          isFailed ? "bg-[hsl(var(--status-failed))]/10 text-[hsl(var(--status-failed))]" :
          executing ? "bg-[hsl(var(--status-processing))]/10 text-[hsl(var(--status-processing))]" : ""
        )}>
          {allCompleted ? "Completed" : isFailed ? "Failed" : executing ? "Running..." : isStepByStep ? "Step-by-Step" : "Pending"}
        </Badge>
      }
    >
      <div className="p-4 max-w-xl mx-auto space-y-3">
        {/* Step cards */}
        {stepExecs.map((se: any, idx: number) => {
          const Icon = STEP_ICONS[se.config_snapshot?.resolution ? "video_generation" : se.config_snapshot?.target_resolution ? "image_upscale" : "image_generation"] || ImageIcon;
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
                      {se.status === "running" ? (
                        <Loader2 className={cn("h-4 w-4 animate-spin", status.text)} />
                      ) : se.status === "completed" ? (
                        <Check className={cn("h-4 w-4", status.text)} />
                      ) : se.status === "failed" ? (
                        <X className={cn("h-4 w-4", status.text)} />
                      ) : (
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Step {se.step_number}</p>
                      <p className={cn("text-[10px]", status.text)}>{status.label}</p>
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
                      {se.config_snapshot?.resolution || se.config_snapshot?.generate_audio !== undefined ? (
                        <video src={se.output_artifact_url} controls className="w-full aspect-video" />
                      ) : (
                        <img src={se.output_artifact_url} alt={`Step ${se.step_number} output`} className="w-full aspect-square object-cover" />
                      )}
                      <button onClick={() => downloadFile(se.output_artifact_url, `flow-step-${se.step_number}`)}
                        className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Error */}
                  {se.error_message && (
                    <p className="text-[10px] text-[hsl(var(--status-failed))] bg-[hsl(var(--status-failed))]/5 rounded-md px-2.5 py-1.5">
                      {se.error_message}
                    </p>
                  )}

                  {/* Prompt used */}
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
      </div>
    </AppShell>
  );
};

export default FlowExecutionPage;
