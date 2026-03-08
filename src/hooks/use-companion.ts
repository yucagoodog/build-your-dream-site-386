import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { DEFAULT_SCENARIOS } from "@/lib/companion-prompts";

export function getCurrentTimeOfDay() {
  const h = new Date().getHours();
  if (h < 6) return "night";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  if (h < 22) return "evening";
  return "night";
}

export function useCompanion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState<"idle" | "processing" | "completed" | "failed">("idle");
  const [lastResult, setLastResult] = useState<{ url: string; id: string } | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: companion, isLoading: companionLoading } = useQuery({
    queryKey: ["companion", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companions" as any)
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
    enabled: !!user,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ["companion_assets", companion?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companion_assets" as any)
        .select("*")
        .eq("companion_id", companion!.id)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companion,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["companion_rooms", companion?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companion_rooms" as any)
        .select("*")
        .eq("companion_id", companion!.id)
        .order("sort_order");
      return (data || []) as any[];
    },
    enabled: !!companion,
  });

  const { data: roomVariants = [] } = useQuery({
    queryKey: ["companion_room_variants", companion?.id, rooms],
    queryFn: async () => {
      if (!rooms.length) return [];
      const roomIds = rooms.map((r: any) => r.id);
      const { data } = await supabase
        .from("companion_room_variants" as any)
        .select("*")
        .in("room_id", roomIds)
        .order("created_at");
      return (data || []) as any[];
    },
    enabled: rooms.length > 0,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["companion_scenarios", companion?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companion_scenarios" as any)
        .select("*")
        .eq("companion_id", companion!.id)
        .order("created_at");
      return (data || []) as any[];
    },
    enabled: !!companion,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["companion_interactions", companion?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("companion_interactions" as any)
        .select("*")
        .eq("companion_id", companion!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
    enabled: !!companion,
  });

  const createCompanion = useCallback(async (name: string, avatarUrls: string[], description: string, personality: string) => {
    if (!user) return null;
    const { data, error } = await supabase.from("companions" as any).insert({
      user_id: user.id, name, avatar_urls: avatarUrls, description, personality,
    } as any).select().single();
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return null; }

    const d = data as any;

    // Create default rooms
    const defaultRooms = [
      { room_name: "Living Room", icon: "🛋️", room_type: "living_room", base_prompt: "cozy modern living room with warm lighting, soft plush sofa, decorative plants, bookshelf, large windows with sheer curtains, wooden floor, ambient mood", sort_order: 0 },
      { room_name: "Kitchen", icon: "🍳", room_type: "kitchen", base_prompt: "modern kitchen with marble counters, warm ambient lighting, copper pots hanging, fresh herbs on windowsill, breakfast bar with stools", sort_order: 1 },
      { room_name: "Bedroom", icon: "🛏️", room_type: "bedroom", base_prompt: "cozy bedroom with soft lighting, comfortable king-size bed with fluffy pillows, warm blankets, bedside lamps, soft carpet, intimate atmosphere", sort_order: 2 },
      { room_name: "Bathroom", icon: "🛁", room_type: "bathroom", base_prompt: "elegant modern bathroom with soft lighting, freestanding bathtub, candles, marble tiles, large mirror, plants", sort_order: 3 },
      { room_name: "Balcony", icon: "🌅", room_type: "balcony", base_prompt: "spacious balcony with city skyline view, string lights, comfortable lounge chair, potted plants, sunset colors", sort_order: 4 },
    ];
    await supabase.from("companion_rooms" as any).insert(
      defaultRooms.map(r => ({ ...r, companion_id: d.id, user_id: user.id })) as any
    );

    // Create default scenarios
    await supabase.from("companion_scenarios" as any).insert(
      DEFAULT_SCENARIOS.map(s => ({
        ...s,
        companion_id: d.id,
        user_id: user.id,
      })) as any
    );

    qc.invalidateQueries({ queryKey: ["companion"] });
    qc.invalidateQueries({ queryKey: ["companion_rooms"] });
    qc.invalidateQueries({ queryKey: ["companion_scenarios"] });
    return d;
  }, [user, qc]);

  const generateAsset = useCallback(async (assetType: string, tags: Record<string, string>, customPrompt?: string) => {
    if (!companion || !user || generating) return;
    setGenerating(true);
    setGenStatus("processing");
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("companion-generate", {
        body: { action: "generate_asset", companion_id: companion.id, asset_type: assetType, tags, custom_prompt: customPrompt },
      });
      if (error || data?.error) throw new Error(data?.error || "Generation failed");
      startPoll(data.asset_id, data.atlas_task_id, "asset");
    } catch (err: any) {
      setGenStatus("failed");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  }, [companion, user, generating]);

  const generateRoomVariant = useCallback(async (roomId: string, timeOfDay: string, weather?: string) => {
    if (!companion || !user || generating) return;
    setGenerating(true);
    setGenStatus("processing");
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("companion-generate", {
        body: { action: "generate_room", companion_id: companion.id, room_id: roomId, time_of_day: timeOfDay, weather: weather || "clear" },
      });
      if (error || data?.error) throw new Error(data?.error || "Generation failed");
      startPoll(data.variant_id, data.atlas_task_id, "room");
    } catch (err: any) {
      setGenStatus("failed");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  }, [companion, user, generating]);

  const generateScenario = useCallback(async (scenarioId: string) => {
    if (!companion || !user || generating) return;
    setGenerating(true);
    setGenStatus("processing");
    try {
      const { data, error } = await supabase.functions.invoke("companion-generate", {
        body: { action: "generate_scenario", companion_id: companion.id, scenario_id: scenarioId },
      });
      if (error || data?.error) throw new Error(data?.error || "Generation failed");
      startPoll(data.asset_id, data.atlas_task_id, "scenario");
    } catch (err: any) {
      setGenStatus("failed");
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      setGenerating(false);
    }
  }, [companion, user, generating]);

  const startPoll = (itemId: string, taskId: string, type: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("companion-generate", {
          body: { action: "poll", item_id: itemId, atlas_task_id: taskId, poll_type: type },
        });
        if (data?.status === "completed") {
          clearInterval(interval);
          pollRef.current = null;
          setGenStatus("completed");
          setLastResult({ url: data.url, id: itemId });
          setGenerating(false);
          qc.invalidateQueries({ queryKey: ["companion_assets"] });
          qc.invalidateQueries({ queryKey: ["companion_room_variants"] });
          qc.invalidateQueries({ queryKey: ["companion_scenarios"] });
          toast({ title: "✨ Generation complete!" });
        } else if (data?.status === "failed") {
          clearInterval(interval);
          pollRef.current = null;
          setGenStatus("failed");
          setGenerating(false);
          toast({ title: "Generation failed", description: data.error, variant: "destructive" });
        }
      } catch {}
    }, 4000);
    pollRef.current = interval;
  };

  const updateAssetStatus = useCallback(async (assetId: string, status: "approved" | "rejected") => {
    await supabase.from("companion_assets" as any).update({ status } as any).eq("id", assetId);
    qc.invalidateQueries({ queryKey: ["companion_assets"] });
  }, [qc]);

  const updateVariantStatus = useCallback(async (variantId: string, status: "approved" | "rejected") => {
    await supabase.from("companion_room_variants" as any).update({ status } as any).eq("id", variantId);
    qc.invalidateQueries({ queryKey: ["companion_room_variants"] });
  }, [qc]);

  const createRoom = useCallback(async (roomName: string, icon: string, basePrompt: string, roomType?: string) => {
    if (!companion || !user) return;
    await supabase.from("companion_rooms" as any).insert({
      companion_id: companion.id, user_id: user.id, room_name: roomName, icon,
      base_prompt: basePrompt, room_type: roomType || roomName.toLowerCase().replace(/\s/g, "_"), sort_order: rooms.length,
    } as any);
    qc.invalidateQueries({ queryKey: ["companion_rooms"] });
  }, [companion, user, rooms, qc]);

  const deleteRoom = useCallback(async (roomId: string) => {
    await supabase.from("companion_rooms" as any).delete().eq("id", roomId);
    qc.invalidateQueries({ queryKey: ["companion_rooms"] });
  }, [qc]);

  const createScenario = useCallback(async (name: string, type: string, promptTemplate: string, room?: string, outfit?: string, emotion?: string) => {
    if (!companion || !user) return;
    await supabase.from("companion_scenarios" as any).insert({
      companion_id: companion.id, user_id: user.id, scenario_name: name, scenario_type: type,
      prompt_template: promptTemplate, required_room: room, required_outfit: outfit, required_emotion: emotion,
    } as any);
    qc.invalidateQueries({ queryKey: ["companion_scenarios"] });
  }, [companion, user, qc]);

  const deleteScenario = useCallback(async (scenarioId: string) => {
    await supabase.from("companion_scenarios" as any).delete().eq("id", scenarioId);
    qc.invalidateQueries({ queryKey: ["companion_scenarios"] });
  }, [qc]);

  const sendMessage = useCallback(async (message: string) => {
    if (!companion || !user) return null;
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("companion-chat", {
        body: { companion_id: companion.id, message },
      });
      if (error || data?.error) throw new Error(data?.error || "Chat failed");
      qc.invalidateQueries({ queryKey: ["companion_interactions"] });
      qc.invalidateQueries({ queryKey: ["companion"] });
      return data;
    } catch (err: any) {
      toast({ title: "Chat failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setChatLoading(false);
    }
  }, [companion, user, qc]);

  const performAction = useCallback(async (actionType: string) => {
    if (!companion || !user) return null;
    setChatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("companion-chat", {
        body: { companion_id: companion.id, action: actionType },
      });
      if (error || data?.error) throw new Error(data?.error || "Action failed");
      qc.invalidateQueries({ queryKey: ["companion_interactions"] });
      qc.invalidateQueries({ queryKey: ["companion"] });
      return data;
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setChatLoading(false);
    }
  }, [companion, user, qc]);

  const moveToRoom = useCallback(async (roomType: string) => {
    if (!companion) return;
    await supabase.from("companions" as any).update({ current_room: roomType } as any).eq("id", companion.id);
    qc.invalidateQueries({ queryKey: ["companion"] });
  }, [companion, qc]);

  // ─── Asset resolvers with draft fallback ───
  const resolveAsset = useCallback((emotion?: string, outfit?: string): string | null => {
    const targetEmotion = emotion || companion?.current_emotion || "neutral";
    const targetOutfit = outfit || companion?.current_outfit || "casual";

    // Try approved first
    const approved = assets.filter((a: any) => a.status === "approved" && a.image_url);
    let match = approved.find((a: any) => a.tags?.emotion === targetEmotion && a.tags?.outfit === targetOutfit);
    if (match) return match.image_url;
    match = approved.find((a: any) => a.tags?.emotion === targetEmotion);
    if (match) return match.image_url;
    match = approved.find((a: any) => a.asset_type === "portrait");
    if (match) return match.image_url;

    // Fallback to any draft with an image
    const drafts = assets.filter((a: any) => a.status === "draft" && a.image_url);
    match = drafts.find((a: any) => a.tags?.emotion === targetEmotion);
    if (match) return match.image_url;
    if (drafts.length > 0) return drafts[0].image_url;

    return null; // Will fall through to avatar in PlayMode
  }, [assets, companion]);

  const resolveBackground = useCallback((roomType?: string, timeOfDay?: string): string | null => {
    const targetRoom = roomType || companion?.current_room || "living_room";
    const room = rooms.find((r: any) => r.room_type === targetRoom);
    if (!room) return null;
    const time = timeOfDay || getCurrentTimeOfDay();

    // Try approved first
    const approved = roomVariants.filter((v: any) => v.room_id === room.id && v.status === "approved" && v.image_url);
    let match = approved.find((v: any) => v.time_of_day === time);
    if (match) return match.image_url;
    if (approved.length > 0) return approved[0].image_url;

    // Fallback to any draft with an image
    const drafts = roomVariants.filter((v: any) => v.room_id === room.id && v.status === "draft" && v.image_url);
    match = drafts.find((v: any) => v.time_of_day === time);
    if (match) return match.image_url;
    if (drafts.length > 0) return drafts[0].image_url;

    // Try any room's approved/draft variant as ultimate fallback
    const anyApproved = roomVariants.find((v: any) => v.status === "approved" && v.image_url);
    if (anyApproved) return anyApproved.image_url;
    const anyDraft = roomVariants.find((v: any) => v.image_url);
    if (anyDraft) return anyDraft.image_url;

    return null;
  }, [rooms, roomVariants, companion]);

  return {
    companion, companionLoading,
    assets, rooms, roomVariants, scenarios, interactions,
    createCompanion, generateAsset, generateRoomVariant, generateScenario,
    updateAssetStatus, updateVariantStatus,
    createRoom, deleteRoom, createScenario, deleteScenario,
    sendMessage, performAction, moveToRoom,
    resolveAsset, resolveBackground,
    generating, genStatus, lastResult, chatLoading,
  };
}
