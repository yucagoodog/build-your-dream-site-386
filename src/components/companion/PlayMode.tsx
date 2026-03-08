import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Send, Loader2, MessageCircle, HandHeart, Gift, Music, Moon, Utensils, Footprints } from "lucide-react";
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
  interactions: any[];
  sendMessage: (msg: string) => Promise<any>;
  performAction: (action: string) => Promise<any>;
  moveToRoom: (room: string) => Promise<void>;
  resolveAsset: (emotion?: string, outfit?: string) => string | null;
  resolveBackground: (room?: string, time?: string) => string | null;
  chatLoading: boolean;
}

export function PlayMode({ companion, rooms, interactions, sendMessage, performAction, moveToRoom, resolveAsset, resolveBackground, chatLoading }: Props) {
  const [message, setMessage] = useState("");
  const [showChat, setShowChat] = useState(false);
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

  return (
    <div className="flex flex-col h-full relative">
      {/* Scene view */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          {bgUrl ? (
            <img src={bgUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-muted to-background flex items-center justify-center">
              <p className="text-xs text-muted-foreground">Generate room backgrounds in Studio → World tab</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>

        {/* Character portrait */}
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          {charUrl ? (
            <img
              src={charUrl}
              alt={companion?.name}
              className="h-[60%] max-h-[400px] object-contain drop-shadow-2xl"
            />
          ) : (
            companion?.avatar_urls?.[0] && (
              <img
                src={companion.avatar_urls[0]}
                alt={companion?.name}
                className="h-[50%] max-h-[350px] object-contain rounded-2xl drop-shadow-2xl"
              />
            )
          )}
        </div>

        {/* Status overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <span className="text-lg">{moodEmoji}</span>
            <div>
              <p className="text-xs font-medium">{companion?.name}</p>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-0.5">
                  <Heart className="h-2.5 w-2.5 text-pink-400 fill-pink-400" />
                  <span className="text-[10px] text-muted-foreground">Lvl {companion?.relationship_level || 1}</span>
                </div>
                <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pink-500 to-red-400 transition-all"
                    style={{ width: `${moodLevel}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
            <p className="text-[10px] text-muted-foreground capitalize">
              {rooms.find((r: any) => r.room_type === companion?.current_room)?.icon || "🏠"}{" "}
              {companion?.current_room?.replace(/_/g, " ") || "Living Room"}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize">
              {timeOfDay === "morning" ? "🌅" : timeOfDay === "afternoon" ? "☀️" : timeOfDay === "evening" ? "🌇" : "🌙"} {timeOfDay}
            </p>
          </div>
        </div>

        {/* Room navigation */}
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {rooms.map((room: any) => (
              <button
                key={room.id}
                onClick={() => moveToRoom(room.room_type)}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                  companion?.current_room === room.room_type
                    ? "bg-primary text-primary-foreground"
                    : "bg-background/70 backdrop-blur-sm text-foreground hover:bg-background/90"
                }`}
              >
                <span>{room.icon}</span>
                <span className="hidden sm:inline">{room.room_name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="shrink-0 border-t border-border/30 bg-background/95 backdrop-blur">
        <div className="flex gap-1 px-2 py-2 overflow-x-auto scrollbar-hide">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleAction(action.id)}
              disabled={chatLoading}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-lg transition-all ${action.color} hover:opacity-80 disabled:opacity-40`}
            >
              <span className="text-base">{action.icon}</span>
              <span className="text-[9px] font-medium">{action.label}</span>
            </button>
          ))}
        </div>

        {/* Chat toggle */}
        <div className="border-t border-border/20">
          {!showChat ? (
            <button
              onClick={() => setShowChat(true)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Talk to {companion?.name}...</span>
            </button>
          ) : (
            <div className="space-y-0">
              {/* Chat messages */}
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

              {/* Chat input */}
              <div className="flex gap-2 px-3 py-2 border-t border-border/20">
                <button
                  onClick={() => setShowChat(false)}
                  className="shrink-0 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSend()}
                  placeholder={`Say something to ${companion?.name}...`}
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
          )}
        </div>
      </div>
    </div>
  );
}
