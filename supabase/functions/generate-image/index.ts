import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // ACTION: start edit
    if (action === "start") {
      const { source_image_id, prompt, negative_prompt, output_size, seed, enable_prompt_expansion, model, parent_edit_id } = body;

      // Get source image
      const { data: sourceImage, error: srcErr } = await supabase
        .from("source_images")
        .select("*")
        .eq("id", source_image_id)
        .eq("user_id", user.id)
        .single();

      if (srcErr || !sourceImage) {
        return new Response(JSON.stringify({ error: "Source image not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user's API key
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

      // Determine image URL - use parent edit output if chaining, otherwise source
      let imageUrl = sourceImage.image_url;
      if (parent_edit_id) {
        const { data: parentEdit } = await supabase
          .from("image_edits")
          .select("output_image_url")
          .eq("id", parent_edit_id)
          .eq("user_id", user.id)
          .single();
        if (parentEdit?.output_image_url) {
          imageUrl = parentEdit.output_image_url;
        }
      }

      // Call Atlas Cloud Image Edit API
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
            image: imageUrl,
            prompt: prompt || "",
            negative_prompt: negative_prompt || "",
            size: output_size || "1024*1024",
            seed: seed ?? -1,
            enable_prompt_expansion: enable_prompt_expansion ?? true,
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

      // Create image_edits record
      const { data: edit, error: editErr } = await supabase
        .from("image_edits")
        .insert({
          source_image_id,
          parent_edit_id: parent_edit_id || null,
          user_id: user.id,
          model: model || "wan-2.6-image-edit",
          prompt: prompt || "",
          negative_prompt: negative_prompt || "",
          output_size: output_size || "1024*1024",
          seed: seed ?? null,
          enable_prompt_expansion: enable_prompt_expansion ?? true,
          atlas_task_id: predictionId,
          status: "processing",
          cost: 0.021,
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
        {
          headers: { Authorization: `Bearer ${settings?.atlas_api_key}` },
        }
      );

      const pollResult = await pollRes.json();
      const status = pollResult?.data?.status;

      if (status === "completed" || status === "succeeded") {
        const outputUrl = pollResult?.data?.outputs?.[0] || null;
        await supabase
          .from("image_edits")
          .update({ status: "completed", output_image_url: outputUrl, atlas_result_url: outputUrl })
          .eq("id", edit.id);
        return new Response(
          JSON.stringify({ status: "completed", output_image_url: outputUrl }),
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
