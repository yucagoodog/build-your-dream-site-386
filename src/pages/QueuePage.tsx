import { AppShell } from "@/components/AppShell";
import { ListOrdered } from "lucide-react";

const QueuePage = () => {
  return (
    <AppShell title="Queue">
      <div className="flex flex-col items-center justify-center pt-32 text-center px-4">
        <ListOrdered className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-sm">No active generations</p>
        <p className="text-muted-foreground/70 text-xs mt-1">Queued and in-progress videos will appear here</p>
      </div>
    </AppShell>
  );
};

export default QueuePage;
