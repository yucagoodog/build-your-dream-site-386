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
    if (!response.ok) return null;
    const blob = await response.blob();
    const uint8 = new Uint8Array(await blob.arrayBuffer());
    const contentType = blob.type || "image/jpeg";
    const fileName = `${prefix}/${userId}/${crypto.randomUUID()}.${fileExtension}`;
    const { error } = await supabaseAdmin.storage
      .from("seed-images")
      .upload(fileName, uint8, { contentType, upsert: false });
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
      const { image_url, prompt, aspect_ratio, output_format, resolution, source_edit_id, project_id } = body;

      if (!image_url) {
        return new Response(JSON.stringify({ error: "No image URL provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("atlas_api_key")
        .eq("user_id", user.id)
        .single();

      if (!settings?.atlas_api_key) {
        return new Response(
          JSON.stringify({ error: "Atlas Cloud API key not configured. Add it in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const res = resolution || "1k";
      const requestBody: Record<string, any> = {
        model: "google/nano-banana-2/edit",
        images: [image_url],
        prompt: prompt || "Enhance this image to higher quality and resolution with maximum detail",
        output_format: output_format || "png",
        resolution: res,
        enable_sync_mode: false,
        enable_base64_output: false,
      };
      if (aspect_ratio) {
        requestBody.aspect_ratio = aspect_ratio;
      }

      const generateRes = await fetch(
        "https://api.atlascloud.ai/api/v1/model/generateImage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${settings.atlas_api_key}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const generateResult = await generateRes.json();
      console.log("Upscale (nano-banana-2/edit) response:", JSON.stringify(generateResult));
      if (!generateRes.ok) {
        const errMsg = generateResult?.message || generateResult?.error || generateResult?.data?.message || JSON.stringify(generateResult);
        console.error("Upscale error:", errMsg);
        return new Response(
          JSON.stringify({ error: errMsg }),
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

      const { data: edit, error: editErr } = await supabase
        .from("image_edits")
        .insert({
          source_image_id: null,
          parent_edit_id: source_edit_id || null,
          project_id: project_id || null,
          user_id: user.id,
          model: "google/nano-banana-2/edit",
          prompt: prompt || "Enhance to higher quality",
          negative_prompt: "",
          output_size: aspect_ratio || "original",
          seed: null,
          enable_prompt_expansion: false,
          atlas_task_id: predictionId,
          status: "processing",
          cost: res === "4k" ? 0.16 : res === "2k" ? 0.12 : 0.08,
          source_image_urls: [image_url],
        })
        .select()
        .single();

      if (editErr) {
        return new Response(JSON.stringify({ error: editErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ edit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "poll") {
      const { edit_id } = body;

      const { data: edit } = await supabase
        .from("image_edits")
        .select("*")
        .eq("id", edit_id)
        .eq("user_id", user.id)
        .single();

      if (!edit || !edit.atlas_task_id) {
        return new Response(JSON.stringify({ error: "Edit not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: settings } = await supabase
        .from("user_settings")
        .select("atlas_api_key")
        .eq("user_id", user.id)
        .single();

      const pollRes = await fetch(
        `https://api.atlascloud.ai/api/v1/model/prediction/${edit.atlas_task_id}`,
        { headers: { Authorization: `Bearer ${settings?.atlas_api_key}` } }
      );

      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;
        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl, "png", "upscale-results");
          if (stored) permanentUrl = stored;
        }
        await supabase
          .from("image_edits")
          .update({ status: "completed", output_image_url: permanentUrl, atlas_result_url: atlasUrl })
          .eq("id", edit.id);
        return new Response(
          JSON.stringify({ status: "completed", output_image_url: permanentUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else if (status === "failed") {
        const errorMsg = pollResult?.data?.error || "Upscale failed";
        await supabase
          .from("image_edits")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", edit.id);
        return new Response(
          JSON.stringify({ status: "failed", error: errorMsg }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ status: "processing" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
