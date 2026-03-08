import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Sparkles, Check, Image, Pencil, ChevronDown, ChevronUp, Wand2 } from "lucide-react";
import { AssetCard } from "./AssetCard";
import { DEFAULT_SCENARIOS } from "@/lib/companion-prompts";

const SCENARIO_TYPES = [
  { value: "daily", label: "Daily Routine", icon: "☀️" },
  { value: "activity", label: "Activity", icon: "🎮" },
  { value: "special", label: "Special Event", icon: "🎉" },
  { value: "conversation", label: "Conversation", icon: "💬" },
];

interface Props {
  companion: any;
  scenarios: any[];
  assets: any[];
  createScenario: (name: string, type: string, prompt: string, room?: string, outfit?: string, emotion?: string) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  generateScenario: (id: string) => Promise<void>;
  updateAssetStatus: (id: string, status: "approved" | "rejected") => Promise<void>;
  generating: boolean;
  rooms: any[];
}

export function ScenarioStudio({ companion, scenarios, assets, createScenario, deleteScenario, generateScenario, updateAssetStatus, generating, rooms }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [showSuggested, setShowSuggested] = useState(false);
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "daily",
    prompt: "",
    room: "",
    outfit: "",
    emotion: "",
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.prompt.trim()) return;
    await createScenario(
      form.name, form.type, form.prompt,
      form.room || undefined, form.outfit || undefined, form.emotion || undefined
    );
    setForm({ name: "", type: "daily", prompt: "", room: "", outfit: "", emotion: "" });
    setShowAdd(false);
  };

  const handleAddSuggested = async (s: typeof DEFAULT_SCENARIOS[0]) => {
    await createScenario(
      s.scenario_name, s.scenario_type, s.prompt_template,
      s.required_room, s.required_outfit, s.required_emotion
    );
  };

  const addAllSuggested = async () => {
    const existingNames = scenarios.map((s: any) => s.scenario_name);
    for (const s of DEFAULT_SCENARIOS) {
      if (!existingNames.includes(s.scenario_name)) {
        await handleAddSuggested(s);
      }
    }
  };

  const getScenarioAssets = (scenarioId: string) =>
    assets.filter(a => a.asset_type === "scenario" && a.tags?.scenario_id === scenarioId);

  // Filter suggested scenarios not already added
  const availableSuggestions = DEFAULT_SCENARIOS.filter(
    s => !scenarios.find((sc: any) => sc.scenario_name === s.scenario_name)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenarios</Label>
        <div className="flex gap-1">
          {availableSuggestions.length > 0 && (
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowSuggested(!showSuggested)}>
              <Wand2 className="h-3 w-3" /> Suggested
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3 w-3" /> Custom
          </Button>
        </div>
      </div>

      {/* Suggested scenarios panel */}
      {showSuggested && availableSuggestions.length > 0 && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">📋 Suggested Scenarios</Label>
              <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={addAllSuggested}>
                Add All
              </Button>
            </div>
            <div className="space-y-1.5">
              {availableSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleAddSuggested(s)}
                  className="w-full flex items-start gap-2 p-2 rounded-lg border border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
                >
                  <span className="text-sm mt-0.5">
                    {SCENARIO_TYPES.find(t => t.value === s.scenario_type)?.icon || "📋"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{s.scenario_name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{s.prompt_template}</p>
                    <div className="flex gap-1 mt-0.5">
                      {s.required_room && <span className="text-[8px] bg-muted px-1 py-0.5 rounded capitalize">{s.required_room.replace(/_/g, " ")}</span>}
                      {s.required_outfit && <span className="text-[8px] bg-muted px-1 py-0.5 rounded capitalize">{s.required_outfit}</span>}
                      {s.required_emotion && <span className="text-[8px] bg-muted px-1 py-0.5 rounded capitalize">{s.required_emotion}</span>}
                    </div>
                  </div>
                  <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom scenario form */}
      {showAdd && (
        <Card>
          <CardContent className="p-3 space-y-2">
            <input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Scenario name..."
              className="w-full rounded-md bg-input border-0 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex gap-1.5 flex-wrap">
              {SCENARIO_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(p => ({ ...p, type: t.value }))}
                  className={`text-xs px-2 py-1 rounded-md border transition-all ${
                    form.type === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <Textarea
              value={form.prompt}
              onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))}
              placeholder="Describe the scene... e.g. 'cooking breakfast together in the kitchen, sunny morning'"
              className="min-h-[60px] text-sm"
            />
            <div className="grid grid-cols-3 gap-1.5">
              <select
                value={form.room}
                onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                className="rounded-md bg-input border-0 px-2 py-1.5 text-xs outline-none"
              >
                <option value="">Any room</option>
                {rooms.map((r: any) => (
                  <option key={r.id} value={r.room_type}>{r.icon} {r.room_name}</option>
                ))}
              </select>
              <select
                value={form.outfit}
                onChange={e => setForm(p => ({ ...p, outfit: e.target.value }))}
                className="rounded-md bg-input border-0 px-2 py-1.5 text-xs outline-none"
              >
                <option value="">Any outfit</option>
                {["casual", "formal", "sleepwear", "workout", "swimwear", "evening"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <select
                value={form.emotion}
                onChange={e => setForm(p => ({ ...p, emotion: e.target.value }))}
                className="rounded-md bg-input border-0 px-2 py-1.5 text-xs outline-none"
              >
                <option value="">Any emotion</option>
                {["happy", "flirty", "shy", "excited", "neutral", "sleepy", "laughing"].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <Button size="sm" className="w-full text-xs" onClick={handleCreate}>
              Create Scenario
            </Button>
          </CardContent>
        </Card>
      )}

      {scenarios.length === 0 && !showAdd && !showSuggested && (
        <div className="text-center py-8 text-muted-foreground">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No scenarios yet</p>
          <p className="text-xs mb-3">Add suggested scenarios or create your own</p>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowSuggested(true)}>
            <Wand2 className="h-3.5 w-3.5" /> Browse Suggestions
          </Button>
        </div>
      )}

      {scenarios.map((scenario: any) => {
        const scenarioAssets = getScenarioAssets(scenario.id);
        const hasApproved = scenarioAssets.some(a => a.status === "approved");
        const isExpanded = expandedScenario === scenario.id;

        return (
          <Card key={scenario.id}>
            <CardContent className="p-3 space-y-2">
              <button
                onClick={() => setExpandedScenario(isExpanded ? null : scenario.id)}
                className="w-full flex items-start justify-between gap-2 text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{SCENARIO_TYPES.find(t => t.value === scenario.scenario_type)?.icon || "📋"}</span>
                    <p className="text-sm font-medium">{scenario.scenario_name}</p>
                    {hasApproved && <Check className="h-3.5 w-3.5 text-green-400" />}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {scenario.required_room && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded capitalize">{scenario.required_room.replace(/_/g, " ")}</span>
                    )}
                    {scenario.required_outfit && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded capitalize">{scenario.required_outfit}</span>
                    )}
                    {scenario.required_emotion && (
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded capitalize">{scenario.required_emotion}</span>
                    )}
                  </div>
                </div>
                {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>

              {isExpanded && (
                <div className="space-y-2 border-t border-border/30 pt-2">
                  <p className="text-[10px] text-muted-foreground italic">{scenario.prompt_template}</p>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs gap-1"
                      disabled={generating}
                      onClick={() => generateScenario(scenario.id)}
                    >
                      {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Generate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive"
                      onClick={() => deleteScenario(scenario.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {scenarioAssets.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      {scenarioAssets.map(a => (
                        <AssetCard
                          key={a.id}
                          asset={a}
                          onApprove={() => updateAssetStatus(a.id, "approved")}
                          onReject={() => updateAssetStatus(a.id, "rejected")}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
