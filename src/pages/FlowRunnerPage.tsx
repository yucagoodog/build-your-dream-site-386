import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Play, Workflow, ArrowDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageSourceSlots, SeedImageUpload } from "@/components/generation/SharedGenerationUI";

type StepType = "image_generation" | "video_generation" | "image_upscale" | "image_overlay";

const STEP_META: Record<StepType, { label: string }> = {
  image_generation: { label: "Image Gen" },
  video_generation: { label: "Video Gen" },
  image_upscale: { label: "Upscale" },
  image_overlay: { label: "Overlay" },
};

const FlowRunnerPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");
  const [startingRun, setStartingRun] = useState(false);
  const [runInput, setRunInput] = useState<{
    source_image_urls?: (string | null)[];
    seed_image_url?: string;
    source_image_url?: string;
  }>({});

  const { data: flows = [], isLoading: loadingFlows } = useQuery({
    queryKey: ["flows", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("id, name, updated_at")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!selectedFlowId && flows.length > 0) {
      setSelectedFlowId(flows[0].id);
    }
  }, [flows, selectedFlowId]);

  useEffect(() => {
    setRunInput({});
  }, [selectedFlowId]);

  const selectedFlow = useMemo(
    () => flows.find((f: any) => f.id === selectedFlowId) || null,
    [flows, selectedFlowId],
  );

  const { data: flowSteps = [], isLoading: loadingSteps } = useQuery({
    queryKey: ["flow_steps", selectedFlowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_steps")
        .select("id, step_number, step_type, config")
        .eq("flow_id", selectedFlowId)
        .eq("user_id", user!.id)
        .order("step_number");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!selectedFlowId,
  });

  const firstStepType = flowSteps[0]?.step_type as StepType | undefined;

  const handleStartRun = async (mode: "full_auto" | "step_by_step") => {
    if (!user || !selectedFlowId || flowSteps.length === 0) return;
    setStartingRun(true);

    try {
      const { data: exec, error: execErr } = await supabase
        .from("flow_executions")
        .insert({ flow_id: selectedFlowId, user_id: user.id, mode, status: "pending" } as any)
        .select()
        .single();
      if (execErr) throw execErr;

      const stepExecs = flowSteps.map((step: any, i: number) => {
        const cfg = step.config ? { ...step.config } : {};

        if (i === 0) {
          if (runInput.source_image_urls) cfg.source_image_urls = runInput.source_image_urls;
          if (runInput.seed_image_url) cfg.seed_image_url = runInput.seed_image_url;
          if (runInput.source_image_url) cfg.source_image_url = runInput.source_image_url;
        }

        const firstSource = Array.isArray(cfg.source_image_urls)
          ? cfg.source_image_urls.find((url: string | null) => Boolean(url))
          : null;
        const initialInput = cfg.source_image_url || cfg.seed_image_url || firstSource || null;

        return {
          execution_id: exec.id,
          step_id: step.id,
          user_id: user.id,
          step_number: step.step_number,
          status: "pending",
          input_artifact_url: i === 0 ? initialInput : null,
          config_snapshot: cfg,
        };
      });

      const { error: stepErr } = await supabase.from("flow_step_executions").insert(stepExecs as any);
      if (stepErr) throw stepErr;

      queryClient.invalidateQueries({ queryKey: ["all_flow_executions"] });
      queryClient.invalidateQueries({ queryKey: ["exec_step_summary"] });
      toast({ title: "Run started" });
      navigate(`/flows/${selectedFlowId}/run/${exec.id}`);
    } catch (err: any) {
      toast({ title: "Failed to start", description: err.message, variant: "destructive" });
    } finally {
      setStartingRun(false);
    }
  };

  return (
    <AppShell title="Run">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Start runs from saved flows</p>
          <Button size="sm" variant="outline" onClick={() => navigate("/executions")}>Running</Button>
        </div>

        {loadingFlows ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : flows.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-5 text-center space-y-3">
              <Workflow className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <p className="text-sm text-muted-foreground">No flows available to run</p>
              <Button variant="outline" onClick={() => navigate("/flows")}>Go to Build</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Choose Flow</Label>
              <Select value={selectedFlowId} onValueChange={setSelectedFlowId}>
                <SelectTrigger className="bg-surface-1">
                  <SelectValue placeholder="Select a flow" />
                </SelectTrigger>
                <SelectContent>
                  {flows.map((flow: any) => (
                    <SelectItem key={flow.id} value={flow.id}>{flow.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFlow && (
              <Card className="border-border/50">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">{selectedFlow.name}</p>
                    <div className="flex items-center gap-1 flex-wrap">
                      {flowSteps.map((step: any, idx: number) => {
                        const label = STEP_META[step.step_type as StepType]?.label || "Step";
                        return (
                          <div key={step.id} className="flex items-center gap-1">
                            <Badge variant="secondary" className="text-[10px] h-6 px-2">
                              {label}
                            </Badge>
                            {idx < flowSteps.length - 1 && <ArrowDown className="h-3 w-3 text-muted-foreground/40 -rotate-90" />}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {loadingSteps ? (
                    <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                  ) : flowSteps.length === 0 ? (
                    <p className="text-xs text-muted-foreground">This flow has no steps yet. Add steps in Build first.</p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Step 1 Input</Label>
                        {firstStepType === "image_generation" && (
                          <ImageSourceSlots
                            slotImages={runInput.source_image_urls || [null, null, null, null]}
                            setSlotImages={(v) => {
                              const next = typeof v === "function"
                                ? v(runInput.source_image_urls || [null, null, null, null])
                                : v;
                              setRunInput((prev) => ({ ...prev, source_image_urls: next }));
                            }}
                          />
                        )}
                        {firstStepType === "video_generation" && (
                          <SeedImageUpload
                            imageUrl={runInput.seed_image_url || ""}
                            setImageUrl={(v) => setRunInput((prev) => ({ ...prev, seed_image_url: v }))}
                          />
                        )}
                        {(firstStepType === "image_upscale" || firstStepType === "image_overlay") && (
                          <SeedImageUpload
                            imageUrl={runInput.source_image_url || ""}
                            setImageUrl={(v) => setRunInput((prev) => ({ ...prev, source_image_url: v }))}
                            label={firstStepType === "image_upscale" ? "Image to Upscale" : "Base Image"}
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button onClick={() => handleStartRun("full_auto")} disabled={startingRun} className="gap-1.5 h-11">
                          {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Full Auto
                        </Button>
                        <Button variant="outline" onClick={() => handleStartRun("step_by_step")} disabled={startingRun} className="gap-1.5 h-11">
                          {startingRun ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Step-by-Step
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default FlowRunnerPage;
