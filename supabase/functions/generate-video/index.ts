import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function downloadAndStore(
  supabaseAdmin: any, userId: string, remoteUrl: string, fileExtension: string, prefix: string
): Promise<string | null> {
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const uint8 = new Uint8Array(await blob.arrayBuffer());
    const contentType = blob.type || (fileExtension === "mp4" ? "video/mp4" : "image/png");
    const fileName = `${prefix}/${userId}/${crypto.randomUUID()}.${fileExtension}`;
    const { error } = await supabaseAdmin.storage.from("seed-images").upload(fileName, uint8, { contentType, upsert: false });
    if (error) { console.error("Upload error:", error.message); return null; }
    const { data } = supabaseAdmin.storage.from("seed-images").getPublicUrl(fileName);
    return data?.publicUrl || null;
  } catch (err) { console.error("downloadAndStore error:", err); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "start") {
      // Accept direct params OR legacy scene_id
      let prompt: string, negative_prompt: string, seed_image_url: string;
      let resolution: string, duration: number, seed: number, shot_type: string;
      let enable_prompt_expansion: boolean, generate_audio: boolean;
      let scene_id: string | null = null;

      if (body.scene_id) {
        // Legacy: read from scene
        const { data: scene, error: sceneErr } = await supabase
          .from("scenes").select("*").eq("id", body.scene_id).eq("user_id", user.id).single();
        if (sceneErr || !scene) {
          return new Response(JSON.stringify({ error: "Scene not found" }), {
            status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        scene_id = scene.id;
        prompt = scene.prompt || "";
        negative_prompt = scene.negative_prompt || "";
        seed_image_url = scene.seed_image_url || "";
        resolution = scene.resolution || "720p";
        duration = scene.duration || 5;
        seed = scene.use_random_seed ? -1 : (scene.seed ?? -1);
        shot_type = scene.shot_type || "single";
        enable_prompt_expansion = scene.prompt_expansion ?? true;
        generate_audio = scene.audio_enabled ?? false;
      } else {
        // Direct params
        prompt = body.prompt || "";
        negative_prompt = body.negative_prompt || "";
        seed_image_url = body.seed_image_url || "";
        resolution = body.resolution || "720p";
        duration = body.duration || 5;
        seed = body.seed ?? -1;
        shot_type = body.shot_type || "single";
        enable_prompt_expansion = body.enable_prompt_expansion ?? true;
        generate_audio = body.generate_audio ?? false;
      }

      const model = body.model || "alibaba/wan-2.6/image-to-video-flash";

      if (!seed_image_url) {
        return new Response(JSON.stringify({ error: "Seed image is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings").select("atlas_api_key").eq("user_id", user.id).single();
      if (!settings?.atlas_api_key) {
        return new Response(
          JSON.stringify({ error: "Atlas Cloud API key not configured. Add it in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isStandard = model === "alibaba/wan-2.6/image-to-video";
      const costEstimate = isStandard
        ? (resolution === "1080p" ? 0.15 : 0.10) * duration
        : (generate_audio
          ? (resolution === "1080p" ? 0.075 : 0.05)
          : (resolution === "1080p" ? 0.0375 : 0.025)) * duration;

      const generateRes = await fetch("https://api.atlascloud.ai/api/v1/model/generateVideo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.atlas_api_key}` },
        body: JSON.stringify({
          model,
          prompt, negative_prompt, image: seed_image_url,
          resolution, duration, seed, shot_type,
          enable_prompt_expansion, generate_audio,
        }),
      });

      const generateResult = await generateRes.json();
      if (!generateRes.ok) {
        return new Response(
          JSON.stringify({ error: generateResult?.message || "Atlas Cloud API error" }),
          { status: generateRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const predictionId = generateResult?.data?.id;
      if (!predictionId) {
        return new Response(JSON.stringify({ error: "No prediction ID returned" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: generation, error: genErr } = await supabase
        .from("generations")
        .insert({
          scene_id: scene_id,
          user_id: user.id,
          atlas_task_id: predictionId,
          status: "processing",
          prompt_used: prompt,
          negative_prompt_used: negative_prompt,
          parameters: {
            model, resolution, duration, seed, shot_type,
            prompt_expansion: enable_prompt_expansion,
            audio: generate_audio,
            seed_image_url,
          },
          cost: costEstimate,
        })
        .select()
        .single();

      if (genErr) {
        return new Response(JSON.stringify({ error: genErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update scene status if using legacy flow
      if (scene_id) {
        await supabase.from("scenes").update({ status: "processing" }).eq("id", scene_id);
      }

      return new Response(JSON.stringify({ generation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "poll") {
      const { generation_id } = body;
      const { data: gen } = await supabase
        .from("generations").select("*").eq("id", generation_id).eq("user_id", user.id).single();

      if (!gen || !gen.atlas_task_id) {
        return new Response(JSON.stringify({ error: "Generation not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings").select("atlas_api_key").eq("user_id", user.id).single();

      const pollRes = await fetch(
        `https://api.atlascloud.ai/api/v1/model/prediction/${gen.atlas_task_id}`,
        { headers: { Authorization: `Bearer ${settings?.atlas_api_key}` } }
      );
      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;
        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl, "mp4", "video-results");
          if (stored) permanentUrl = stored;
        }
        await supabase.from("generations")
          .update({ status: "completed", video_url: permanentUrl, atlas_result_url: atlasUrl })
          .eq("id", gen.id);
        if (gen.scene_id) {
          await supabase.from("scenes").update({ status: "completed" }).eq("id", gen.scene_id);
        }
        return new Response(JSON.stringify({ status: "completed", video_url: permanentUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else if (status === "failed") {
        const errorMsg = pollResult?.data?.error || "Generation failed";
        await supabase.from("generations").update({ status: "failed", error_message: errorMsg }).eq("id", gen.id);
        if (gen.scene_id) {
          await supabase.from("scenes").update({ status: "failed" }).eq("id", gen.scene_id);
        }
        return new Response(JSON.stringify({ status: "failed", error: errorMsg }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ status: "processing" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
