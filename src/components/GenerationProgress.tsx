import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, AlertCircle, Zap } from "lucide-react";

type Stage = "idle" | "queued" | "processing" | "completed" | "failed";

const STAGE_META: Record<Stage, { label: string; icon: any; color: string }> = {
  idle: { label: "Ready", icon: Zap, color: "text-muted-foreground" },
  queued: { label: "Queued", icon: Clock, color: "text-[hsl(var(--status-queued))]" },
  processing: { label: "Processing", icon: Loader2, color: "text-[hsl(var(--status-processing))]" },
  completed: { label: "Complete", icon: CheckCircle2, color: "text-[hsl(var(--status-completed))]" },
  failed: { label: "Failed", icon: AlertCircle, color: "text-[hsl(var(--status-failed))]" },
};

const STAGES: Stage[] = ["queued", "processing", "completed"];

export function GenerationProgress({ status, className }: { status: Stage; className?: string }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (status === "queued" || status === "processing") {
      if (!startRef.current) startRef.current = Date.now();
      const timer = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current!) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
    if (status === "completed" || status === "failed") {
      // Keep elapsed frozen
    }
    if (status === "idle") {
      startRef.current = null;
      setElapsed(0);
    }
  }, [status]);

  if (status === "idle") return null;

  const stageIndex = STAGES.indexOf(status === "failed" ? "processing" : status);
  const progressPercent = status === "completed" ? 100 : status === "failed" ? stageIndex * 33 : ((stageIndex + 0.5) / STAGES.length) * 100;

  const meta = STAGE_META[status];
  const Icon = meta.icon;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${String(sec).padStart(2, "0")}` : `${sec}s`;
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700 ease-out",
            status === "completed" ? "bg-[hsl(var(--status-completed))]" :
            status === "failed" ? "bg-[hsl(var(--status-failed))]" :
            "bg-primary"
          )}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5", meta.color, status === "processing" && "animate-spin")} />
          <span className={cn("text-[11px] font-medium", meta.color)}>{meta.label}</span>
        </div>
        {elapsed > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">{formatTime(elapsed)}</span>
        )}
      </div>

      {/* Stage dots */}
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const isActive = STAGES.indexOf(status === "failed" ? "processing" : status) >= i;
          const isCurrent = status === s;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "h-1.5 w-1.5 rounded-full transition-colors",
                isActive ? (status === "failed" && isCurrent ? "bg-[hsl(var(--status-failed))]" : "bg-primary") : "bg-muted-foreground/20"
              )} />
              <span className={cn(
                "text-[9px]",
                isActive ? "text-foreground" : "text-muted-foreground/40"
              )}>
                {s === "queued" ? "Queued" : s === "processing" ? "Working" : "Done"}
              </span>
              {i < STAGES.length - 1 && <div className={cn("flex-1 h-px", isActive ? "bg-primary/40" : "bg-muted-foreground/10")} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
