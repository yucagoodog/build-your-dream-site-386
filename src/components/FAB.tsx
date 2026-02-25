import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FABProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FAB({ onClick, label = "Add", className }: FABProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform active:scale-95",
        className
      )}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
