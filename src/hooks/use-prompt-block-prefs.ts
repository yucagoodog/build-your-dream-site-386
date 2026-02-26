import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BlockPref {
  block_id: string;
  hidden: boolean;
  custom_sort_order: number | null;
}

interface CategoryPref {
  category: string;
  hidden: boolean;
  custom_sort_order: number | null;
}

export function usePromptBlockPrefs() {
  const { user } = useAuth();

  const { data: prefs = [] } = useQuery({
    queryKey: ["user_prompt_block_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_prompt_block_prefs")
        .select("block_id, hidden, custom_sort_order")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as BlockPref[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const { data: categoryPrefs = [] } = useQuery({
    queryKey: ["user_prompt_category_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_prompt_category_prefs")
        .select("category, hidden, custom_sort_order")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as CategoryPref[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const prefsMap = new Map(prefs.map((p) => [p.block_id, p]));
  const catPrefsMap = new Map(categoryPrefs.map((p) => [p.category, p]));

  const isBlockHidden = (blockId: string) => prefsMap.get(blockId)?.hidden ?? false;
  const isCategoryHidden = (category: string) => catPrefsMap.get(category)?.hidden ?? false;
  const getCategorySortOrder = (category: string, defaultOrder: number) =>
    catPrefsMap.get(category)?.custom_sort_order ?? defaultOrder;

  const getSortOrder = (blockId: string, defaultOrder: number) =>
    prefsMap.get(blockId)?.custom_sort_order ?? defaultOrder;

  /** Filter hidden blocks and sort by custom order */
  const applyPrefs = <T extends { id: string; sort_order: number; category: string }>(blocks: T[]): T[] =>
    blocks
      .filter((b) => !isBlockHidden(b.id) && !isCategoryHidden(b.category))
      .sort((a, b) => getSortOrder(a.id, a.sort_order) - getSortOrder(b.id, b.sort_order));

  /** Get ordered category list, filtering hidden ones */
  const applyCategoryPrefs = (categories: string[], defaultOrder?: Record<string, number>) => {
    return categories
      .filter((cat) => !isCategoryHidden(cat))
      .sort((a, b) => {
        const aOrder = getCategorySortOrder(a, defaultOrder?.[a] ?? 0);
        const bOrder = getCategorySortOrder(b, defaultOrder?.[b] ?? 0);
        return aOrder - bOrder;
      });
  };

  return { isBlockHidden, isCategoryHidden, getSortOrder, getCategorySortOrder, applyPrefs, applyCategoryPrefs };
}
