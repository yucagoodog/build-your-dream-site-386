import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePromptBlockPrefs } from "@/hooks/use-prompt-block-prefs";

const CATEGORY_LABELS: Record<string, string> = {
  realism: "Realism Levels",
  identity: "Identity Preserve",
  face_swap: "Face/Body Swap",
  motion: "Motion Realism",
  negative: "Negatives",
  template: "Templates",
};

function formatCategoryLabel(slug: string): string {
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface QuickPromptPanelProps {
  onInsert: (text: string) => void;
}

export function QuickPromptPanel({ onInsert }: QuickPromptPanelProps) {
  const { user } = useAuth();
  const { isBlockHidden, isCategoryHidden, applyPrefs } = usePromptBlockPrefs();
  const [open, setOpen] = useState(false);

  const { data: blocks = [] } = useQuery({
    queryKey: ["all_prompt_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("prompt_blocks").select("*").order("sort_order");
      return data || [];
    },
    enabled: !!user,
  });

  // Group by category, filter hidden
  const visibleBlocks = blocks.filter((b: any) => !isBlockHidden(b.id) && !isCategoryHidden(b.category));
  const categories = [...new Set(visibleBlocks.map((b: any) => b.category))];
  const blocksByCategory: Record<string, any[]> = {};
  visibleBlocks.forEach((b: any) => {
    if (!blocksByCategory[b.category]) blocksByCategory[b.category] = [];
    blocksByCategory[b.category].push(b);
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <BookOpen className="h-3 w-3" />
          Prompts
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-sm">Prompt Library</SheetTitle>
          <p className="text-[10px] text-muted-foreground">Tap any block to insert its text into your prompt.</p>
        </SheetHeader>
        <div className="overflow-y-auto max-h-[calc(100vh-80px)] px-4 pb-6 space-y-4">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                {formatCategoryLabel(cat)}
              </p>
              <div className="space-y-1">
                {blocksByCategory[cat].map((block: any) => (
                  <button
                    key={block.id}
                    onClick={() => { onInsert(block.value); }}
                    className="w-full text-left rounded-lg bg-surface-1 hover:bg-surface-2 active:bg-surface-3 px-3 py-2.5 transition-colors group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground">{block.label}</span>
                      {!block.is_builtin && <Badge variant="outline" className="text-[8px] h-4 px-1">custom</Badge>}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{block.value}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No visible prompt blocks.</p>
              <p className="text-[10px] text-muted-foreground mt-1">Add blocks in Settings → Prompt Library.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
