import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, X, RefreshCw, Sparkles } from "lucide-react";
import { AssetCard } from "./AssetCard";

const EMOTIONS = ["happy", "sad", "surprised", "angry", "sleepy", "flirty", "laughing", "shy", "excited"];
const OUTFITS = ["casual", "formal", "sleepwear", "workout", "swimwear", "evening"];

interface Props {
  companion: any;
  assets: any[];
  generateAsset: (type: string, tags: Record<string, string>, prompt?: string) => Promise<void>;
  updateAssetStatus: (id: string, status: "approved" | "rejected") => Promise<void>;
  generating: boolean;
  genStatus: string;
}

export function CharacterStudio({ companion, assets, generateAsset, updateAssetStatus, generating, genStatus }: Props) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [selectedOutfit, setSelectedOutfit] = useState<string | null>(null);

  const portraits = assets.filter(a => a.asset_type === "portrait");
  const emotionAssets = assets.filter(a => a.asset_type === "emotion");
  const outfitAssets = assets.filter(a => a.asset_type === "outfit");

  const getEmotionStatus = (emotion: string) => {
    const found = emotionAssets.filter(a => a.tags?.emotion === emotion);
    const approved = found.find(a => a.status === "approved");
    if (approved) return "approved";
    if (found.length > 0) return "draft";
    return "none";
  };

  const getOutfitStatus = (outfit: string) => {
    const found = outfitAssets.filter(a => a.tags?.outfit === outfit);
    const approved = found.find(a => a.status === "approved");
    if (approved) return "approved";
    if (found.length > 0) return "draft";
    return "none";
  };

  return (
    <div className="space-y-4">
      {/* Base Portraits */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reference Photos</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {companion.avatar_urls?.map((url: string, i: number) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-muted ring-2 ring-primary/30">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Emotion Pack */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">😊 Emotion Pack</Label>
            <span className="text-[10px] text-muted-foreground">
              {emotionAssets.filter(a => a.status === "approved").length}/{EMOTIONS.length} approved
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EMOTIONS.map(emotion => {
              const status = getEmotionStatus(emotion);
              return (
                <button
                  key={emotion}
                  onClick={() => setSelectedEmotion(selectedEmotion === emotion ? null : emotion)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-all capitalize ${
                    selectedEmotion === emotion
                      ? "border-primary bg-primary/10 text-primary"
                      : status === "approved"
                      ? "border-green-500/50 bg-green-500/10 text-green-400"
                      : status === "draft"
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {emotion}
                  {status === "approved" && <Check className="h-3 w-3 inline ml-1" />}
                </button>
              );
            })}
          </div>
          {selectedEmotion && (
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full gap-1 text-xs"
                disabled={generating}
                onClick={() => generateAsset("emotion", { emotion: selectedEmotion })}
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generate {selectedEmotion}
              </Button>
              {/* Show existing assets for this emotion */}
              <div className="grid grid-cols-3 gap-2">
                {emotionAssets
                  .filter(a => a.tags?.emotion === selectedEmotion)
                  .map(a => (
                    <AssetCard key={a.id} asset={a} onApprove={() => updateAssetStatus(a.id, "approved")} onReject={() => updateAssetStatus(a.id, "rejected")} />
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outfit Pack */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">👗 Outfit Pack</Label>
            <span className="text-[10px] text-muted-foreground">
              {outfitAssets.filter(a => a.status === "approved").length}/{OUTFITS.length} approved
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OUTFITS.map(outfit => {
              const status = getOutfitStatus(outfit);
              return (
                <button
                  key={outfit}
                  onClick={() => setSelectedOutfit(selectedOutfit === outfit ? null : outfit)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border transition-all capitalize ${
                    selectedOutfit === outfit
                      ? "border-primary bg-primary/10 text-primary"
                      : status === "approved"
                      ? "border-green-500/50 bg-green-500/10 text-green-400"
                      : status === "draft"
                      ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-400"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {outfit}
                  {status === "approved" && <Check className="h-3 w-3 inline ml-1" />}
                </button>
              );
            })}
          </div>
          {selectedOutfit && (
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full gap-1 text-xs"
                disabled={generating}
                onClick={() => generateAsset("outfit", { outfit: selectedOutfit })}
              >
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Generate {selectedOutfit}
              </Button>
              <div className="grid grid-cols-3 gap-2">
                {outfitAssets
                  .filter(a => a.tags?.outfit === selectedOutfit)
                  .map(a => (
                    <AssetCard key={a.id} asset={a} onApprove={() => updateAssetStatus(a.id, "approved")} onReject={() => updateAssetStatus(a.id, "rejected")} />
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Generation */}
      <Card>
        <CardContent className="p-3 space-y-2">
          <Label className="text-xs font-medium">✨ Custom Generation</Label>
          <Textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Describe a custom look or scene..."
            className="min-h-[50px] text-sm"
          />
          <Button
            size="sm"
            className="w-full gap-1 text-xs"
            disabled={generating || !customPrompt.trim()}
            onClick={() => {
              generateAsset("portrait", { custom: "true" }, customPrompt);
              setCustomPrompt("");
            }}
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Generate Custom
          </Button>
        </CardContent>
      </Card>

      {/* All assets grid */}
      {assets.length > 0 && (
        <div>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Assets ({assets.length})</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {assets.map(a => (
              <AssetCard
                key={a.id}
                asset={a}
                onApprove={() => updateAssetStatus(a.id, "approved")}
                onReject={() => updateAssetStatus(a.id, "rejected")}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
