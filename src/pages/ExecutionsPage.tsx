import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Workflow, Play, Check, X, Clock, ArrowDown, Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const STATUS_META: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pending" },
  running: { icon: Play, color: "text-[hsl(var(--status-processing))]", label: "Running" },
  completed: { icon: Check, color: "text-[hsl(var(--status-completed))]", label: "Completed" },
  failed: { icon: X, color: "text-[hsl(var(--status-failed))]", label: "Failed" },
};

const ExecutionsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load all executions with flow names
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ["all_flow_executions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_executions")
        .select("*, flows(name)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 10_000, // poll for running flows
  });

  // Load step counts per execution
  const { data: stepData = {} } = useQuery({
    queryKey: ["exec_step_summary", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_step_executions")
        .select("execution_id, status, output_artifact_url")
        .eq("user_id", user!.id);
      if (error) throw error;
      const map: Record<string, { total: number; completed: number; failed: number; lastArtifact: string | null }> = {};
      (data || []).forEach((s: any) => {
        if (!map[s.execution_id]) map[s.execution_id] = { total: 0, completed: 0, failed: 0, lastArtifact: null };
        map[s.execution_id].total++;
        if (s.status === "completed") {
          map[s.execution_id].completed++;
          if (s.output_artifact_url) map[s.execution_id].lastArtifact = s.output_artifact_url;
        }
        if (s.status === "failed") map[s.execution_id].failed++;
      });
      return map;
    },
    enabled: !!user,
    refetchInterval: 10_000,
  });

  const runningCount = executions.filter((e: any) => e.status === "running").length;

  return (
    <AppShell title="Runs">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Flow execution history
            {runningCount > 0 && (
              <span className="ml-2 text-[hsl(var(--status-processing))]">
                · {runningCount} running
              </span>
            )}
          </p>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : executions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Play className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No runs yet</p>
            <p className="text-xs text-muted-foreground/60">Run a flow from the Flow Builder to see results here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec: any) => {
              const meta = STATUS_META[exec.status] || STATUS_META.pending;
              const StatusIcon = meta.icon;
              const steps = stepData[exec.id];
              const flowName = exec.flows?.name || "Untitled Flow";

              return (
                <Card key={exec.id}
                  className={cn(
                    "border-border/50 hover:border-border transition-colors cursor-pointer group",
                    exec.status === "running" && "border-[hsl(var(--status-processing))]/40"
                  )}
                  onClick={() => navigate(`/flows/${exec.flow_id}/run/${exec.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      "h-10 w-10 rounded-lg flex items-center justify-center shrink-0",
                      exec.status === "running" ? "bg-[hsl(var(--status-processing))]/10" :
                      exec.status === "completed" ? "bg-[hsl(var(--status-completed))]/10" :
                      exec.status === "failed" ? "bg-[hsl(var(--status-failed))]/10" : "bg-muted"
                    )}>
                      {exec.status === "running" ? (
                        <Loader2 className={cn("h-5 w-5 animate-spin", meta.color)} />
                      ) : (
                        <StatusIcon className={cn("h-5 w-5", meta.color)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{flowName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className={cn("text-[9px] h-4 px-1.5", meta.color)}>
                          {meta.label}
                        </Badge>
                        {steps && (
                          <span className="text-[10px] text-muted-foreground">
                            {steps.completed}/{steps.total} steps
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(exec.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-5 px-1.5 shrink-0 capitalize">
                      {exec.mode === "full_auto" ? "Auto" : "Manual"}
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default ExecutionsPage;
