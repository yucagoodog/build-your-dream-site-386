import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BlockPref {
  block_id: string;
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

  const prefsMap = new Map(prefs.map((p) => [p.block_id, p]));

  const isHidden = (blockId: string) => prefsMap.get(blockId)?.hidden ?? false;

  const getSortOrder = (blockId: string, defaultOrder: number) =>
    prefsMap.get(blockId)?.custom_sort_order ?? defaultOrder;

  /** Filter hidden blocks and sort by custom order */
  const applyPrefs = <T extends { id: string; sort_order: number }>(blocks: T[]): T[] =>
    blocks
      .filter((b) => !isHidden(b.id))
      .sort((a, b) => getSortOrder(a.id, a.sort_order) - getSortOrder(b.id, b.sort_order));

  return { isHidden, getSortOrder, applyPrefs };
}
