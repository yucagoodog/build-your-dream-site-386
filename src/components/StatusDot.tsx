import { cn } from "@/lib/utils";

type Status = "draft" | "queued" | "processing" | "completed" | "failed";

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-status-draft" },
  queued: { label: "Queued", className: "bg-status-queued" },
  processing: { label: "Processing", className: "bg-status-processing animate-pulse" },
  completed: { label: "Completed", className: "bg-status-completed" },
  failed: { label: "Failed", className: "bg-status-failed" },
};

interface StatusDotProps {
  status: Status;
  showLabel?: boolean;
  className?: string;
}

export function StatusDot({ status, showLabel, className }: StatusDotProps) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", config.className)} />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
      )}
    </span>
  );
}
