import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, MessageCircle, ChevronUp, ChevronDown, AlertCircle } from "lucide-react";
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

  // Get the avatar as ultimate fallback
  const displayChar = charUrl || companion?.avatar_urls?.[0];

  // Check if we have enough content
  const hasAnyAsset = assets.some((a: any) => a.image_url);
  const hasAnyRoom = roomVariants.some((v: any) => v.image_url);
  const needsContent = !hasAnyAsset && !hasAnyRoom;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Needs content warning */}
      {needsContent && (
        <div className="absolute top-12 left-3 right-3 z-20 bg-yellow-500/90 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 border border-yellow-400/30">
          <AlertCircle className="h-4 w-4 text-yellow-900 shrink-0" />
          <p className="text-[11px] text-yellow-900 font-medium">
            Go to Studio → generate emotions & room backgrounds first for the full visual experience!
          </p>
        </div>
      )}

      {/* Full-screen scene view */}
      <div className="relative flex-1 min-h-0">
        {/* Background — full bleed */}
        <div className="absolute inset-0">
          {bgUrl ? (
            <img src={bgUrl} alt="" className="w-full h-full object-cover transition-all duration-700" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-slate-800 via-slate-900 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10" />
        </div>

        {/* Character portrait — centered, large */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center pointer-events-none">
          {displayChar && (
            <img
              src={displayChar}
              alt={companion?.name}
              className="h-[70%] max-h-[500px] object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all duration-500"
            />
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
              {rooms.find((r: any) => r.room_type === companion?.current_room)?.icon || "🏠"}
              {companion?.current_room?.replace(/_/g, " ") || "Living Room"}
            </p>
            <p className="text-[10px] text-white/60 capitalize">
              {timeOfDay === "morning" ? "🌅" : timeOfDay === "afternoon" ? "☀️" : timeOfDay === "evening" ? "🌇" : "🌙"} {timeOfDay}
            </p>
          </div>
        </div>

        {/* Room navigation — bottom of scene */}
        <div className="absolute bottom-2 left-2 right-2 z-10">
          <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
            {rooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => moveToRoom(room.room_type)}
                className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                  companion?.current_room === room.room_type
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

        {/* Last response bubble overlay */}
        {recentChats.length > 0 && recentChats[recentChats.length - 1]?.ai_response && !showChat && (
          <div className="absolute left-3 right-16 top-16 z-10">
            <div className="bg-black/50 backdrop-blur-md rounded-2xl rounded-bl-sm px-3 py-2 max-w-[70%] border border-white/10">
              <p className="text-xs text-white/90 line-clamp-2">
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

          {/* Chat input — always visible */}
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
