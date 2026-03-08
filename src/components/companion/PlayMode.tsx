import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, MessageCircle, ChevronUp, ChevronDown } from "lucide-react";
import { getCurrentTimeOfDay } from "@/hooks/use-companion";

const QUICK_ACTIONS = [
  { id: "greet", label: "Hi!", icon: "👋", color: "bg-blue-500/20 text-blue-400" },
  { id: "hug", label: "Hug", icon: "🤗", color: "bg-pink-500/20 text-pink-400" },
  { id: "kiss", label: "Kiss", icon: "💋", color: "bg-red-500/20 text-red-400" },
  { id: "gift", label: "Gift", icon: "🎁", color: "bg-purple-500/20 text-purple-400" },
  { id: "compliment", label: "Compliment", icon: "💕", color: "bg-pink-500/20 text-pink-400" },
  { id: "cook", label: "Cook", icon: "🍳", color: "bg-orange-500/20 text-orange-400" },
  { id: "watch_movie", label: "Movie", icon: "🎬", color: "bg-indigo-500/20 text-indigo-400" },
  { id: "walk", label: "Walk", icon: "🚶", color: "bg-green-500/20 text-green-400" },
  { id: "dance", label: "Dance", icon: "💃", color: "bg-yellow-500/20 text-yellow-400" },
  { id: "goodnight", label: "Night", icon: "🌙", color: "bg-slate-500/20 text-slate-400" },
];

// Themed gradient backgrounds per room + time of day when no generated bg exists
const ROOM_GRADIENTS: Record<string, Record<string, string>> = {
  living_room: {
    morning: "from-amber-900/80 via-orange-950/60 to-stone-950",
    afternoon: "from-amber-800/70 via-yellow-950/50 to-stone-950",
    evening: "from-orange-950/80 via-red-950/60 to-stone-950",
    night: "from-indigo-950 via-slate-950 to-stone-950",
  },
  kitchen: {
    morning: "from-yellow-900/70 via-amber-950/60 to-stone-950",
    afternoon: "from-orange-900/60 via-amber-950/50 to-stone-950",
    evening: "from-red-950/70 via-orange-950/60 to-stone-950",
    night: "from-slate-900 via-gray-950 to-stone-950",
  },
  bedroom: {
    morning: "from-rose-900/50 via-pink-950/40 to-slate-950",
    afternoon: "from-rose-900/40 via-purple-950/30 to-slate-950",
    evening: "from-purple-950/70 via-indigo-950/60 to-slate-950",
    night: "from-indigo-950 via-purple-950 to-slate-950",
  },
  bathroom: {
    morning: "from-cyan-900/50 via-teal-950/40 to-slate-950",
    afternoon: "from-sky-900/40 via-cyan-950/30 to-slate-950",
    evening: "from-teal-950/60 via-cyan-950/50 to-slate-950",
    night: "from-slate-950 via-cyan-950/30 to-slate-950",
  },
  balcony: {
    morning: "from-orange-800/70 via-rose-900/50 to-sky-950",
    afternoon: "from-sky-800/60 via-blue-900/40 to-indigo-950",
    evening: "from-orange-900/80 via-rose-950/60 to-purple-950",
    night: "from-indigo-950 via-blue-950 to-slate-950",
  },
};

const DEFAULT_GRADIENT: Record<string, string> = {
  morning: "from-amber-900/60 via-orange-950/40 to-slate-950",
  afternoon: "from-sky-900/50 via-blue-950/40 to-slate-950",
  evening: "from-orange-950/70 via-rose-950/50 to-purple-950",
  night: "from-indigo-950 via-slate-950 to-slate-950",
};

interface Props {
  companion: any;
  rooms: any[];
  assets: any[];
  roomVariants: any[];
  interactions: any[];
  sendMessage: (msg: string) => Promise<any>;
  performAction: (action: string) => Promise<any>;
  moveToRoom: (room: string) => Promise<void>;
  resolveAsset: (emotion?: string, outfit?: string) => string | null;
  resolveBackground: (room?: string, time?: string) => string | null;
  chatLoading: boolean;
}

export function PlayMode({ companion, rooms, assets, roomVariants, interactions, sendMessage, performAction, moveToRoom, resolveAsset, resolveBackground, chatLoading }: Props) {
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showActions, setShowActions] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const bgUrl = resolveBackground();
  const charUrl = resolveAsset();
  const timeOfDay = getCurrentTimeOfDay();
  const currentRoom = companion?.current_room || "living_room";

  // The character image: generated asset → first avatar_url → null
  const displayChar = charUrl || companion?.avatar_urls?.[0] || null;

  // Background: generated room → themed gradient
  const roomGradients = ROOM_GRADIENTS[currentRoom] || DEFAULT_GRADIENT;
  const fallbackGradient = roomGradients[timeOfDay] || roomGradients.afternoon || DEFAULT_GRADIENT.afternoon;

  const recentChats = [...interactions].reverse().slice(-20);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interactions]);

  const handleSend = async () => {
    if (!message.trim() || chatLoading) return;
    const msg = message;
    setMessage("");
    await sendMessage(msg);
  };

  const handleAction = async (actionId: string) => {
    if (chatLoading) return;
    await performAction(actionId);
  };

  const moodLevel = companion?.mood_level || 70;
  const moodEmoji = moodLevel >= 80 ? "😍" : moodLevel >= 60 ? "😊" : moodLevel >= 40 ? "😐" : moodLevel >= 20 ? "😢" : "😫";
  const xpInLevel = (companion?.relationship_xp || 0) % 100;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Full-screen scene view */}
      <div className="relative flex-1 min-h-0">
        {/* Background — generated image OR themed gradient */}
        <div className="absolute inset-0">
          {bgUrl ? (
            <img src={bgUrl} alt="" className="w-full h-full object-cover transition-all duration-700" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-b ${fallbackGradient}`}>
              {/* Ambient room decoration */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white/5 blur-3xl" />
                <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-primary/5 blur-3xl" />
              </div>
            </div>
          )}
          {/* Overlay gradients for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
        </div>

        {/* Character portrait — centered hero with idle animations */}
        <div className="absolute inset-0 flex items-end justify-center pointer-events-none">
          {displayChar ? (
            <div
              className="relative h-[75%] max-h-[550px] w-auto animate-fade-in cursor-pointer pointer-events-auto"
              onClick={handleCharTap}
              style={{
                animation: `companion-float 4s ease-in-out infinite, companion-breathe 3.5s ease-in-out infinite${tapped ? ", companion-tap-bounce 0.4s ease-out" : ""}`,
              }}
            >
              <img
                src={displayChar}
                alt={companion?.name}
                className="h-full w-auto object-contain drop-shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-all duration-500"
                style={{ filter: "drop-shadow(0 0 60px rgba(var(--primary-rgb, 139 92 246), 0.15))" }}
              />
              {/* Mood particles */}
              {moodLevel >= 70 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-sm opacity-0"
                      style={{
                        left: `${20 + Math.random() * 60}%`,
                        bottom: `${30 + Math.random() * 40}%`,
                        animation: `companion-particle ${3 + Math.random() * 2}s ease-out infinite`,
                        animationDelay: `${i * 0.8}s`,
                      }}
                    >
                      {moodLevel >= 80 ? "💕" : "✨"}
                    </span>
                  ))}
                </div>
              )}
              {/* Tap reaction emoji */}
              {tapped && (
                <span
                  className="absolute top-1/4 left-1/2 -translate-x-1/2 text-2xl pointer-events-none"
                  style={{ animation: "companion-tap-emoji 0.6s ease-out forwards" }}
                >
                  💖
                </span>
              )}
            </div>
          ) : (
            <div className="h-[60%] aspect-[3/4] rounded-t-full bg-gradient-to-t from-muted/30 to-muted/10 border border-white/5 flex items-center justify-center mb-0">
              <span className="text-6xl opacity-30">👤</span>
            </div>
          )}
        </div>

        {/* Status HUD — top */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between z-10">
          <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 flex items-center gap-2.5 border border-white/10">
            <span className="text-xl">{moodEmoji}</span>
            <div>
              <p className="text-xs font-semibold text-white">{companion?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5 text-pink-400 fill-pink-400" />
                  <span className="text-[10px] text-white/70">Lvl {companion?.relationship_level || 1}</span>
                </div>
                <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-red-400 transition-all duration-500"
                    style={{ width: `${xpInLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-black/50 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
            <p className="text-[10px] text-white/80 capitalize flex items-center gap-1">
              {rooms.find((r: any) => r.room_type === currentRoom)?.icon || "🏠"}
              {currentRoom.replace(/_/g, " ")}
            </p>
            <p className="text-[10px] text-white/60 capitalize">
              {timeOfDay === "morning" ? "🌅" : timeOfDay === "afternoon" ? "☀️" : timeOfDay === "evening" ? "🌇" : "🌙"} {timeOfDay}
            </p>
          </div>
        </div>

        {/* Room navigation — bottom of scene area */}
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {rooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => moveToRoom(room.room_type)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  currentRoom === room.room_type
                    ? "bg-primary/90 text-primary-foreground border-primary shadow-lg shadow-primary/30"
                    : "bg-black/40 backdrop-blur-md text-white/80 border-white/10 hover:bg-black/60"
                }`}
              >
                <span>{room.icon}</span>
                <span className="hidden sm:inline">{room.room_name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Last response speech bubble */}
        {recentChats.length > 0 && recentChats[recentChats.length - 1]?.ai_response && !showChat && (
          <div className="absolute left-3 right-16 top-16 z-10">
            <div className="bg-black/50 backdrop-blur-md rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] border border-white/10 animate-fade-in">
              <p className="text-xs text-white/90 line-clamp-3">
                {recentChats[recentChats.length - 1].ai_response}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Interactive controls — bottom panel */}
      <div className="shrink-0 bg-background border-t border-border/30">
        {/* Quick actions — collapsible */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showActions ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          Actions
        </button>
        {showActions && (
          <div className="flex gap-1 px-2 pb-2 overflow-x-auto scrollbar-hide">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action.id}
                onClick={() => handleAction(action.id)}
                disabled={chatLoading}
                className={`shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${action.color} hover:scale-105 active:scale-95 disabled:opacity-40`}
              >
                <span className="text-base">{action.icon}</span>
                <span className="text-[9px] font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div className="border-t border-border/20">
          {showChat && (
            <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-2">
              {recentChats.map((chat: any, i: number) => (
                <div key={chat.id || i} className="space-y-1">
                  {chat.content && (
                    <div className="flex justify-end">
                      <div className="bg-primary/20 text-foreground rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[80%]">
                        <p className="text-xs">{chat.content}</p>
                      </div>
                    </div>
                  )}
                  {chat.ai_response && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-1.5 max-w-[80%]">
                        <p className="text-xs">{chat.ai_response}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Chat input */}
          <div className="flex gap-2 px-3 py-2">
            <button
              onClick={() => setShowChat(!showChat)}
              className="shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              onFocus={() => setShowChat(true)}
              placeholder={`Talk to ${companion?.name}...`}
              className="flex-1 bg-input rounded-full px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
              disabled={chatLoading}
            />
            <Button
              size="sm"
              className="h-8 w-8 p-0 rounded-full shrink-0"
              onClick={handleSend}
              disabled={chatLoading || !message.trim()}
            >
              {chatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
