/** Centralized prompt suggestions & defaults for the Companion system */

export const EMOTIONS = ["happy", "sad", "surprised", "angry", "sleepy", "flirty", "laughing", "shy", "excited"] as const;
export const OUTFITS = ["casual", "formal", "sleepwear", "workout", "swimwear", "evening"] as const;
export const TIMES = ["morning", "afternoon", "evening", "night"] as const;

// ─── Emotion prompt suggestions ───
export const EMOTION_PROMPTS: Record<string, string> = {
  happy: "smiling warmly, genuinely happy, bright eyes, joyful expression, looking at camera",
  sad: "looking sad, melancholic expression, downcast eyes, vulnerable, soft lighting",
  surprised: "eyes wide, mouth slightly open, surprised expression, amazed, candid",
  angry: "frustrated expression, furrowed brows, intense gaze, dramatic lighting",
  sleepy: "drowsy, half-closed eyes, yawning, cozy and tired, soft warm light",
  flirty: "playful smirk, confident, slightly tilted head, charming gaze, alluring",
  laughing: "laughing heartily, eyes crinkled, genuine laughter, candid joy, bright light",
  shy: "bashful expression, slight blush, looking away, cute and timid, soft light",
  excited: "super excited, animated expression, enthusiastic energy, bright eyes",
};

// ─── Outfit prompt suggestions ───
export const OUTFIT_PROMPTS: Record<string, string> = {
  casual: "wearing casual comfortable clothes, relaxed style, natural pose",
  formal: "wearing elegant formal attire, sophisticated look, confident posture",
  sleepwear: "wearing cozy pajamas, comfortable sleepwear, relaxed at home",
  workout: "wearing athletic sportswear, active lifestyle, energetic pose",
  swimwear: "wearing stylish swimwear, summer beach look, natural lighting",
  evening: "wearing glamorous evening outfit, dressed up for a night out, elegant",
};

// ─── Room prompt suggestions ───
export const ROOM_PROMPTS: Record<string, string> = {
  living_room: "cozy modern living room with warm lighting, soft plush sofa, decorative plants, bookshelf, large windows with sheer curtains, wooden floor, ambient mood",
  kitchen: "modern kitchen with marble counters, warm ambient lighting, copper pots hanging, fresh herbs on windowsill, breakfast bar with stools",
  bedroom: "cozy bedroom with soft lighting, comfortable king-size bed with fluffy pillows, warm blankets, bedside lamps, soft carpet, intimate atmosphere",
  bathroom: "elegant modern bathroom with soft lighting, freestanding bathtub, candles, marble tiles, large mirror, plants",
  balcony: "spacious balcony with city skyline view, string lights, comfortable lounge chair, potted plants, sunset colors",
};

// ─── Pre-built scenarios ───
export const DEFAULT_SCENARIOS = [
  {
    scenario_name: "Morning Coffee",
    scenario_type: "daily",
    prompt_template: "making morning coffee in the kitchen, steam rising from the cup, warm golden sunlight through the window, cozy morning atmosphere, smiling softly",
    required_room: "kitchen",
    required_outfit: "sleepwear",
    required_emotion: "happy",
  },
  {
    scenario_name: "Movie Night",
    scenario_type: "activity",
    prompt_template: "watching a movie together on the couch, cozy blanket, dim ambient lighting, popcorn, TV glow illuminating the face, comfortable and content",
    required_room: "living_room",
    required_outfit: "casual",
    required_emotion: "happy",
  },
  {
    scenario_name: "Cooking Together",
    scenario_type: "activity",
    prompt_template: "cooking a delicious meal together in the kitchen, chopping vegetables, stirring a pot, flour on cheek, laughing, warm kitchen lighting",
    required_room: "kitchen",
    required_outfit: "casual",
    required_emotion: "laughing",
  },
  {
    scenario_name: "Getting Ready",
    scenario_type: "daily",
    prompt_template: "getting ready for the evening, doing makeup in the mirror, elegant dress, excited expression, bedroom vanity, soft warm lighting",
    required_room: "bedroom",
    required_outfit: "evening",
    required_emotion: "excited",
  },
  {
    scenario_name: "Sunset on Balcony",
    scenario_type: "special",
    prompt_template: "enjoying a beautiful sunset on the balcony, golden hour light, glass of wine, city skyline in background, romantic atmosphere, wind in hair",
    required_room: "balcony",
    required_outfit: "casual",
    required_emotion: "flirty",
  },
  {
    scenario_name: "Lazy Morning",
    scenario_type: "daily",
    prompt_template: "just woke up in bed, messy hair, stretching, soft morning light through curtains, sleepy smile, cozy bedsheets",
    required_room: "bedroom",
    required_outfit: "sleepwear",
    required_emotion: "sleepy",
  },
  {
    scenario_name: "Bath Time",
    scenario_type: "daily",
    prompt_template: "relaxing in a warm bubble bath, candles around the bathtub, steam rising, peaceful expression, soft ambient lighting",
    required_room: "bathroom",
    required_outfit: "swimwear",
    required_emotion: "happy",
  },
  {
    scenario_name: "Goodnight",
    scenario_type: "daily",
    prompt_template: "saying goodnight, tucked in bed, soft bedside lamp, sleepy eyes, warm smile, holding a plush toy, cozy nighttime atmosphere",
    required_room: "bedroom",
    required_outfit: "sleepwear",
    required_emotion: "sleepy",
  },
];

// ─── Time-of-day modifiers ───
export const TIME_MODIFIERS: Record<string, string> = {
  morning: "early morning golden sunlight streaming through windows, warm dawn light, fresh atmosphere",
  afternoon: "bright afternoon daylight, natural lighting, vibrant colors",
  evening: "warm golden hour sunset light, cozy evening atmosphere, amber tones",
  night: "soft dim night lighting, ambient warm lamps, moonlight through windows, intimate mood",
};

// ─── Prompt builder helpers ───
export function buildCharacterPrompt(opts: {
  name: string;
  description: string;
  personality?: string;
  emotion?: string;
  outfit?: string;
  customPrompt?: string;
}): string {
  const parts = [
    opts.name,
    opts.description || "a person",
    opts.personality ? `personality: ${opts.personality}` : "",
    opts.emotion ? EMOTION_PROMPTS[opts.emotion] || opts.emotion : "",
    opts.outfit ? OUTFIT_PROMPTS[opts.outfit] || opts.outfit : "",
    opts.customPrompt || "",
    "high quality portrait, consistent character, photorealistic",
  ].filter(Boolean);
  return parts.join(", ");
}

export function buildRoomPrompt(basePrompt: string, timeOfDay: string, weather?: string): string {
  const timeMod = TIME_MODIFIERS[timeOfDay] || timeOfDay;
  const weatherMod = weather === "rainy" ? "rain visible through windows, wet atmosphere" :
                     weather === "cloudy" ? "overcast sky visible, soft diffused light" : "";
  return [
    basePrompt,
    timeMod,
    weatherMod,
    "interior photography, wide angle, detailed environment, no people, photorealistic",
  ].filter(Boolean).join(", ");
}
