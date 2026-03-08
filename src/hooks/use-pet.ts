import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

// Stat decay rates per hour (must match edge function)
const DECAY = { hunger: 1.5, happiness: 2, energy: 1 };
const XP_PER_LEVEL = 100;

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function calcDecayedStats(pet: any) {
  const now = Date.now();
  const last = new Date(pet.last_interaction_at).getTime();
  const h = (now - last) / 3_600_000;
  return {
    hunger: clamp(Math.round(pet.hunger - DECAY.hunger * h)),
    happiness: clamp(Math.round(pet.happiness - DECAY.happiness * h)),
    energy: clamp(Math.round(pet.energy - DECAY.energy * h)),
  };
}

export function getMood(stats: { hunger: number; happiness: number; energy: number }) {
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3;
  if (avg >= 80) return { label: "Thriving", emoji: "😄", color: "text-green-400" };
  if (avg >= 60) return { label: "Content", emoji: "🙂", color: "text-blue-400" };
  if (avg >= 40) return { label: "Okay", emoji: "😐", color: "text-yellow-400" };
  if (avg >= 20) return { label: "Sad", emoji: "😢", color: "text-orange-400" };
  return { label: "Critical", emoji: "😫", color: "text-red-400" };
}

export function getLevelProgress(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const progress = (xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
  return { level, progress, xpToNext: XP_PER_LEVEL - (xp % XP_PER_LEVEL) };
}

export function usePet() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [acting, setActing] = useState(false);
  const [pollState, setPollState] = useState<{ eventId: string; taskId: string; type: string } | null>(null);
  const [generationStatus, setGenerationStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [lastResult, setLastResult] = useState<{ url: string; type: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch active pet
  const { data: pet, isLoading: petLoading } = useQuery({
    queryKey: ["tamagotchi_pet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tamagotchi_pets")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  // Fetch recent events
  const { data: events = [] } = useQuery({
    queryKey: ["tamagotchi_events", pet?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("tamagotchi_events")
        .select("*")
        .eq("pet_id", pet!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!pet,
    staleTime: 5_000,
  });

  const createPet = useCallback(async (name: string, avatarUrls: string[], description: string, personality: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from("tamagotchi_pets").insert({
      user_id: user.id,
      name,
      avatar_urls: avatarUrls,
      description,
      personality,
    }).select().single();
    if (error) { toast({ title: "Failed to create pet", description: error.message, variant: "destructive" }); return null; }
    qc.invalidateQueries({ queryKey: ["tamagotchi_pet"] });
    return data;
  }, [user, qc]);

  const interact = useCallback(async (actionName: string, customPrompt?: string) => {
    if (!pet || !user || acting) return;
    setActing(true);
    setGenerationStatus("processing");
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("tamagotchi-action", {
        body: { action: "interact", pet_id: pet.id, action_name: actionName, custom_prompt: customPrompt },
      });
      if (error) throw new Error(typeof error === "string" ? error : "Action failed");
      if (data?.error) throw new Error(data.error);

      qc.invalidateQueries({ queryKey: ["tamagotchi_pet"] });

      if (data.level_up) {
        toast({ title: `🎉 Level Up! Now level ${data.new_level}!` });
      }

      // Start polling
      startPoll(data.event?.id, data.atlas_task_id, data.generation_type);
    } catch (err: any) {
      setGenerationStatus("failed");
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setActing(false);
    }
  }, [pet, user, acting, qc]);

  const startPoll = (eventId: string, taskId: string, genType: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPollState({ eventId, taskId, type: genType });

    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("tamagotchi-action", {
          body: { action: "poll", event_id: eventId, atlas_task_id: taskId, generation_type: genType },
        });
        if (data?.status === "completed") {
          clearInterval(interval);
          pollRef.current = null;
          setPollState(null);
          setGenerationStatus("completed");
          setLastResult({ url: data.url, type: data.generation_type });
          qc.invalidateQueries({ queryKey: ["tamagotchi_events"] });
          toast({ title: genType === "video" ? "🎬 Video ready!" : "🖼️ Scene ready!" });
        } else if (data?.status === "failed") {
          clearInterval(interval);
          pollRef.current = null;
          setPollState(null);
          setGenerationStatus("failed");
          toast({ title: "Generation failed", description: data.error, variant: "destructive" });
        }
      } catch {}
    }, 4000);
    pollRef.current = interval;
  };

  return { pet, petLoading, events, createPet, interact, acting, generationStatus, lastResult, pollState };
}
