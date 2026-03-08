import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stat decay: per hour rates
const DECAY_RATES = { hunger: 1.5, happiness: 2, energy: 1 };
const XP_PER_ACTION = 10;
const XP_PER_LEVEL = 100;

// Action definitions with prompt templates and stat effects
const ACTIONS: Record<string, { promptTemplate: string; stats: Record<string, number>; generateVideo?: boolean }> = {
  feed: {
    promptTemplate: "{name} happily eating a delicious meal, {personality}, {extra}",
    stats: { hunger: 30, happiness: 5, energy: 0 },
  },
  play: {
    promptTemplate: "{name} playing and having fun, laughing joyfully, {personality}, {extra}",
    stats: { hunger: -5, happiness: 35, energy: -10 },
  },
  rest: {
    promptTemplate: "{name} resting peacefully in a cozy comfortable setting, eyes closed, relaxed, {personality}, {extra}",
    stats: { hunger: -5, happiness: 5, energy: 40 },
  },
  style: {
    promptTemplate: "{name} in a stylish new outfit, fashion photoshoot style, confident pose, {personality}, {extra}",
    stats: { hunger: 0, happiness: 20, energy: 0 },
  },
  adventure: {
    promptTemplate: "{name} on an exciting adventure in an epic landscape, action pose, dramatic lighting, {personality}, {extra}",
    stats: { hunger: -10, happiness: 25, energy: -15 },
    generateVideo: true,
  },
  dance: {
    promptTemplate: "{name} dancing energetically with joy, dynamic movement, party atmosphere, {personality}, {extra}",
    stats: { hunger: -5, happiness: 30, energy: -10 },
    generateVideo: true,
  },
  custom: {
    promptTemplate: "{name}, {personality}, {extra}",
    stats: { hunger: 0, happiness: 10, energy: 0 },
  },
};

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function calcDecayedStats(pet: any) {
  const now = Date.now();
  const last = new Date(pet.last_interaction_at).getTime();
  const hoursElapsed = (now - last) / (1000 * 60 * 60);

  return {
    hunger: clamp(Math.round(pet.hunger - DECAY_RATES.hunger * hoursElapsed)),
    happiness: clamp(Math.round(pet.happiness - DECAY_RATES.happiness * hoursElapsed)),
    energy: clamp(Math.round(pet.energy - DECAY_RATES.energy * hoursElapsed)),
  };
}

function getMoodModifier(stats: { hunger: number; happiness: number; energy: number }) {
  const avg = (stats.hunger + stats.happiness + stats.energy) / 3;
  if (avg >= 80) return "looking very happy and full of energy";
  if (avg >= 60) return "looking content and comfortable";
  if (avg >= 40) return "looking a bit tired but managing";
  if (avg >= 20) return "looking tired and somewhat sad";
  return "looking exhausted and very unhappy";
}

function getLevelFromXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

async function downloadAndStore(
  supabaseAdmin: any, userId: string, remoteUrl: string, ext: string, prefix: string
): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    const ct = blob.type || (ext === "mp4" ? "video/mp4" : "image/png");
    const path = `${prefix}/${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabaseAdmin.storage.from("seed-images").upload(path, buf, { contentType: ct, upsert: false });
    if (error) return null;
    return supabaseAdmin.storage.from("seed-images").getPublicUrl(path).data?.publicUrl || null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action } = body;

    // GET_STATS: Return pet with decayed stats
    if (action === "get_stats") {
      const { pet_id } = body;
      const { data: pet } = await supabase.from("tamagotchi_pets").select("*").eq("id", pet_id).eq("user_id", user.id).single();
      if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const decayed = calcDecayedStats(pet);
      return new Response(JSON.stringify({ pet: { ...pet, ...decayed, mood: getMoodModifier(decayed) } }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // INTERACT: Perform an action on the pet
    if (action === "interact") {
      const { pet_id, action_name, custom_prompt } = body;

      const { data: pet } = await supabase.from("tamagotchi_pets").select("*").eq("id", pet_id).eq("user_id", user.id).single();
      if (!pet) return new Response(JSON.stringify({ error: "Pet not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const actionDef = ACTIONS[action_name];
      if (!actionDef) return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Calculate decayed stats first
      const decayed = calcDecayedStats(pet);
      const mood = getMoodModifier(decayed);

      // Apply action stat changes
      const newStats = {
        hunger: clamp(decayed.hunger + actionDef.stats.hunger),
        happiness: clamp(decayed.happiness + actionDef.stats.happiness),
        energy: clamp(decayed.energy + actionDef.stats.energy),
      };

      const newXp = pet.xp + XP_PER_ACTION;
      const newLevel = getLevelFromXp(newXp);

      // Build prompt
      const prompt = actionDef.promptTemplate
        .replace("{name}", pet.name)
        .replace("{personality}", pet.personality || "a friendly person")
        .replace("{extra}", custom_prompt || mood);

      // Get API key
      const { data: settings } = await supabase.from("user_settings").select("atlas_api_key").eq("user_id", user.id).single();
      if (!settings?.atlas_api_key) {
        return new Response(JSON.stringify({ error: "Atlas Cloud API key not configured" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const avatarUrl = pet.avatar_urls?.[0];
      if (!avatarUrl) {
        return new Response(JSON.stringify({ error: "Pet has no avatar image" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let atlasTaskId: string | null = null;
      let generationType: "image" | "video" = "image";

      if (actionDef.generateVideo) {
        // Start video generation
        generationType = "video";
        const genRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateVideo", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.atlas_api_key}` },
          body: JSON.stringify({
            model: "alibaba/wan-2.6/image-to-video-flash",
            image: avatarUrl,
            prompt,
            negative_prompt: "",
            size: "720p",
            duration: 3,
            seed: -1,
            shot_type: "single",
            enable_prompt_expansion: true,
          }),
        });
        const genResult = await genRes.json();
        if (!genRes.ok) return new Response(JSON.stringify({ error: genResult?.message || "Video generation failed" }), { status: genRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        atlasTaskId = genResult?.data?.id;
      } else {
        // Start image generation
        const genRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateImage", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.atlas_api_key}` },
          body: JSON.stringify({
            model: "alibaba/wan-2.6/image-edit",
            images: [avatarUrl],
            prompt,
            negative_prompt: "",
            size: "1280*1280",
            seed: -1,
            enable_prompt_expansion: true,
            enable_interleave: false,
          }),
        });
        const genResult = await genRes.json();
        if (!genRes.ok) return new Response(JSON.stringify({ error: genResult?.message || "Image generation failed" }), { status: genRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        atlasTaskId = genResult?.data?.id;
      }

      if (!atlasTaskId) return new Response(JSON.stringify({ error: "No task ID returned" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Update pet stats
      await supabase.from("tamagotchi_pets").update({
        hunger: newStats.hunger,
        happiness: newStats.happiness,
        energy: newStats.energy,
        xp: newXp,
        level: newLevel,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", pet_id);

      // Create event record
      const { data: event } = await supabase.from("tamagotchi_events").insert({
        pet_id,
        user_id: user.id,
        event_type: generationType,
        action_name,
        prompt_used: prompt,
        stat_changes: { ...actionDef.stats, xp: XP_PER_ACTION },
      }).select().single();

      return new Response(JSON.stringify({
        event,
        atlas_task_id: atlasTaskId,
        generation_type: generationType,
        new_stats: newStats,
        new_xp: newXp,
        new_level: newLevel,
        level_up: newLevel > pet.level,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // POLL: Check generation result
    if (action === "poll") {
      const { event_id, atlas_task_id, generation_type } = body;

      const { data: settings } = await supabase.from("user_settings").select("atlas_api_key").eq("user_id", user.id).single();

      const endpoint = generation_type === "video"
        ? `https://api.atlascloud.ai/api/v1/model/prediction/${atlas_task_id}`
        : `https://api.atlascloud.ai/api/v1/model/prediction/${atlas_task_id}`;

      const pollRes = await fetch(endpoint, { headers: { Authorization: `Bearer ${settings?.atlas_api_key}` } });
      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;
        const ext = generation_type === "video" ? "mp4" : "png";
        const prefix = generation_type === "video" ? "pet-videos" : "pet-images";

        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl, ext, prefix);
          if (stored) permanentUrl = stored;
        }

        const updateData = generation_type === "video"
          ? { result_video_url: permanentUrl }
          : { result_image_url: permanentUrl };

        await supabase.from("tamagotchi_events").update(updateData).eq("id", event_id);

        return new Response(JSON.stringify({ status: "completed", url: permanentUrl, generation_type }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } else if (status === "failed") {
        return new Response(JSON.stringify({ status: "failed", error: pollResult?.data?.error || "Generation failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ status: "processing" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
