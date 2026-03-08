import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Trash2, Sparkles, Check, Image } from "lucide-react";
import { AssetCard } from "./AssetCard";

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

export function ScenarioStudio({ scenarios, assets, createScenario, deleteScenario, generateScenario, updateAssetStatus, generating, rooms }: Props) {
  const [showAdd, setShowAdd] = useState(false);
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

  const getScenarioAssets = (scenarioId: string) =>
    assets.filter(a => a.asset_type === "scenario" && a.tags?.scenario_id === scenarioId);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scenarios</Label>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" /> Add Scenario
        </Button>
      </div>

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
                {["happy", "flirty", "shy", "excited", "neutral", "sleepy"].map(e => (
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

      {scenarios.length === 0 && !showAdd && (
        <div className="text-center py-8 text-muted-foreground">
          <Image className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No scenarios yet</p>
          <p className="text-xs">Create scenarios to pre-generate interaction scenes</p>
        </div>
      )}

      {scenarios.map((scenario: any) => {
        const scenarioAssets = getScenarioAssets(scenario.id);
        const hasApproved = scenarioAssets.some(a => a.status === "approved");

        return (
          <Card key={scenario.id}>
            <CardContent className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{SCENARIO_TYPES.find(t => t.value === scenario.scenario_type)?.icon || "📋"}</span>
                    <p className="text-sm font-medium">{scenario.scenario_name}</p>
                    {hasApproved && <Check className="h-3.5 w-3.5 text-green-400" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{scenario.prompt_template}</p>
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
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
