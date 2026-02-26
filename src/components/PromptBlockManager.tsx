import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, ChevronDown, Eye, EyeOff,
  Loader2, Save, ArrowUp, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_LABELS: Record<string, string> = {
  img_realism: "Realism",
  img_identity: "Identity Preserve",
  img_face_swap: "Face Swap",
  img_lighting: "Lighting",
  img_scene: "Scene Edits",
  img_style: "Style & Film",
  img_enhance: "Enhancement",
  img_skin: "Skin Quality",
  img_hair: "Hair Quality",
  img_eyes: "Eye Quality",
  img_fabric: "Fabric & Clothing",
  img_camera: "Camera Presets",
  img_optics: "Optical Physics",
  img_lighting_q: "Lighting Quality",
  img_environment: "Environment & Scene",
  img_product: "Product & Object",
  img_post: "Post-Processing",
  img_negative: "Image Negatives",
  shot_type: "Shot Setup",
  camera: "Camera Movement",
  motion: "Subject Motion",
  style: "Style & Mood",
  identity: "Identity Preserve",
  multi_char: "Multi-Character",
  multi_shot: "Multi-Shot",
  super_prompt: "Super Prompt",
  negative: "Video Negatives",
  template: "Templates",
};

interface LocalBlockPref {
  hidden: boolean;
  custom_sort_order: number | null;
}

interface LocalCatPref {
  hidden: boolean;
  custom_sort_order: number;
}

export function PromptBlockManager({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [pipeline, setPipeline] = useState<"image" | "video">("image");
  const [localBlockPrefs, setLocalBlockPrefs] = useState<Record<string, LocalBlockPref>>({});
  const [localCatPrefs, setLocalCatPrefs] = useState<Record<string, LocalCatPref>>({});
  const [dirty, setDirty] = useState(false);

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["all_prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompt_blocks").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: blockPrefs = [], isLoading: blockPrefsLoading } = useQuery({
    queryKey: ["user_prompt_block_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_prompt_block_prefs").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: catPrefs = [], isLoading: catPrefsLoading } = useQuery({
    queryKey: ["user_prompt_category_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_prompt_category_prefs").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Init local state from DB
  useEffect(() => {
    if (blockPrefs.length > 0) {
      const map: Record<string, LocalBlockPref> = {};
      blockPrefs.forEach((p: any) => {
        map[p.block_id] = { hidden: p.hidden, custom_sort_order: p.custom_sort_order };
      });
      setLocalBlockPrefs(map);
    }
  }, [blockPrefs]);

  useEffect(() => {
    if (catPrefs.length > 0) {
      const map: Record<string, LocalCatPref> = {};
      catPrefs.forEach((p: any) => {
        map[p.category] = { hidden: p.hidden, custom_sort_order: p.custom_sort_order ?? 0 };
      });
      setLocalCatPrefs(map);
    }
  }, [catPrefs]);

  const isImageCategory = (cat: string) => cat.startsWith("img_");

  const filteredBlocks = blocks.filter((b: any) =>
    pipeline === "image" ? isImageCategory(b.category) : !isImageCategory(b.category)
  );

  // Get unique categories in order
  const allCategories = [...new Set(filteredBlocks.map((b: any) => b.category))];

  // Sort categories by custom order
  const sortedCategories = [...allCategories].sort((a, b) => {
    const aOrder = localCatPrefs[a]?.custom_sort_order ?? allCategories.indexOf(a);
    const bOrder = localCatPrefs[b]?.custom_sort_order ?? allCategories.indexOf(b);
    return aOrder - bOrder;
  });

  // Group blocks by category
  const blocksByCategory: Record<string, any[]> = {};
  filteredBlocks.forEach((block: any) => {
    if (!blocksByCategory[block.category]) blocksByCategory[block.category] = [];
    blocksByCategory[block.category].push(block);
  });

  // Sort blocks within categories
  Object.keys(blocksByCategory).forEach((cat) => {
    blocksByCategory[cat].sort((a: any, b: any) => {
      const aSort = localBlockPrefs[a.id]?.custom_sort_order ?? a.sort_order;
      const bSort = localBlockPrefs[b.id]?.custom_sort_order ?? b.sort_order;
      return aSort - bSort;
    });
  });

  const isBlockHidden = (blockId: string) => localBlockPrefs[blockId]?.hidden ?? false;
  const isCatHidden = (cat: string) => localCatPrefs[cat]?.hidden ?? false;

  const toggleBlockHidden = (blockId: string) => {
    setLocalBlockPrefs((prev) => ({
      ...prev,
      [blockId]: { hidden: !(prev[blockId]?.hidden ?? false), custom_sort_order: prev[blockId]?.custom_sort_order ?? null },
    }));
    setDirty(true);
  };

  const toggleCatHidden = (cat: string) => {
    setLocalCatPrefs((prev) => ({
      ...prev,
      [cat]: { hidden: !(prev[cat]?.hidden ?? false), custom_sort_order: prev[cat]?.custom_sort_order ?? sortedCategories.indexOf(cat) },
    }));
    setDirty(true);
  };

  const moveCat = (cat: string, direction: "up" | "down") => {
    const idx = sortedCategories.indexOf(cat);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= sortedCategories.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;

    const newPrefs = { ...localCatPrefs };
    sortedCategories.forEach((c, i) => {
      let newOrder = i;
      if (i === idx) newOrder = swapIdx;
      else if (i === swapIdx) newOrder = idx;
      newPrefs[c] = { hidden: newPrefs[c]?.hidden ?? false, custom_sort_order: newOrder };
    });
    setLocalCatPrefs(newPrefs);
    setDirty(true);
  };

  const moveBlock = (category: string, blockId: string, direction: "up" | "down") => {
    const catBlocks = [...blocksByCategory[category]];
    const idx = catBlocks.findIndex((b: any) => b.id === blockId);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= catBlocks.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;

    const newPrefs = { ...localBlockPrefs };
    catBlocks.forEach((b: any, i: number) => {
      let newOrder = i;
      if (i === idx) newOrder = swapIdx;
      else if (i === swapIdx) newOrder = idx;
      newPrefs[b.id] = { hidden: newPrefs[b.id]?.hidden ?? false, custom_sort_order: newOrder };
    });
    setLocalBlockPrefs(newPrefs);
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Save block prefs
      const blockUpserts = Object.entries(localBlockPrefs).map(([block_id, pref]) => ({
        user_id: user.id, block_id, hidden: pref.hidden, custom_sort_order: pref.custom_sort_order,
      }));
      if (blockUpserts.length > 0) {
        const { error } = await supabase.from("user_prompt_block_prefs").upsert(blockUpserts, { onConflict: "user_id,block_id" });
        if (error) throw error;
      }

      // Save category prefs
      const catUpserts = Object.entries(localCatPrefs).map(([category, pref]) => ({
        user_id: user.id, category, hidden: pref.hidden, custom_sort_order: pref.custom_sort_order,
      }));
      if (catUpserts.length > 0) {
        const { error } = await supabase.from("user_prompt_category_prefs").upsert(catUpserts, { onConflict: "user_id,category" });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["user_prompt_block_prefs"] });
      queryClient.invalidateQueries({ queryKey: ["user_prompt_category_prefs"] });
      queryClient.invalidateQueries({ queryKey: ["img_prompt_blocks"] });
      queryClient.invalidateQueries({ queryKey: ["prompt_blocks"] });
      toast({ title: "Prompt preferences saved" });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, localBlockPrefs, localCatPrefs, queryClient]);

  const loading = blocksLoading || blockPrefsLoading || catPrefsLoading;
  const hiddenCats = Object.values(localCatPrefs).filter((p) => p.hidden).length;
  const hiddenBlocks = Object.values(localBlockPrefs).filter((p) => p.hidden).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">Prompt Library</h2>
          <p className="text-[10px] text-muted-foreground">
            {hiddenCats} groups hidden · {hiddenBlocks} blocks hidden
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      {/* Pipeline Toggle */}
      <div className="flex rounded-lg bg-surface-1 p-1 gap-1">
        {(["image", "video"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPipeline(p)}
            className={cn(
              "flex-1 rounded-md py-2 text-xs font-medium transition-colors capitalize",
              pipeline === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p} Prompts
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {sortedCategories.map((category, catIdx) => {
            const catBlocks = blocksByCategory[category] || [];
            const catHidden = isCatHidden(category);
            const hiddenInCat = catBlocks.filter((b: any) => isBlockHidden(b.id)).length;

            return (
              <div key={category} className={cn(catHidden && "opacity-40")}>
                {/* Category row */}
                <div className="flex items-center gap-1.5 rounded-lg bg-surface-1 px-2 py-1.5">
                  {/* Reorder category */}
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveCat(category, "up")} disabled={catIdx === 0}
                      className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button onClick={() => moveCat(category, "down")} disabled={catIdx === sortedCategories.length - 1}
                      className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Category expand */}
                  <Collapsible className="flex-1">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 flex-1 py-1">
                        <span className="text-xs font-medium">{ALL_CATEGORY_LABELS[category] || category}</span>
                        <Badge variant="secondary" className="text-[10px] h-5">{catBlocks.length}</Badge>
                        {hiddenInCat > 0 && (
                          <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">{hiddenInCat} hidden</Badge>
                        )}
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                      </CollapsibleTrigger>

                      {/* Hide category toggle */}
                      <button onClick={() => toggleCatHidden(category)}
                        className={cn("h-7 w-7 flex items-center justify-center rounded-md transition-colors shrink-0",
                          catHidden ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground")}>
                        {catHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>

                    <CollapsibleContent>
                      <div className="mt-1 space-y-0.5 pl-1">
                        {catBlocks.map((block: any, idx: number) => (
                          <div key={block.id}
                            className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                              isBlockHidden(block.id) ? "bg-muted/30 opacity-50" : "bg-background hover:bg-surface-1")}>
                            <div className="flex flex-col gap-0.5">
                              <button onClick={() => moveBlock(category, block.id, "up")} disabled={idx === 0}
                                className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ArrowUp className="h-2.5 w-2.5" />
                              </button>
                              <button onClick={() => moveBlock(category, block.id, "down")} disabled={idx === catBlocks.length - 1}
                                className="h-3.5 w-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20">
                                <ArrowDown className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium truncate">{block.label}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{block.value}</p>
                            </div>
                            <button onClick={() => toggleBlockHidden(block.id)}
                              className={cn("h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0",
                                isBlockHidden(block.id) ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground")}>
                              {isBlockHidden(block.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </button>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
