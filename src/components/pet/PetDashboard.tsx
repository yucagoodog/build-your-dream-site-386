import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Utensils, Gamepad2, Moon, Shirt, Swords, Music,
  MessageSquare, Loader2, Sparkles, Clock, Star,
} from "lucide-react";
import { calcDecayedStats, getMood, getLevelProgress } from "@/hooks/use-pet";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const ACTIONS = [
  { id: "feed", label: "Feed", icon: Utensils, color: "text-orange-400" },
  { id: "play", label: "Play", icon: Gamepad2, color: "text-green-400" },
  { id: "rest", label: "Rest", icon: Moon, color: "text-blue-400" },
  { id: "style", label: "Style", icon: Shirt, color: "text-pink-400" },
  { id: "adventure", label: "Adventure", icon: Swords, color: "text-purple-400" },
  { id: "dance", label: "Dance", icon: Music, color: "text-yellow-400" },
];

interface PetDashboardProps {
  pet: any;
  events: any[];
  interact: (actionName: string, customPrompt?: string) => Promise<void>;
  acting: boolean;
  generationStatus: string;
  lastResult: { url: string; type: string } | null;
  pollState: any;
}

export function PetDashboard({ pet, events, interact, acting, generationStatus, lastResult, pollState }: PetDashboardProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  const decayed = useMemo(() => calcDecayedStats(pet), [pet]);
  const mood = useMemo(() => getMood(decayed), [decayed]);
  const levelInfo = useMemo(() => getLevelProgress(pet.xp), [pet.xp]);

  const latestImage = lastResult?.type === "image" ? lastResult.url
    : events.find((e: any) => e.result_image_url)?.result_image_url
    || pet.avatar_urls?.[0];

  const handleAction = (actionId: string) => {
    interact(actionId);
  };

  const handleCustomAction = () => {
    if (!customPrompt.trim()) return;
    interact("custom", customPrompt.trim());
    setCustomPrompt("");
    setShowCustom(false);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Pet Portrait */}
      <Card className="overflow-hidden">
        <div className="relative aspect-square max-h-[320px] bg-muted">
          {generationStatus === "processing" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur z-10">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Generating scene...</p>
            </div>
          ) : null}
          {lastResult?.type === "video" && lastResult.url ? (
            <video src={lastResult.url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
          ) : latestImage ? (
            <img src={latestImage} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">{mood.emoji}</div>
          )}
          {/* Mood badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur text-xs">
              <span>{mood.emoji}</span>
              <span className={mood.color}>{mood.label}</span>
            </Badge>
          </div>
          {/* Level badge */}
          <div className="absolute top-3 right-3">
            <Badge variant="secondary" className="gap-1 bg-background/80 backdrop-blur text-xs">
              <Star className="h-3 w-3 text-yellow-400" />
              Lv.{levelInfo.level}
            </Badge>
          </div>
        </div>
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">{pet.name}</h2>
            <span className="text-[10px] text-muted-foreground">{levelInfo.xpToNext} XP to next level</span>
          </div>
          <Progress value={levelInfo.progress} className="h-1.5" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatBar label="Hunger" value={decayed.hunger} emoji="🍔" color="bg-orange-400" />
        <StatBar label="Happy" value={decayed.happiness} emoji="😊" color="bg-green-400" />
        <StatBar label="Energy" value={decayed.energy} emoji="⚡" color="bg-blue-400" />
      </div>

      {/* Action Buttons */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map(a => (
              <Button
                key={a.id}
                variant="outline"
                size="sm"
                disabled={acting || generationStatus === "processing"}
                onClick={() => handleAction(a.id)}
                className="flex-col h-16 gap-1 text-xs"
              >
                <a.icon className={cn("h-5 w-5", a.color)} />
                {a.label}
              </Button>
            ))}
          </div>

          {/* Custom prompt */}
          <div className="mt-3">
            {!showCustom ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustom(true)}
                className="w-full gap-1.5 text-xs text-muted-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Custom scenario...
              </Button>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Describe a custom scenario for your pet..."
                  className="min-h-[60px] text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCustomAction} disabled={!customPrompt.trim() || acting} className="gap-1.5 flex-1">
                    <Sparkles className="h-3.5 w-3.5" />
                    Generate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCustom(false); setCustomPrompt(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Event Timeline */}
      <Card>
        <CardContent className="p-3">
          <h3 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            Memory Book
          </h3>
          {events.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No memories yet — interact with your pet!</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {events.map((ev: any) => (
                  <div key={ev.id} className="flex gap-2 items-start">
                    {ev.result_image_url ? (
                      <img src={ev.result_image_url} alt="" className="h-12 w-12 rounded-md object-cover flex-shrink-0" />
                    ) : ev.result_video_url ? (
                      <video src={ev.result_video_url} className="h-12 w-12 rounded-md object-cover flex-shrink-0" muted playsInline preload="none" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium capitalize">{ev.action_name.replace("_", " ")}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{ev.prompt_used}</p>
                      <p className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatBar({ label, value, emoji, color }: { label: string; value: number; emoji: string; color: string }) {
  return (
    <Card>
      <CardContent className="p-2 text-center space-y-1">
        <span className="text-sm">{emoji}</span>
        <div className="text-[10px] text-muted-foreground">{label}</div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
        </div>
        <div className="text-[10px] font-medium tabular-nums">{value}%</div>
      </CardContent>
    </Card>
  );
}
