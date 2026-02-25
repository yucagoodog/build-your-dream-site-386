import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Lock, Zap, BookOpen } from "lucide-react";

const SettingsPage = () => {
  const [duration, setDuration] = useState(5);

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
              className="bg-surface-1 text-sm"
            />
            <p className="text-[10px] text-muted-foreground">Required for video generation. Stored securely.</p>
          </CardContent>
        </Card>

        {/* Default Generation Parameters */}
        <Card className="border-border/50">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Default Parameters</h2>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Select defaultValue="wan26-i2v-flash">
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
                <Select defaultValue="720p">
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

              <Separator className="bg-border/50" />

              <div className="flex items-center justify-between">
                <Label className="text-xs">Prompt Expansion</Label>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Audio</Label>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </AppShell>
  );
};

export default SettingsPage;
