import { AppShell } from "@/components/AppShell";
import { FAB } from "@/components/FAB";
import { StatusDot } from "@/components/StatusDot";
import { Card, CardContent } from "@/components/ui/card";
import { Clapperboard, DollarSign } from "lucide-react";

// Mock data for now — will be replaced with Supabase queries
const mockProjects = [
  { id: "1", name: "Product Launch Video", status: "draft" as const, sceneCount: 5, cost: 0, updatedAt: "2 hours ago" },
  { id: "2", name: "Brand Story Series", status: "processing" as const, sceneCount: 12, cost: 4.80, updatedAt: "1 day ago" },
  { id: "3", name: "Tutorial Walkthrough", status: "completed" as const, sceneCount: 8, cost: 3.20, updatedAt: "3 days ago" },
];

const ProjectsPage = () => {
  return (
    <AppShell title="Projects">
      <div className="p-4 space-y-3">
        {mockProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-32 text-center">
            <Clapperboard className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground text-sm">No projects yet</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Tap + to create your first project</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {mockProjects.map((project) => (
              <Card
                key={project.id}
                className="tap-target cursor-pointer border-border/50 bg-card transition-colors hover:border-primary/30 active:bg-surface-1"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm leading-tight pr-2">{project.name}</h3>
                    <StatusDot status={project.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clapperboard className="h-3 w-3" />
                      {project.sceneCount} scenes
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ${project.cost.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-2">{project.updatedAt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <FAB onClick={() => {}} label="New Project" />
    </AppShell>
  );
};

export default ProjectsPage;
