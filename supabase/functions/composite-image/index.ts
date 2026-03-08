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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { base_image_url, overlay_image_url, opacity = 100, scale = 100, position_x = 0, position_y = 0 } =
      await req.json();

    if (!base_image_url || !overlay_image_url) {
      return new Response(
        JSON.stringify({ error: "base_image_url and overlay_image_url are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch both images
    const [baseRes, overlayRes] = await Promise.all([
      fetch(base_image_url),
      fetch(overlay_image_url),
    ]);

    if (!baseRes.ok) throw new Error(`Failed to fetch base image: ${baseRes.status}`);
    if (!overlayRes.ok) throw new Error(`Failed to fetch overlay image: ${overlayRes.status}`);

    const baseBuffer = await baseRes.arrayBuffer();
    const overlayBuffer = await overlayRes.arrayBuffer();

    // Use ImageScript for compositing
    const { Image } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");

    const baseImg = await Image.decode(new Uint8Array(baseBuffer));
    let overlayImg = await Image.decode(new Uint8Array(overlayBuffer));

    // Scale overlay if needed
    if (scale !== 100) {
      const newW = Math.round(overlayImg.width * (scale / 100));
      const newH = Math.round(overlayImg.height * (scale / 100));
      overlayImg = overlayImg.resize(newW, newH);
    }

    // Apply opacity (0-100 -> 0-255)
    if (opacity < 100) {
      const alpha = Math.round((opacity / 100) * 255);
      overlayImg.opacity(alpha / 255);
    }

    // Calculate position
    // position_x/y are percentages (0-100) of the base image, 0,0 = top-left
    const px = Math.round((position_x / 100) * baseImg.width);
    const py = Math.round((position_y / 100) * baseImg.height);

    // Composite overlay onto base
    baseImg.composite(overlayImg, px, py);

    // Encode result
    const resultBytes = await baseImg.encode();

    // Upload to storage using admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const fileName = `composites/${user.id}/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("seed-images")
      .upload(fileName, resultBytes, { contentType: "image/png", upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabaseAdmin.storage.from("seed-images").getPublicUrl(fileName);

    return new Response(
      JSON.stringify({ success: true, result_url: urlData.publicUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Composite error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Compositing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
