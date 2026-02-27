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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: start generation with up to 4 images
    if (action === "start") {
      const {
        image_urls, prompt, negative_prompt, output_size,
        seed, enable_prompt_expansion, model, source_image_id, parent_edit_id,
        project_id,
      } = body;

      const urls: string[] = image_urls || [];
      if (urls.length === 0 && !source_image_id) {
        return new Response(JSON.stringify({ error: "No images provided" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (source_image_id && urls.length === 0) {
        const { data: src } = await supabase
          .from("source_images")
          .select("image_url")
          .eq("id", source_image_id)
          .single();
        if (src?.image_url) urls.push(src.image_url);
      }

      if (parent_edit_id) {
        const { data: parentEdit } = await supabase
          .from("image_edits")
          .select("output_image_url")
          .eq("id", parent_edit_id)
          .eq("user_id", user.id)
          .single();
        if (parentEdit?.output_image_url) {
          urls.length = 0;
          urls.push(parentEdit.output_image_url);
        }
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

      console.log("Sending to Atlas Cloud:", JSON.stringify({ model, images: urls, prompt, size: output_size }));
      const generateRes = await fetch(
        "https://api.atlascloud.ai/api/v1/model/generateImage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model || "alibaba/wan-2.6/image-edit",
            images: urls,
            prompt: prompt || "",
            negative_prompt: negative_prompt || "",
            size: output_size || "1280*1280",
            seed: seed ?? -1,
            enable_prompt_expansion: enable_prompt_expansion ?? true,
            enable_interleave: false,
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

      const { data: edit, error: editErr } = await supabase
        .from("image_edits")
        .insert({
          source_image_id: source_image_id || null,
          parent_edit_id: parent_edit_id || null,
          project_id: project_id || null,
          user_id: user.id,
          model: model || "wan-2.6-image-edit",
          prompt: prompt || "",
          negative_prompt: negative_prompt || "",
          output_size: output_size || "1024*1024",
          seed: seed ?? null,
          enable_prompt_expansion: enable_prompt_expansion ?? true,
          atlas_task_id: predictionId,
          status: "processing",
          cost: 0.021 * urls.length,
          source_image_urls: urls,
        })
        .select()
        .single();

      if (editErr) {
        return new Response(JSON.stringify({ error: editErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ edit }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: poll status
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
        `https://api.atlascloud.ai/api/v1/model/prediction/${edit.atlas_task_id}`,
        { headers: { Authorization: `Bearer ${settings?.atlas_api_key}` } }
      );

      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const atlasUrl = pollResult?.data?.outputs?.[0] || null;

        // Download and persist to storage
        let permanentUrl = atlasUrl;
        if (atlasUrl) {
          const stored = await downloadAndStore(supabaseAdmin, user.id, atlasUrl, "png", "image-results");
          if (stored) {
            permanentUrl = stored;
            console.log("Image saved to storage:", stored);
          } else {
            console.warn("Failed to persist image, using Atlas URL as fallback");
          }
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
        const errorMsg = pollResult?.data?.error || "Image edit failed";
        await supabase
          .from("image_edits")
          .update({ status: "failed", error_message: errorMsg })
          .eq("id", edit.id);
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
