import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Heart, Send, Loader2, Palette, X, ChevronUp
} from "lucide-react";
import { getCurrentTimeOfDay } from "@/hooks/use-companion";

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

const QUICK_REPLIES = [
  "Hey babe 💕", "You look amazing", "What are you doing?",
  "Come here", "I miss you", "Change into something cute",
  "Let's go to the bedroom", "Cook something for me",
  "Dance for me 💃", "Good night 🌙",
];

export function PlayMode({
  companion, rooms, assets, interactions,
  sendMessage, performAction, moveToRoom, resolveAsset, resolveBackground, chatLoading,
  onSwitchToStudio
}: Props) {
  const [message, setMessage] = useState("");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [tapped, setTapped] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCharTap = useCallback(() => {
    setTapped(true);
    setTimeout(() => setTapped(false), 500);
    // Quick love tap action
    performAction("compliment");
  }, [performAction]);

  const charUrl = resolveAsset();
  const displayChar = charUrl || companion?.avatar_urls?.[0] || null;

  const recentChats = useMemo(() => [...interactions].reverse().slice(-30), [interactions]);
  const lastAiMsg = recentChats[recentChats.length - 1]?.ai_response;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interactions]);

  const handleSend = async (text?: string) => {
    const msg = text || message.trim();
    if (!msg || chatLoading) return;
    setMessage("");
    setShowQuickReplies(false);
    await sendMessage(msg);
  };

  const moodLevel = companion?.mood_level || 70;
  const moodEmoji = moodLevel >= 80 ? "😍" : moodLevel >= 60 ? "😊" : moodLevel >= 40 ? "😐" : moodLevel >= 20 ? "😢" : "😫";
  const xpInLevel = (companion?.relationship_xp || 0) % 100;
  const currentRoom = companion?.current_room || "living_room";
  const currentOutfit = companion?.current_outfit || "casual";
  const currentEmotion = companion?.current_emotion || "neutral";
  const timeOfDay = getCurrentTimeOfDay();

  // Call duration simulation
  const [callTime, setCallTime] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setCallTime(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const callDuration = `${Math.floor(callTime / 60).toString().padStart(2, "0")}:${(callTime % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-black">
      {/* ─── Full-screen character — the video feed ─── */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0">
          {displayChar ? (
            <div className="relative w-full h-full cursor-pointer" onClick={handleCharTap}>
              <img
                src={displayChar}
                alt={companion?.name}
                className="w-full h-full object-cover"
                style={{
                  animation: tapped ? "companion-tap-bounce 0.4s ease-out" : "companion-breathe 4s ease-in-out infinite",
                }}
              />
              {/* Tap heart */}
              {tapped && (
                <span
                  className="absolute top-1/3 left-1/2 -translate-x-1/2 text-4xl pointer-events-none z-20"
                  style={{ animation: "companion-tap-emoji 0.6s ease-out forwards" }}
                >
                  💖
                </span>
              )}
              {/* Mood sparkles */}
              {moodLevel >= 70 && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="absolute text-sm opacity-0"
                      style={{
                        left: `${25 + i * 20}%`,
                        bottom: `${40 + i * 10}%`,
                        animationName: 'companion-particle',
                        animationDuration: `${3 + i * 0.5}s`,
                        animationTimingFunction: 'ease-out',
                        animationIterationCount: 'infinite',
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
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40">
              <span className="text-7xl">👤</span>
              <p className="text-xs">Generate assets in Studio first</p>
            </div>
          )}
        </div>

        {/* Top gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />

        {/* ─── Top HUD — Video call style ─── */}
        <div className="absolute top-0 inset-x-0 z-20 pt-3 px-4">
          <div className="flex items-center justify-between">
            {/* Studio button */}
            {onSwitchToStudio && (
              <button
                onClick={onSwitchToStudio}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white/70 hover:bg-white/20 text-[11px] font-medium transition-all"
              >
                <Palette className="h-3 w-3" /> Studio
              </button>
            )}
            <div className="flex-1" />
            {/* Call duration */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-white/70 font-mono">{callDuration}</span>
            </div>
          </div>

          {/* Name + status */}
          <div className="flex flex-col items-center mt-2">
            <p className="text-white text-xl font-semibold tracking-tight">{companion?.name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-white/50 capitalize">
                {currentEmotion} · {currentOutfit} · {currentRoom.replace(/_/g, " ")}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm">{moodEmoji}</span>
              <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />
              <span className="text-[10px] text-white/60">Lvl {companion?.relationship_level || 1}</span>
              <div className="w-14 h-1 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-500"
                  style={{ width: `${xpInLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── Chat bubbles overlaid on screen ─── */}
        <div className="absolute inset-x-0 bottom-0 z-20 max-h-[45%] overflow-y-auto px-4 pb-2 flex flex-col justify-end">
          <div className="space-y-1.5">
            {recentChats.slice(-6).map((chat: any, i: number) => (
              <div key={chat.id || i} className="space-y-1">
                {chat.content && (
                  <div className="flex justify-end">
                    <div className="bg-blue-500/80 backdrop-blur-sm text-white rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[75%]">
                      <p className="text-[13px] leading-snug">{chat.content}</p>
                    </div>
                  </div>
                )}
                {chat.ai_response && (
                  <div className="flex justify-start">
                    <div className="bg-white/15 backdrop-blur-sm text-white/90 rounded-2xl rounded-bl-sm px-3 py-1.5 max-w-[75%]">
                      <p className="text-[13px] leading-snug">{chat.ai_response}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* ─── Bottom input area ─── */}
      <div className="shrink-0 bg-black z-30 safe-bottom">
        {/* Quick replies */}
        {showQuickReplies && (
          <div className="px-3 py-2 border-t border-white/5 animate-fade-in">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map(reply => (
                <button
                  key={reply}
                  onClick={() => handleSend(reply)}
                  disabled={chatLoading}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-xs font-medium hover:bg-white/20 active:scale-95 transition-all disabled:opacity-30"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
              showQuickReplies ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"
            }`}
          >
            <ChevronUp className={`h-4 w-4 transition-transform ${showQuickReplies ? "rotate-180" : ""}`} />
          </button>
          <input
            ref={inputRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder={`Message ${companion?.name}...`}
            className="flex-1 bg-white/10 text-white placeholder-white/30 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-1 focus:ring-white/30 min-w-0"
            disabled={chatLoading}
          />
          <Button
            size="sm"
            className="h-9 w-9 p-0 rounded-full shrink-0 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={() => handleSend()}
            disabled={chatLoading || !message.trim()}
          >
            {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
