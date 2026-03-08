import { Sparkles, Library, Settings, Workflow, Play, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { path: "/", label: "Create", icon: Sparkles },
  { path: "/library", label: "Library", icon: Library },
  { path: "/flows", label: "Build", icon: Workflow },
  { path: "/runner", label: "Run", icon: Play },
  { path: "/executions", label: "Running", icon: Activity },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
      <div className="mx-auto flex max-w-2xl items-center justify-around px-1">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-1.5 py-2.5 text-[10px] font-medium transition-colors min-w-[48px]",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-primary" />
              )}
              <tab.icon className={cn("h-[18px] w-[18px]", active && "stroke-[2.5px]")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
