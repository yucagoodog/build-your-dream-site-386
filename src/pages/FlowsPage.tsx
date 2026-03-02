import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus, Loader2, Workflow, Copy, Trash2, Play, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const FlowsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: flows = [], isLoading } = useQuery({
    queryKey: ["flows", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flows")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Get step counts per flow
  const { data: stepCounts = {} } = useQuery({
    queryKey: ["flow_step_counts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_steps")
        .select("flow_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        counts[s.flow_id] = (counts[s.flow_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!user,
  });

  // Get last execution per flow
  const { data: lastExecs = {} } = useQuery({
    queryKey: ["flow_last_execs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("flow_executions")
        .select("flow_id, status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((e: any) => {
        if (!map[e.flow_id]) map[e.flow_id] = e;
      });
      return map;
    },
    enabled: !!user,
  });

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("flows")
      .insert({ name: newName.trim(), user_id: user.id } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      setCreateOpen(false);
      setNewName("");
      navigate(`/flows/${data.id}`);
    }
    setCreating(false);
  };

  const handleDuplicate = async (flowId: string, flowName: string) => {
    if (!user) return;
    // Create new flow
    const { data: newFlow, error: flowErr } = await supabase
      .from("flows")
      .insert({ name: `${flowName} (Copy)`, user_id: user.id } as any)
      .select()
      .single();
    if (flowErr || !newFlow) {
      toast({ title: "Failed", description: flowErr?.message, variant: "destructive" });
      return;
    }
    // Copy steps
    const { data: steps } = await supabase
      .from("flow_steps")
      .select("*")
      .eq("flow_id", flowId)
      .order("step_number");
    if (steps && steps.length > 0) {
      const newSteps = steps.map((s: any) => ({
        flow_id: newFlow.id,
        user_id: user.id,
        step_number: s.step_number,
        step_type: s.step_type,
        config: s.config,
      }));
      await supabase.from("flow_steps").insert(newSteps as any);
    }
    queryClient.invalidateQueries({ queryKey: ["flows"] });
    queryClient.invalidateQueries({ queryKey: ["flow_step_counts"] });
    toast({ title: "Flow duplicated" });
  };

  const handleDelete = async (flowId: string) => {
    const { error } = await supabase.from("flows").delete().eq("id", flowId);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else {
      queryClient.invalidateQueries({ queryKey: ["flows"] });
      toast({ title: "Flow deleted" });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "completed": return "text-[hsl(var(--status-completed))]";
      case "failed": return "text-[hsl(var(--status-failed))]";
      case "running": return "text-[hsl(var(--status-processing))]";
      default: return "text-muted-foreground";
    }
  };

  return (
    <AppShell title="Flows">
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Chain generation steps into reusable flows</p>
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> New Flow
          </Button>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : flows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Workflow className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No flows yet</p>
            <p className="text-xs text-muted-foreground/60">Create your first flow to chain generation steps</p>
          </div>
        ) : (
          <div className="space-y-2">
            {flows.map((flow: any) => {
              const count = stepCounts[flow.id] || 0;
              const lastExec = lastExecs[flow.id];
              return (
                <Card key={flow.id} className="border-border/50 hover:border-border transition-colors cursor-pointer group"
                  onClick={() => navigate(`/flows/${flow.id}`)}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Workflow className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{flow.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{count} step{count !== 1 ? "s" : ""}</span>
                        {lastExec && (
                          <>
                            <span className="text-[10px] text-muted-foreground">·</span>
                            <span className={cn("text-[10px] capitalize", statusColor(lastExec.status))}>
                              {lastExec.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(lastExec.created_at), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(flow.id, flow.name); }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(flow.id); }}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">New Flow</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Flow name..." value={newName} onChange={(e) => setNewName(e.target.value)}
              className="bg-surface-1" autoFocus onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <Button onClick={handleCreate} disabled={creating || !newName.trim()} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create Flow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default FlowsPage;
