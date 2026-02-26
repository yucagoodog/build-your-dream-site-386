import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Lock, Zap, BookOpen, Loader2, Save, LogOut, Clapperboard, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const SettingsPage = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("wan26-i2v-flash");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [shotType, setShotType] = useState("single");
  const [seed, setSeed] = useState("");
  const [promptExpansion, setPromptExpansion] = useState(true);
  const [audio, setAudio] = useState(false);
  const [defaultMode, setDefaultMode] = useState<"video" | "image">("video");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setApiKey(data.atlas_api_key || "");
          setModel(data.default_model);
          setResolution(data.default_resolution);
          setDuration(data.default_duration);
          setShotType(data.default_shot_type);
          setPromptExpansion(data.default_prompt_expansion);
          setAudio(data.default_audio);
          setDefaultMode((data as any).default_mode || "video");
          setAudio(data.default_audio);
        }
        setLoading(false);
      });
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_settings")
      .update({
        atlas_api_key: apiKey,
        default_model: model,
        default_resolution: resolution,
        default_duration: duration,
        default_shot_type: shotType,
        default_prompt_expansion: promptExpansion,
        default_audio: audio,
        default_mode: defaultMode,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Settings saved" });
    }
    setSaving(false);
  }, [user, apiKey, model, resolution, duration, shotType, promptExpansion, audio, defaultMode]);

  if (loading) {
    return (
      <AppShell title="Settings">
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings">
      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Atlas Cloud API Key */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Atlas Cloud API Key</h2>
            </div>
            <Input
              type="password"
              placeholder="Enter your Atlas Cloud API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-surface-1 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Required for video generation. Stored securely.</p>
          </CardContent>
        </Card>

        {/* Default Mode */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Default Mode</h2>
            </div>
            <p className="text-[10px] text-muted-foreground">Which pipeline opens by default on the Projects page.</p>
            <div className="flex rounded-lg bg-surface-1 p-1 gap-1">
              <button
                onClick={() => setDefaultMode("video")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-medium transition-colors",
                  defaultMode === "video"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clapperboard className="h-3.5 w-3.5" />
                Video
              </button>
              <button
                onClick={() => setDefaultMode("image")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md py-2.5 text-xs font-medium transition-colors",
                  defaultMode === "image"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Image
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Default Video Parameters */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Video Parameters</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-surface-1 text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wan26-i2v-flash">WAN 2.6 I2V Flash</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution}>
                  <SelectTrigger className="bg-surface-1 text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (Cost-effective)</SelectItem>
                    <SelectItem value="1080p">1080p (High quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Duration</Label>
                  <span className="text-xs text-muted-foreground font-mono">{duration}s</span>
                </div>
                <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={2} max={15} step={1} />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Shot Type</Label>
                <Select value={shotType} onValueChange={setShotType}>
                  <SelectTrigger className="bg-surface-1 text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="multi">Multi</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Single for one subject, Multi for multiple subjects or scene changes.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Seed</Label>
                <Input
                  type="number"
                  placeholder="Random"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  className="bg-surface-1 text-sm font-mono"
                />
                <p className="text-[10px] text-muted-foreground">Leave empty for random seed each generation.</p>
              </div>

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between">
                <Label className="text-xs">Prompt Expansion</Label>
                <Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Audio</Label>
                <Switch checked={audio} onCheckedChange={setAudio} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>

        {/* Prompt Library */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Prompt Library</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Browse and edit built-in WAN 2.6 prompt blocks for camera, lighting, realism, and identity.
            </p>
            <button className="w-full rounded-lg bg-surface-1 p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-surface-2 active:bg-surface-3">
              Open Prompt Library →
            </button>
          </CardContent>
        </Card>

        {/* LLM Placeholder */}
        <Card className="border-border/50 opacity-60">
          <CardContent className="p-4 space-y-2">
            <h2 className="font-semibold text-sm">LLM Integration</h2>
            <p className="text-xs text-muted-foreground">
              Connect LLM in Settings to unlock auto scene-breaking and smart prompt suggestions.
            </p>
            <span className="inline-block rounded-md bg-surface-1 px-2 py-1 text-[10px] text-muted-foreground">Phase 2</span>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </AppShell>
  );
};

export default SettingsPage;
