import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCompanion } from "@/hooks/use-companion";
import { CompanionSetup } from "./CompanionSetup";
import { CharacterStudio } from "./CharacterStudio";
import { WorldStudio } from "./WorldStudio";
import { ScenarioStudio } from "./ScenarioStudio";
import { PlayMode } from "./PlayMode";
import { Palette, Home, Film, Play, Loader2, Heart } from "lucide-react";

export function CompanionHub() {
  const hook = useCompanion();
  const [mode, setMode] = useState<"studio" | "play">("studio");

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

  return (
    <div className="flex flex-col h-full">
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
