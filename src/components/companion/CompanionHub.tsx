import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/hooks/use-companion";
import { CompanionSetup } from "./CompanionSetup";
import { CharacterStudio } from "./CharacterStudio";
import { WorldStudio } from "./WorldStudio";
import { ScenarioStudio } from "./ScenarioStudio";
import { PlayMode } from "./PlayMode";
import { Palette, Home, Film, Play, Loader2, Heart, Wand2, Check } from "lucide-react";
import { DEFAULT_SCENARIOS } from "@/lib/companion-prompts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function CompanionHub() {
  const hook = useCompanion();
  const { user } = useAuth();
  const [mode, setMode] = useState<"studio" | "play">("play");
  const [seeding, setSeeding] = useState(false);

  if (hook.companionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hook.companion) {
    return <CompanionSetup onCreate={hook.createCompanion} />;
  }

  // Check if scenarios are missing (companion created before scenario seeding was added)
  const needsScenarios = hook.scenarios.length === 0;

  const seedScenarios = async () => {
    if (!user || !hook.companion) return;
    setSeeding(true);
    try {
      await supabase.from("companion_scenarios" as any).insert(
        DEFAULT_SCENARIOS.map(s => ({
          ...s,
          companion_id: hook.companion.id,
          user_id: user.id,
        })) as any
      );
      toast({ title: "✨ 8 scenarios added!" });
      // Refresh
      window.location.reload();
    } catch {
      toast({ title: "Failed to seed scenarios", variant: "destructive" });
    } finally {
      setSeeding(false);
    }
  };

  // Count readiness
  const approvedEmotions = hook.assets.filter((a: any) => a.asset_type === "emotion" && a.status === "approved" && a.image_url).length;
  const approvedRooms = hook.roomVariants.filter((v: any) => v.status === "approved" && v.image_url).length;
  const draftRooms = hook.roomVariants.filter((v: any) => v.image_url).length;
  const hasVisuals = approvedEmotions > 0 || hook.assets.some((a: any) => a.image_url);
  const hasRoomBg = approvedRooms > 0 || draftRooms > 0;

  return (
    <div className="flex flex-col" style={{ height: mode === "play" ? "calc(100vh - 3.5rem)" : "auto" }}>
      {/* Header with mode toggle */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <img
              src={hook.companion.avatar_urls?.[0]}
              alt={hook.companion.name}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{hook.companion.name}</p>
            <div className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-pink-400 fill-pink-400" />
              <span className="text-[10px] text-muted-foreground">
                Lvl {hook.companion.relationship_level || 1} · Mood {hook.companion.mood_level || 70}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex bg-muted rounded-lg p-0.5">
          <Button
            variant={mode === "studio" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setMode("studio")}
          >
            <Palette className="h-3.5 w-3.5 mr-1" /> Studio
          </Button>
          <Button
            variant={mode === "play" ? "default" : "ghost"}
            size="sm"
            className="h-7 text-xs px-3"
            onClick={() => setMode("play")}
          >
            <Play className="h-3.5 w-3.5 mr-1" /> Play
          </Button>
        </div>
      </div>

      {/* Content */}
      {mode === "studio" ? (
        <div className="flex-1 overflow-auto">
          {/* Readiness banner */}
          {(!hasVisuals || !hasRoomBg || needsScenarios) && (
            <div className="mx-3 mt-3 p-3 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              <p className="text-xs font-medium text-primary">🚀 Get started checklist:</p>
              <ul className="text-[11px] space-y-1 text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  {hasVisuals ? <Check className="h-3 w-3 text-green-400" /> : <span className="text-yellow-400">○</span>}
                  Generate at least 1 emotion/outfit in Character tab
                </li>
                <li className="flex items-center gap-1.5">
                  {hasRoomBg ? <Check className="h-3 w-3 text-green-400" /> : <span className="text-yellow-400">○</span>}
                  Generate at least 1 room background in World tab
                </li>
                <li className="flex items-center gap-1.5">
                  {!needsScenarios ? <Check className="h-3 w-3 text-green-400" /> : <span className="text-yellow-400">○</span>}
                  Add scenarios ({hook.scenarios.length} added)
                  {needsScenarios && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-5 text-[10px] px-2 ml-1 gap-1"
                      disabled={seeding}
                      onClick={seedScenarios}
                    >
                      {seeding ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />}
                      Add 8 defaults
                    </Button>
                  )}
                </li>
              </ul>
              {hasVisuals && hasRoomBg && (
                <Button size="sm" className="w-full text-xs gap-1" onClick={() => setMode("play")}>
                  <Play className="h-3 w-3" /> Ready to Play!
                </Button>
              )}
            </div>
          )}

          <Tabs defaultValue="character" className="w-full">
            <TabsList className="w-full grid grid-cols-3 mx-0 rounded-none border-b border-border/30">
              <TabsTrigger value="character" className="text-xs gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Palette className="h-3.5 w-3.5" /> Character
              </TabsTrigger>
              <TabsTrigger value="world" className="text-xs gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Home className="h-3.5 w-3.5" /> World
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="text-xs gap-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <Film className="h-3.5 w-3.5" /> Scenarios
              </TabsTrigger>
            </TabsList>
            <TabsContent value="character" className="p-3 mt-0">
              <CharacterStudio {...hook} />
            </TabsContent>
            <TabsContent value="world" className="p-3 mt-0">
              <WorldStudio {...hook} />
            </TabsContent>
            <TabsContent value="scenarios" className="p-3 mt-0">
              <ScenarioStudio {...hook} />
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <PlayMode {...hook} />
      )}
    </div>
  );
}
