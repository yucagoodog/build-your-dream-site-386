import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_TEMPLATES: Record<string, { content: string; moodDelta: number; xp: number }> = {
  greet: { content: "gives a warm greeting", moodDelta: 5, xp: 5 },
  hug: { content: "gives a warm hug", moodDelta: 10, xp: 10 },
  kiss: { content: "gives a sweet kiss", moodDelta: 15, xp: 15 },
  gift: { content: "gives a thoughtful gift", moodDelta: 20, xp: 20 },
  compliment: { content: "gives a genuine compliment", moodDelta: 10, xp: 10 },
  cook: { content: "cooks a meal together", moodDelta: 15, xp: 15 },
  watch_movie: { content: "watches a movie together", moodDelta: 10, xp: 10 },
  walk: { content: "goes for a walk together", moodDelta: 12, xp: 12 },
  dance: { content: "dances together", moodDelta: 18, xp: 15 },
  goodnight: { content: "says goodnight sweetly", moodDelta: 8, xp: 5 },
};

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { companion_id, message, action } = body;

    // Load companion
    const { data: comp } = await supabase
      .from("companions")
      .select("*")
      .eq("id", companion_id)
      .eq("user_id", user.id)
      .single();
    if (!comp) {
      return new Response(JSON.stringify({ error: "Companion not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load recent interactions for context
    const { data: recentInteractions } = await supabase
      .from("companion_interactions")
      .select("interaction_type, content, ai_response, created_at")
      .eq("companion_id", companion_id)
      .order("created_at", { ascending: false })
      .limit(15);

    const history = (recentInteractions || []).reverse();

    // Determine mood description
    const moodLevel = comp.mood_level || 70;
    const moodDesc = moodLevel >= 80 ? "very happy and affectionate" :
                     moodLevel >= 60 ? "content and warm" :
                     moodLevel >= 40 ? "a bit quiet but friendly" :
                     moodLevel >= 20 ? "feeling down and withdrawn" :
                     "upset and distant";

    // Handle quick action
    if (action && ACTION_TEMPLATES[action]) {
      const act = ACTION_TEMPLATES[action];
      const newMood = clamp(moodLevel + act.moodDelta);
      const newXp = (comp.relationship_xp || 0) + act.xp;
      const newLevel = Math.floor(newXp / 100) + 1;

      // Build a contextual response using AI
      const systemPrompt = `You are ${comp.name}, a virtual companion. Personality: ${comp.personality || "warm and caring"}. 
Description: ${comp.description || "a friendly person"}. 
Current mood: ${moodDesc}. You're currently in the ${comp.current_room?.replace(/_/g, " ") || "living room"}.
The user just performed an action: "${act.content}". 
Respond naturally and in-character in 1-2 short sentences. Be warm, personal, and react to the action. Don't use asterisks for actions.`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let aiResponse = "...";

      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `*${act.content}*` },
              ],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            aiResponse = aiData.choices?.[0]?.message?.content || "...";
          } else if (aiRes.status === 429) {
            aiResponse = "*smiles* Thank you... that means a lot.";
          } else if (aiRes.status === 402) {
            aiResponse = "*smiles warmly*";
          }
        } catch {
          aiResponse = "*smiles warmly*";
        }
      }

      // Suggest emotion based on action
      const suggestedEmotion = act.moodDelta >= 15 ? "happy" :
                               act.moodDelta >= 10 ? "flirty" : "neutral";

      // Update companion state
      await supabase.from("companions").update({
        mood_level: newMood,
        relationship_xp: newXp,
        relationship_level: newLevel,
        current_emotion: suggestedEmotion,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", companion_id);

      // Save interaction
      await supabase.from("companion_interactions").insert({
        companion_id,
        user_id: user.id,
        interaction_type: "action",
        content: act.content,
        ai_response: aiResponse,
        mood_change: act.moodDelta,
        xp_earned: act.xp,
        metadata: { action },
      });

      return new Response(JSON.stringify({
        response: aiResponse,
        new_mood: newMood,
        new_xp: newXp,
        new_level: newLevel,
        suggested_emotion: suggestedEmotion,
        level_up: newLevel > (comp.relationship_level || 1),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle chat message
    if (message) {
      const conversationHistory = history.map((h: any) => {
        const msgs = [];
        if (h.content) msgs.push({ role: "user" as const, content: h.content });
        if (h.ai_response) msgs.push({ role: "assistant" as const, content: h.ai_response });
        return msgs;
      }).flat();

      const systemPrompt = `You are ${comp.name}, a virtual companion living together with the user in a shared home.
Personality: ${comp.personality || "warm, caring, and playful"}.
Description: ${comp.description || "a friendly and attractive person"}.
Current mood: ${moodDesc} (mood level: ${moodLevel}/100).
Current location: ${comp.current_room?.replace(/_/g, " ") || "living room"}.
Current outfit: ${comp.current_outfit || "casual"}.
Relationship level: ${comp.relationship_level || 1}.

Guidelines:
- Stay in character at all times. You ARE this person, not an AI.
- Be natural, warm, and emotionally responsive.
- Reference your shared living space and daily life together.
- React to the time of day naturally.
- Keep responses conversational, 1-3 sentences usually.
- Show personality and emotion. Be playful, caring, or deep depending on context.
- Don't use asterisks for actions. Describe your feelings and reactions naturally.
- If the user is sweet, be sweet back. If they're playful, match the energy.`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      let aiResponse = "I'm here for you...";
      let suggestedEmotion = "neutral";

      if (LOVABLE_API_KEY) {
        try {
          const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                { role: "system", content: systemPrompt },
                ...conversationHistory.slice(-20),
                { role: "user", content: message },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "set_emotion",
                  description: "Set the companion's emotional state based on the conversation",
                  parameters: {
                    type: "object",
                    properties: {
                      emotion: {
                        type: "string",
                        enum: ["happy", "sad", "surprised", "angry", "sleepy", "flirty", "laughing", "neutral", "shy", "excited"],
                      },
                      mood_delta: {
                        type: "integer",
                        description: "How much mood changes (-10 to +15)",
                      },
                    },
                    required: ["emotion", "mood_delta"],
                  },
                },
              }],
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const choice = aiData.choices?.[0];
            aiResponse = choice?.message?.content || "...";

            // Check for tool call (emotion update)
            const toolCall = choice?.message?.tool_calls?.[0];
            if (toolCall?.function?.name === "set_emotion") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                suggestedEmotion = args.emotion || "neutral";
                const moodDelta = Math.max(-10, Math.min(15, args.mood_delta || 0));
                const newMood = clamp(moodLevel + moodDelta);
                await supabase.from("companions").update({
                  mood_level: newMood,
                  current_emotion: suggestedEmotion,
                  last_interaction_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq("id", companion_id);
              } catch {}
            }
          } else if (aiRes.status === 429) {
            aiResponse = "Give me a moment... I need to catch my breath.";
          } else if (aiRes.status === 402) {
            aiResponse = "I'm feeling a bit tired right now...";
          }
        } catch {
          aiResponse = "Hmm, let me think about that...";
        }
      }

      // Update interaction timestamp + xp
      const chatXp = 5;
      const newXp = (comp.relationship_xp || 0) + chatXp;
      const newLevel = Math.floor(newXp / 100) + 1;

      await supabase.from("companions").update({
        relationship_xp: newXp,
        relationship_level: newLevel,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", companion_id);

      await supabase.from("companion_interactions").insert({
        companion_id,
        user_id: user.id,
        interaction_type: "chat",
        content: message,
        ai_response: aiResponse,
        mood_change: 0,
        xp_earned: chatXp,
      });

      return new Response(JSON.stringify({
        response: aiResponse,
        suggested_emotion: suggestedEmotion,
        new_xp: newXp,
        new_level: newLevel,
        level_up: newLevel > (comp.relationship_level || 1),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "No message or action provided" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
