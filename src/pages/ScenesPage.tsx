import { AppShell } from "@/components/AppShell";
import { Clapperboard } from "lucide-react";

const ScenesPage = () => {
  return (
    <AppShell title="Scenes">
      <div className="flex flex-col items-center justify-center pt-32 text-center px-4">
        <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-sm">Select a project first</p>
        <p className="text-muted-foreground/70 text-xs mt-1">Go to Projects and tap a project to view its scenes</p>
      </div>
    </AppShell>
  );
};

export default ScenesPage;
