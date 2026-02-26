import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ArrowLeft, ChevronDown, GripVertical, Eye, EyeOff,
  Loader2, Save, ArrowUp, ArrowDown,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ALL_CATEGORY_LABELS: Record<string, string> = {
  // Image categories
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
  // Video categories
  shot_type: "Shot Setup",
  camera: "Camera Movement",
  motion: "Subject Motion",
  style: "Style & Mood",
  identity: "Identity Preserve",
  multi_char: "Multi-Character",
  multi_shot: "Multi-Shot",
  super_prompt: "Super Prompt",
  negative: "Video Negatives",
};

const PIPELINE_GROUPS: Record<string, { label: string; prefix: string }> = {
  image: { label: "Image Prompts", prefix: "img_" },
  video: { label: "Video Prompts", prefix: "" },
};

interface BlockWithPref {
  id: string;
  label: string;
  value: string;
  category: string;
  sort_order: number;
  hidden: boolean;
  custom_sort_order: number | null;
  pref_id: string | null;
}

export function PromptBlockManager({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [pipeline, setPipeline] = useState<"image" | "video">("image");
  const [localPrefs, setLocalPrefs] = useState<Record<string, { hidden: boolean; custom_sort_order: number | null }>>({});
  const [dirty, setDirty] = useState(false);

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["all_prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_blocks")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: prefs = [], isLoading: prefsLoading } = useQuery({
    queryKey: ["user_prompt_block_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_prompt_block_prefs")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Initialize local prefs from DB
  useEffect(() => {
    if (prefs.length > 0) {
      const map: Record<string, { hidden: boolean; custom_sort_order: number | null }> = {};
      prefs.forEach((p: any) => {
        map[p.block_id] = { hidden: p.hidden, custom_sort_order: p.custom_sort_order };
      });
      setLocalPrefs(map);
    }
  }, [prefs]);

  const isVideoCategory = (cat: string) => !cat.startsWith("img_");
  const isImageCategory = (cat: string) => cat.startsWith("img_");

  const filteredBlocks = blocks.filter((b: any) =>
    pipeline === "image" ? isImageCategory(b.category) : isVideoCategory(b.category)
  );

  const blocksByCategory = filteredBlocks.reduce((acc: Record<string, any[]>, block: any) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {});

  // Sort blocks within each category using custom_sort_order or default
  Object.keys(blocksByCategory).forEach((cat) => {
    blocksByCategory[cat].sort((a: any, b: any) => {
      const aSort = localPrefs[a.id]?.custom_sort_order ?? a.sort_order;
      const bSort = localPrefs[b.id]?.custom_sort_order ?? b.sort_order;
      return aSort - bSort;
    });
  });

  const isHidden = (blockId: string) => localPrefs[blockId]?.hidden ?? false;

  const toggleHidden = (blockId: string) => {
    setLocalPrefs((prev) => ({
      ...prev,
      [blockId]: {
        hidden: !(prev[blockId]?.hidden ?? false),
        custom_sort_order: prev[blockId]?.custom_sort_order ?? null,
      },
    }));
    setDirty(true);
  };

  const moveBlock = (category: string, blockId: string, direction: "up" | "down") => {
    const catBlocks = [...blocksByCategory[category]];
    const idx = catBlocks.findIndex((b: any) => b.id === blockId);
    if (direction === "up" && idx <= 0) return;
    if (direction === "down" && idx >= catBlocks.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;

    // Assign new sort orders
    const newPrefs = { ...localPrefs };
    catBlocks.forEach((b: any, i: number) => {
      let newOrder = i;
      if (i === idx) newOrder = swapIdx;
      else if (i === swapIdx) newOrder = idx;
      newPrefs[b.id] = {
        hidden: newPrefs[b.id]?.hidden ?? false,
        custom_sort_order: newOrder,
      };
    });
    setLocalPrefs(newPrefs);
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Upsert all changed prefs
      const upserts = Object.entries(localPrefs).map(([block_id, pref]) => ({
        user_id: user.id,
        block_id,
        hidden: pref.hidden,
        custom_sort_order: pref.custom_sort_order,
      }));

      if (upserts.length > 0) {
        const { error } = await supabase
          .from("user_prompt_block_prefs")
          .upsert(upserts, { onConflict: "user_id,block_id" });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["user_prompt_block_prefs"] });
      queryClient.invalidateQueries({ queryKey: ["img_prompt_blocks"] });
      queryClient.invalidateQueries({ queryKey: ["prompt_blocks"] });
      toast({ title: "Prompt preferences saved" });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, localPrefs, queryClient]);

  const loading = blocksLoading || prefsLoading;

  const hiddenCount = Object.values(localPrefs).filter((p) => p.hidden).length;

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
            Reorder and hide prompt blocks · {hiddenCount} hidden
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
              "flex-1 rounded-md py-2 text-xs font-medium transition-colors",
              pipeline === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PIPELINE_GROUPS[p].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {Object.entries(blocksByCategory).map(([category, catBlocks]) => {
            const hiddenInCat = (catBlocks as any[]).filter((b: any) => isHidden(b.id)).length;
            return (
              <Collapsible key={category}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-surface-1 hover:bg-surface-2 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {ALL_CATEGORY_LABELS[category] || category}
                    </span>
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {(catBlocks as any[]).length}
                    </Badge>
                    {hiddenInCat > 0 && (
                      <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">
                        {hiddenInCat} hidden
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-1 space-y-0.5">
                    {(catBlocks as any[]).map((block: any, idx: number) => (
                      <div
                        key={block.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                          isHidden(block.id)
                            ? "bg-muted/30 opacity-50"
                            : "bg-background hover:bg-surface-1"
                        )}
                      >
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveBlock(category, block.id, "up")}
                            disabled={idx === 0}
                            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveBlock(category, block.id, "down")}
                            disabled={idx === (catBlocks as any[]).length - 1}
                            className="h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Block info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{block.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{block.value}</p>
                        </div>

                        {/* Hide toggle */}
                        <button
                          onClick={() => toggleHidden(block.id)}
                          className={cn(
                            "h-7 w-7 flex items-center justify-center rounded-md transition-colors",
                            isHidden(block.id)
                              ? "text-muted-foreground hover:text-foreground"
                              : "text-foreground hover:text-muted-foreground"
                          )}
                        >
                          {isHidden(block.id) ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
