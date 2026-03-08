import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EMOTION_PROMPTS: Record<string, string> = {
  happy: "smiling warmly, genuinely happy, bright eyes, joyful expression",
  sad: "looking sad, melancholic expression, downcast eyes, vulnerable",
  surprised: "eyes wide, mouth slightly open, surprised expression, amazed",
  angry: "frustrated expression, furrowed brows, intense gaze",
  sleepy: "drowsy, half-closed eyes, yawning, cozy and tired",
  flirty: "playful smirk, confident, slightly tilted head, charming gaze",
  laughing: "laughing heartily, eyes crinkled, genuine laughter, candid joy",
  neutral: "calm neutral expression, relaxed, natural pose",
  shy: "bashful expression, slight blush, looking away, cute and timid",
  excited: "super excited, animated expression, enthusiastic energy",
};

const OUTFIT_PROMPTS: Record<string, string> = {
  casual: "wearing casual comfortable clothes, relaxed style",
  formal: "wearing elegant formal attire, sophisticated look",
  sleepwear: "wearing cozy pajamas, comfortable sleepwear",
  workout: "wearing athletic sportswear, active lifestyle",
  swimwear: "wearing stylish swimwear, summer beach look",
  evening: "wearing glamorous evening outfit, dressed up for a night out",
};

const TIME_MODIFIERS: Record<string, string> = {
  morning: "early morning golden sunlight streaming through windows, warm dawn light",
  afternoon: "bright afternoon daylight, natural lighting",
  evening: "warm golden hour sunset light, cozy evening atmosphere",
  night: "soft dim night lighting, ambient warm lamps, moonlight",
};

function err(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ok(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function downloadAndStore(
  supabaseAdmin: any, userId: string, remoteUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(remoteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buf = new Uint8Array(await blob.arrayBuffer());
    const path = `companion/${userId}/${crypto.randomUUID()}.png`;
    const { error } = await supabaseAdmin.storage
      .from("seed-images")
      .upload(path, buf, { contentType: "image/png", upsert: false });
    if (error) return null;
    return supabaseAdmin.storage.from("seed-images").getPublicUrl(path).data?.publicUrl || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return err("Missing auth", 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return err("Unauthorized", 401);

    const body = await req.json();
    const { action } = body;

    // Get API key
    const { data: settings } = await supabase
      .from("user_settings")
      .select("atlas_api_key")
      .eq("user_id", user.id)
      .single();
    if (!settings?.atlas_api_key) return err("Atlas Cloud API key not configured");

    const apiKey = settings.atlas_api_key;

    // ─── GENERATE ASSET (emotion/outfit/portrait) ───
    if (action === "generate_asset") {
      const { companion_id, asset_type, tags, custom_prompt } = body;

      const { data: comp } = await supabase
        .from("companions")
        .select("*")
        .eq("id", companion_id)
        .eq("user_id", user.id)
        .single();
      if (!comp) return err("Companion not found", 404);

      const avatarUrl = comp.avatar_urls?.[0];
      if (!avatarUrl) return err("No avatar image");

      // Build prompt
      const emotionMod = EMOTION_PROMPTS[tags?.emotion] || tags?.emotion || "";
      const outfitMod = OUTFIT_PROMPTS[tags?.outfit] || tags?.outfit || "";
      const parts = [
        comp.name,
        comp.description || "a person",
        comp.personality ? `personality: ${comp.personality}` : "",
        emotionMod,
        outfitMod,
        custom_prompt || "",
        "high quality portrait, consistent character, photorealistic",
      ].filter(Boolean);
      const prompt = parts.join(", ");

      const genRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "alibaba/wan-2.6/image-edit",
          images: [avatarUrl],
          prompt,
          negative_prompt: "blurry, distorted, disfigured, bad anatomy",
          size: "1024*1024",
          seed: -1,
          enable_prompt_expansion: true,
          enable_interleave: false,
        }),
      });
      const genResult = await genRes.json();
      if (!genRes.ok) return err(genResult?.message || "Generation failed", genRes.status);

      const atlasTaskId = genResult?.data?.id;
      if (!atlasTaskId) return err("No task ID returned", 500);

      // Save draft asset
      const { data: asset } = await supabase.from("companion_assets").insert({
        companion_id,
        user_id: user.id,
        asset_type,
        tags: tags || {},
        prompt_used: prompt,
        atlas_task_id: atlasTaskId,
        status: "draft",
      }).select().single();

      return ok({ asset_id: asset?.id, atlas_task_id: atlasTaskId });
    }

    // ─── GENERATE ROOM VARIANT ───
    if (action === "generate_room") {
      const { companion_id, room_id, time_of_day, weather } = body;

      const { data: room } = await supabase
        .from("companion_rooms")
        .select("*")
        .eq("id", room_id)
        .single();
      if (!room) return err("Room not found", 404);

      const timeMod = TIME_MODIFIERS[time_of_day] || time_of_day;
      const weatherMod = weather === "rainy" ? "rain visible through windows, wet atmosphere" :
                         weather === "cloudy" ? "overcast sky visible, soft diffused light" : "";

      const prompt = [
        room.base_prompt,
        timeMod,
        weatherMod,
        "interior photography, wide angle, detailed environment, no people, photorealistic",
      ].filter(Boolean).join(", ");

      const requestImage = async (model: string, size: string) => {
        const res = await fetch("https://api.atlascloud.ai/api/v1/model/generateImage", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            prompt,
            negative_prompt: "people, person, blurry, distorted",
            size,
            seed: -1,
            enable_prompt_expansion: true,
          }),
        });
        const json = await res.json();
        return { res, json };
      };

      // Room generation is text-to-image (no source images)
      let { res: genRes, json: genResult } = await requestImage("alibaba/wan-2.6/text-to-image", "1280*720");

      // Fallback model for broader account compatibility
      if (!genRes.ok) {
        const fallback = await requestImage("alibaba/wan-2.5/text-to-image", "1024*1024");
        genRes = fallback.res;
        genResult = fallback.json;
      }

      if (!genRes.ok) return err(genResult?.message || "Generation failed", genRes.status);

      const atlasTaskId = genResult?.data?.id;
      if (!atlasTaskId) return err("No task ID returned", 500);

      const { data: variant } = await supabase.from("companion_room_variants").insert({
        room_id,
        user_id: user.id,
        time_of_day,
        weather: weather || "clear",
        prompt_used: prompt,
        atlas_task_id: atlasTaskId,
        status: "draft",
      }).select().single();

      return ok({ variant_id: variant?.id, atlas_task_id: atlasTaskId });
    }

    // ─── GENERATE SCENARIO ───
    if (action === "generate_scenario") {
      const { companion_id, scenario_id } = body;

      const { data: scenario } = await supabase
        .from("companion_scenarios")
        .select("*")
        .eq("id", scenario_id)
        .single();
      if (!scenario) return err("Scenario not found", 404);

      const { data: comp } = await supabase
        .from("companions")
        .select("*")
        .eq("id", companion_id)
        .single();
      if (!comp) return err("Companion not found", 404);

      const avatarUrl = comp.avatar_urls?.[0];
      if (!avatarUrl) return err("No avatar image");

      const emotionMod = EMOTION_PROMPTS[scenario.required_emotion] || "";
      const outfitMod = OUTFIT_PROMPTS[scenario.required_outfit] || "";
      const prompt = [
        comp.name,
        comp.description || "a person",
        scenario.prompt_template,
        emotionMod,
        outfitMod,
        "photorealistic, cinematic composition",
      ].filter(Boolean).join(", ");

      const genRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "alibaba/wan-2.6/image-edit",
          images: [avatarUrl],
          prompt,
          negative_prompt: "blurry, distorted, disfigured",
          size: "1280*720",
          seed: -1,
          enable_prompt_expansion: true,
          enable_interleave: false,
        }),
      });
      const genResult = await genRes.json();
      if (!genRes.ok) return err(genResult?.message || "Generation failed", genRes.status);

      const atlasTaskId = genResult?.data?.id;
      if (!atlasTaskId) return err("No task ID returned", 500);

      const { data: asset } = await supabase.from("companion_assets").insert({
        companion_id,
        user_id: user.id,
        asset_type: "scenario",
        tags: { scenario_id, scenario_name: scenario.scenario_name, emotion: scenario.required_emotion, outfit: scenario.required_outfit },
        prompt_used: prompt,
        atlas_task_id: atlasTaskId,
        status: "draft",
      }).select().single();

      return ok({ asset_id: asset?.id, atlas_task_id: atlasTaskId });
    }

    // ─── POLL ───
    if (action === "poll") {
      const { item_id, atlas_task_id, poll_type } = body;

      const pollRes = await fetch(
        `https://api.atlascloud.ai/api/v1/model/prediction/${atlas_task_id}`,
        { headers: { Authorization: `Bearer ${apiKey}` } }
      );
      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;
        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl);
          if (stored) permanentUrl = stored;
        }

        if (poll_type === "room") {
          await supabase.from("companion_room_variants")
            .update({ image_url: permanentUrl, status: "draft" })
            .eq("id", item_id);
        } else {
          await supabase.from("companion_assets")
            .update({ image_url: permanentUrl, status: "draft" })
            .eq("id", item_id);
        }

        return ok({ status: "completed", url: permanentUrl });
      } else if (status === "failed") {
        return ok({ status: "failed", error: pollResult?.data?.error || "Generation failed" });
      }

      return ok({ status: "processing" });
    }

    return err("Invalid action");
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
