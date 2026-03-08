import { History, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PromptHistoryEntry } from "@/hooks/use-prompt-history";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export function PromptHistoryDropdown({
  history,
  onSelect,
  onClear,
  currentMode,
}: {
  history: PromptHistoryEntry[];
  onSelect: (entry: PromptHistoryEntry) => void;
  onClear: () => void;
  currentMode: string;
}) {
  const filtered = history.filter((h) => h.mode === currentMode);

  if (filtered.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <History className="h-3 w-3" />
          Recent
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium">Recent Prompts</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-muted-foreground" onClick={onClear}>
            <Trash2 className="h-3 w-3 mr-1" /> Clear
          </Button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((entry, i) => (
            <button
              key={i}
              onClick={() => onSelect(entry)}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-0"
            >
              <p className="text-[11px] text-foreground line-clamp-2">{entry.prompt}</p>
              <span className="text-[9px] text-muted-foreground mt-0.5 block">
                {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
