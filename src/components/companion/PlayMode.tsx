import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Heart, Send, Loader2, MessageCircle, ChevronDown,
  Phone, Smile, Shirt, MapPin, X
} from "lucide-react";
import { getCurrentTimeOfDay } from "@/hooks/use-companion";

const QUICK_ACTIONS = [
  { id: "greet", label: "Hi!", icon: "👋" },
  { id: "hug", label: "Hug", icon: "🤗" },
  { id: "kiss", label: "Kiss", icon: "💋" },
  { id: "gift", label: "Gift", icon: "🎁" },
  { id: "compliment", label: "💕", icon: "💕" },
  { id: "cook", label: "Cook", icon: "🍳" },
  { id: "watch_movie", label: "Movie", icon: "🎬" },
  { id: "walk", label: "Walk", icon: "🚶" },
  { id: "dance", label: "Dance", icon: "💃" },
  { id: "goodnight", label: "Night", icon: "🌙" },
];

const EMOTIONS = ["neutral", "happy", "excited", "shy", "loving", "sad", "angry", "sleepy"];
const OUTFITS = ["casual", "formal", "sleepwear", "sporty", "swimwear", "cozy"];

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
  onSwitchToStudio?: () => void;
}

export function PlayMode({
  companion, rooms, assets, roomVariants, interactions,
  sendMessage, performAction, moveToRoom, resolveAsset, resolveBackground, chatLoading,
  onSwitchToStudio
}: Props) {
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [showPanel, setShowPanel] = useState<"emotions" | "outfits" | "rooms" | null>(null);
  const [tapped, setTapped] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleCharTap = useCallback(() => {
    setTapped(true);
    setTimeout(() => setTapped(false), 500);
  }, []);

  const charUrl = resolveAsset();
  const displayChar = charUrl || companion?.avatar_urls?.[0] || null;

  const recentChats = useMemo(() => [...interactions].reverse().slice(-20), [interactions]);
  const lastAiMsg = recentChats[recentChats.length - 1]?.ai_response;

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
  const currentRoom = companion?.current_room || "living_room";
  const timeOfDay = getCurrentTimeOfDay();

  // Available emotions/outfits from generated assets
  const availableEmotions = useMemo(() => {
    const set = new Set<string>();
    assets.filter((a: any) => a.image_url && a.tags?.emotion).forEach((a: any) => set.add(a.tags.emotion));
    EMOTIONS.forEach(e => set.add(e));
    return Array.from(set);
  }, [assets]);

  const availableOutfits = useMemo(() => {
    const set = new Set<string>();
    assets.filter((a: any) => a.image_url && a.tags?.outfit).forEach((a: any) => set.add(a.tags.outfit));
    OUTFITS.forEach(o => set.add(o));
    return Array.from(set);
  }, [assets]);

  const hasAssetFor = useCallback((emotion?: string, outfit?: string) => {
    return !!resolveAsset(emotion, outfit);
  }, [resolveAsset]);

  const switchEmotion = async (emotion: string) => {
    setShowPanel(null);
    // Directly send as a contextual action
    await sendMessage(`*feels ${emotion}*`);
  };

  const switchOutfit = async (outfit: string) => {
    setShowPanel(null);
    await sendMessage(`*changes into ${outfit} clothes*`);
  };

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black">
      {/* Full-screen character view — like a video call */}
      <div className="relative flex-1 min-h-0">
        {/* Character fills the screen */}
        <div className="absolute inset-0 flex items-center justify-center">
          {displayChar ? (
            <div
              className="relative w-full h-full cursor-pointer"
              onClick={handleCharTap}
            >
              <img
                src={displayChar}
                alt={companion?.name}
                className="w-full h-full object-cover transition-all duration-500"
                style={{
                  animation: tapped ? "companion-tap-bounce 0.4s ease-out" : undefined,
                }}
              />
              {/* Tap reaction */}
              {tapped && (
                <span
                  className="absolute top-1/3 left-1/2 -translate-x-1/2 text-3xl pointer-events-none z-20"
                  style={{ animation: "companion-tap-emoji 0.6s ease-out forwards" }}
                >
                  💖
                </span>
              )}
              {/* Mood particles */}
              {moodLevel >= 70 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-sm opacity-0"
                      style={{
                        left: `${25 + Math.random() * 50}%`,
                        bottom: `${40 + Math.random() * 30}%`,
                        animation: `companion-particle ${3 + Math.random() * 2}s ease-out infinite`,
                        animationDelay: `${i * 1.2}s`,
                      }}
                    >
                      {moodLevel >= 80 ? "💕" : "✨"}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-white/40">
              <span className="text-7xl">👤</span>
              <p className="text-xs">Generate character assets in Studio</p>
            </div>
          )}
        </div>

        {/* Top gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none z-10" />

        {/* ─── Top HUD — FaceTime style ─── */}
        <div className="absolute top-3 inset-x-0 z-20 flex flex-col items-center">
          <p className="text-white/60 text-[10px] tracking-widest uppercase font-medium">
            {rooms.find((r: any) => r.room_type === currentRoom)?.icon || "🏠"}{" "}
            {currentRoom.replace(/_/g, " ")} · {timeOfDay}
          </p>
          <p className="text-white text-lg font-semibold mt-0.5">{companion?.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm">{moodEmoji}</span>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />
              <span className="text-[10px] text-white/70">Lvl {companion?.relationship_level || 1}</span>
            </div>
            <div className="w-12 h-1 rounded-full bg-white/20 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-red-400 transition-all duration-500"
                style={{ width: `${xpInLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* ─── Last AI speech bubble — overlay ─── */}
        {lastAiMsg && !showChat && (
          <div className="absolute left-4 right-4 bottom-44 z-20 animate-fade-in">
            <div className="bg-black/60 backdrop-blur-xl rounded-2xl px-4 py-3 border border-white/10">
              <p className="text-sm text-white/90 line-clamp-3 leading-relaxed">{lastAiMsg}</p>
            </div>
          </div>
        )}

        {/* ─── Chat overlay ─── */}
        {showChat && (
          <div className="absolute inset-x-0 bottom-0 top-20 z-30 flex flex-col">
            <div className="flex-1" onClick={() => setShowChat(false)} />
            <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 max-h-[60%] flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <p className="text-xs text-white/60 font-medium">Messages</p>
                <button onClick={() => setShowChat(false)} className="text-white/40 hover:text-white/80">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
                {recentChats.map((chat: any, i: number) => (
                  <div key={chat.id || i} className="space-y-1.5">
                    {chat.content && (
                      <div className="flex justify-end">
                        <div className="bg-blue-500 text-white rounded-2xl rounded-br-md px-3.5 py-2 max-w-[80%]">
                          <p className="text-[13px]">{chat.content}</p>
                        </div>
                      </div>
                    )}
                    {chat.ai_response && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-white/90 rounded-2xl rounded-bl-md px-3.5 py-2 max-w-[80%]">
                          <p className="text-[13px]">{chat.ai_response}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* ─── Emotion/Outfit/Room panels ─── */}
        {showPanel && (
          <div className="absolute inset-x-0 bottom-36 z-20 animate-fade-in">
            <div className="mx-3 bg-black/70 backdrop-blur-xl rounded-2xl border border-white/10 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-white/80 capitalize flex items-center gap-1.5">
                  {showPanel === "emotions" && <><Smile className="h-3.5 w-3.5" /> Emotions</>}
                  {showPanel === "outfits" && <><Shirt className="h-3.5 w-3.5" /> Outfits</>}
                  {showPanel === "rooms" && <><MapPin className="h-3.5 w-3.5" /> Rooms</>}
                </p>
                <button onClick={() => setShowPanel(null)} className="text-white/40 hover:text-white/80">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {showPanel === "emotions" && availableEmotions.map(e => {
                  const hasImg = hasAssetFor(e);
                  return (
                    <button
                      key={e}
                      onClick={() => switchEmotion(e)}
                      disabled={chatLoading}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        companion?.current_emotion === e
                          ? "bg-pink-500/80 text-white"
                          : hasImg
                            ? "bg-white/15 text-white/90 hover:bg-white/25"
                            : "bg-white/5 text-white/40"
                      }`}
                    >
                      {e}
                    </button>
                  );
                })}
                {showPanel === "outfits" && availableOutfits.map(o => {
                  const hasImg = hasAssetFor(undefined, o);
                  return (
                    <button
                      key={o}
                      onClick={() => switchOutfit(o)}
                      disabled={chatLoading}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        companion?.current_outfit === o
                          ? "bg-blue-500/80 text-white"
                          : hasImg
                            ? "bg-white/15 text-white/90 hover:bg-white/25"
                            : "bg-white/5 text-white/40"
                      }`}
                    >
                      {o}
                    </button>
                  );
                })}
                {showPanel === "rooms" && rooms.map((room: any) => (
                  <button
                    key={room.id}
                    onClick={() => { moveToRoom(room.room_type); setShowPanel(null); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      currentRoom === room.room_type
                        ? "bg-green-500/80 text-white"
                        : "bg-white/15 text-white/90 hover:bg-white/25"
                    }`}
                  >
                    <span>{room.icon}</span> {room.room_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Bottom controls — FaceTime-style ─── */}
      <div className="shrink-0 bg-black/90 backdrop-blur-xl border-t border-white/5 safe-bottom z-20">
        {/* Quick action row */}
        <div className="flex gap-0.5 px-2 py-2 overflow-x-auto scrollbar-hide">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={chatLoading}
              className="shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition-all hover:bg-white/10 active:scale-90 disabled:opacity-30"
            >
              <span className="text-lg">{action.icon}</span>
              <span className="text-[9px] text-white/50">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Control bar — emotion, outfit, room, chat, send */}
        <div className="flex items-center gap-2 px-3 pb-2">
          {/* Switcher buttons */}
          <button
            onClick={() => setShowPanel(showPanel === "emotions" ? null : "emotions")}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
              showPanel === "emotions" ? "bg-pink-500/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Smile className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowPanel(showPanel === "outfits" ? null : "outfits")}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
              showPanel === "outfits" ? "bg-blue-500/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <Shirt className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowPanel(showPanel === "rooms" ? null : "rooms")}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
              showPanel === "rooms" ? "bg-green-500/80 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            <MapPin className="h-4 w-4" />
          </button>

          {/* Chat input */}
          <div className="flex-1 flex items-center gap-1.5">
            <button
              onClick={() => setShowChat(!showChat)}
              className={`h-9 w-9 rounded-full shrink-0 flex items-center justify-center transition-all ${
                showChat ? "bg-white/20 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              <MessageCircle className="h-4 w-4" />
            </button>
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              onFocus={() => setShowChat(true)}
              placeholder={`Message ${companion?.name}...`}
              className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-full px-3.5 py-2 text-sm outline-none focus:ring-1 focus:ring-white/30 min-w-0"
              disabled={chatLoading}
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0 rounded-full shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={handleSend}
              disabled={chatLoading || !message.trim()}
            >
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
