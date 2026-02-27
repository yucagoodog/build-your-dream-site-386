import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function downloadAndStore(
  supabaseAdmin: any,
  userId: string,
  remoteUrl: string,
  fileExtension: string,
  prefix: string
): Promise<string | null> {
  try {
    const response = await fetch(remoteUrl);
    if (!response.ok) {
      console.error("Failed to download file:", response.status);
      return null;
    }
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const contentType = blob.type || (fileExtension === "mp4" ? "video/mp4" : "image/png");
    const fileName = `${prefix}/${userId}/${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("seed-images")
      .upload(fileName, uint8, { contentType, upsert: false });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return null;
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("seed-images")
      .getPublicUrl(fileName);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error("downloadAndStore error:", err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Admin client for storage uploads (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { scene_id, action } = body;

    // ACTION: start generation
    if (action === "start") {
      const { data: scene, error: sceneErr } = await supabase
        .from("scenes")
        .select("*")
        .eq("id", scene_id)
        .eq("user_id", user.id)
        .single();

      if (sceneErr || !scene) {
        return new Response(JSON.stringify({ error: "Scene not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("atlas_api_key")
        .eq("user_id", user.id)
        .single();

      const apiKey = settings?.atlas_api_key;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Atlas Cloud API key not configured. Add it in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const generateRes = await fetch(
        "https://api.atlascloud.ai/api/v1/model/generateVideo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "alibaba/wan-2.6/image-to-video-flash",
            prompt: scene.prompt || "",
            negative_prompt: scene.negative_prompt || "",
            image: scene.seed_image_url,
            resolution: scene.resolution || "720p",
            duration: scene.duration || 5,
            seed: scene.use_random_seed ? -1 : (scene.seed ?? -1),
            shot_type: scene.shot_type || "single",
            enable_prompt_expansion: scene.prompt_expansion ?? true,
            generate_audio: scene.audio_enabled ?? false,
          }),
        }
      );

      const generateResult = await generateRes.json();

      if (!generateRes.ok) {
        return new Response(
          JSON.stringify({ error: generateResult?.message || "Atlas Cloud API error" }),
          { status: generateRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const predictionId = generateResult?.data?.id;
      if (!predictionId) {
        return new Response(
          JSON.stringify({ error: "No prediction ID returned" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: generation, error: genErr } = await supabase
        .from("generations")
        .insert({
          scene_id: scene.id,
          user_id: user.id,
          atlas_task_id: predictionId,
          status: "processing",
          prompt_used: scene.prompt,
          negative_prompt_used: scene.negative_prompt,
          parameters: {
            resolution: scene.resolution,
            duration: scene.duration,
            seed: scene.use_random_seed ? -1 : scene.seed,
            shot_type: scene.shot_type,
            prompt_expansion: scene.prompt_expansion,
            audio: scene.audio_enabled,
            seed_image_url: scene.seed_image_url,
          },
          cost: scene.cost_estimate,
        })
        .select()
        .single();

      if (genErr) {
        return new Response(JSON.stringify({ error: genErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("scenes")
        .update({ status: "processing" })
        .eq("id", scene.id);

      return new Response(JSON.stringify({ generation }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: poll status
    if (action === "poll") {
      const { generation_id } = body;

      const { data: gen } = await supabase
        .from("generations")
        .select("*")
        .eq("id", generation_id)
        .eq("user_id", user.id)
        .single();

      if (!gen || !gen.atlas_task_id) {
        return new Response(JSON.stringify({ error: "Generation not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("atlas_api_key")
        .eq("user_id", user.id)
        .single();

      const pollRes = await fetch(
        `https://api.atlascloud.ai/api/v1/model/prediction/${gen.atlas_task_id}`,
        {
          headers: { Authorization: `Bearer ${settings?.atlas_api_key}` },
        }
      );

      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;

        // Download and persist to storage
        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl, "mp4", "video-results");
          if (stored) {
            permanentUrl = stored;
            console.log("Video saved to storage:", stored);
          } else {
            console.warn("Failed to persist video, using Atlas URL as fallback");
          }
        }

        await supabase
          .from("generations")
          .update({ status: "completed", video_url: permanentUrl, atlas_result_url: atlasUrl })
          .eq("id", gen.id);
        await supabase
          .from("scenes")
          .update({ status: "completed" })
          .eq("id", gen.scene_id);
        return new Response(
          JSON.stringify({ status: "completed", video_url: permanentUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (status === "failed") {
        const errorMsg = pollResult?.data?.error || "Generation failed";
        await supabase
          .from("generations")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", gen.id);
        await supabase
          .from("scenes")
          .update({ status: "failed" })
          .eq("id", gen.scene_id);
        return new Response(
          JSON.stringify({ status: "failed", error: errorMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ status: "processing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
