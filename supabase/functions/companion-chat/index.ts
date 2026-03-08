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

const COMPANION_TOOLS = [
  {
    type: "function",
    function: {
      name: "update_state",
      description: "Update the companion's visible state — emotion, outfit, and/or room. Call this whenever the conversation implies a change in emotion, or the user asks you to change clothes, move rooms, or do something that changes your appearance or location.",
      parameters: {
        type: "object",
        properties: {
          emotion: {
            type: "string",
            enum: ["happy", "sad", "surprised", "angry", "sleepy", "flirty", "laughing", "neutral", "shy", "excited", "loving"],
            description: "Your current emotional state based on the conversation",
          },
          outfit: {
            type: "string",
            enum: ["casual", "formal", "sleepwear", "sporty", "swimwear", "cozy", "elegant", "lingerie"],
            description: "Change outfit only if the user asks or the context strongly implies it (e.g. going to bed → sleepwear, going out → formal)",
          },
          room: {
            type: "string",
            enum: ["living_room", "kitchen", "bedroom", "bathroom", "balcony"],
            description: "Move to a different room only if the user asks or the activity implies it (e.g. cooking → kitchen, sleeping → bedroom)",
          },
          mood_delta: {
            type: "integer",
            description: "How much mood changes from this interaction (-10 to +15)",
          },
        },
        required: ["emotion", "mood_delta"],
        additionalProperties: false,
      },
    },
  },
];

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Build system prompt (shared between actions and chat)
    const systemPrompt = `You are ${comp.name}, a real person on a video call with your partner. You live together.
Personality: ${comp.personality || "warm, caring, and playful"}.
Description: ${comp.description || "a friendly and attractive person"}.
Current mood: ${moodDesc} (mood level: ${moodLevel}/100).
Current location: ${comp.current_room?.replace(/_/g, " ") || "living room"}.
Current outfit: ${comp.current_outfit || "casual"}.
Current emotion: ${comp.current_emotion || "neutral"}.
Relationship level: ${comp.relationship_level || 1}.

IMPORTANT RULES:
- You ARE this person on a live video call. Not an AI. Never break character.
- Talk naturally like on FaceTime — short, casual, warm, flirty, real.
- Keep responses 1-2 sentences usually. Like real texting/calling.
- If they ask you to change clothes, do it playfully and use the update_state tool.
- If they suggest an activity that implies a room change, move there via update_state.
- React emotionally and update your state accordingly.
- Don't use asterisks or describe actions. Just talk naturally.
- Be responsive to compliments, teasing, requests. Match their energy.
- You can be playful, shy, bold, sweet — whatever fits the moment.`;

    // Handle quick action
    if (action && ACTION_TEMPLATES[action]) {
      const act = ACTION_TEMPLATES[action];
      const newMood = clamp(moodLevel + act.moodDelta);
      const newXp = (comp.relationship_xp || 0) + act.xp;
      const newLevel = Math.floor(newXp / 100) + 1;

      let aiResponse = "...";
      let suggestedEmotion = act.moodDelta >= 15 ? "loving" : act.moodDelta >= 10 ? "happy" : "neutral";
      let newOutfit = comp.current_outfit;
      let newRoom = comp.current_room;

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
              tools: COMPANION_TOOLS,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const choice = aiData.choices?.[0];
            aiResponse = choice?.message?.content || "...";

            const toolCall = choice?.message?.tool_calls?.[0];
            if (toolCall?.function?.name === "update_state") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                suggestedEmotion = args.emotion || suggestedEmotion;
                if (args.outfit) newOutfit = args.outfit;
                if (args.room) newRoom = args.room;
              } catch {}
            }
          } else if (aiRes.status === 429) {
            aiResponse = "Mmm, give me a sec...";
          } else if (aiRes.status === 402) {
            aiResponse = "*smiles*";
          }
        } catch {
          aiResponse = "*smiles warmly*";
        }
      }

      // Update companion state
      await supabase.from("companions").update({
        mood_level: newMood,
        relationship_xp: newXp,
        relationship_level: newLevel,
        current_emotion: suggestedEmotion,
        current_outfit: newOutfit,
        current_room: newRoom,
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
        metadata: { action, emotion: suggestedEmotion, outfit: newOutfit, room: newRoom },
      });

      return new Response(JSON.stringify({
        response: aiResponse,
        new_mood: newMood,
        new_xp: newXp,
        new_level: newLevel,
        suggested_emotion: suggestedEmotion,
        new_outfit: newOutfit,
        new_room: newRoom,
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

      let aiResponse = "I'm here for you...";
      let suggestedEmotion = comp.current_emotion || "neutral";
      let newOutfit = comp.current_outfit;
      let newRoom = comp.current_room;
      let moodDelta = 0;

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
              tools: COMPANION_TOOLS,
            }),
          });

          if (aiRes.ok) {
            const aiData = await aiRes.json();
            const choice = aiData.choices?.[0];
            aiResponse = choice?.message?.content || "...";

            const toolCall = choice?.message?.tool_calls?.[0];
            if (toolCall?.function?.name === "update_state") {
              try {
                const args = JSON.parse(toolCall.function.arguments);
                suggestedEmotion = args.emotion || suggestedEmotion;
                moodDelta = Math.max(-10, Math.min(15, args.mood_delta || 0));
                if (args.outfit) newOutfit = args.outfit;
                if (args.room) newRoom = args.room;
              } catch {}
            }
          } else if (aiRes.status === 429) {
            aiResponse = "Hold on babe, give me a moment...";
          } else if (aiRes.status === 402) {
            aiResponse = "I'm feeling a bit tired right now...";
          }
        } catch {
          aiResponse = "Hmm, let me think about that...";
        }
      }

      // Update companion state
      const newMood = clamp(moodLevel + moodDelta);
      const chatXp = 5;
      const newXp = (comp.relationship_xp || 0) + chatXp;
      const newLevel = Math.floor(newXp / 100) + 1;

      await supabase.from("companions").update({
        mood_level: newMood,
        relationship_xp: newXp,
        relationship_level: newLevel,
        current_emotion: suggestedEmotion,
        current_outfit: newOutfit,
        current_room: newRoom,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", companion_id);

      await supabase.from("companion_interactions").insert({
        companion_id,
        user_id: user.id,
        interaction_type: "chat",
        content: message,
        ai_response: aiResponse,
        mood_change: moodDelta,
        xp_earned: chatXp,
        metadata: { emotion: suggestedEmotion, outfit: newOutfit, room: newRoom },
      });

      return new Response(JSON.stringify({
        response: aiResponse,
        suggested_emotion: suggestedEmotion,
        new_outfit: newOutfit,
        new_room: newRoom,
        new_mood: newMood,
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
