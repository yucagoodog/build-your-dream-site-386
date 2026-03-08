import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Plus, X, Sparkles, Heart, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  onCreate: (name: string, avatarUrls: string[], description: string, personality: string) => Promise<any>;
}

const PERSONALITY_SUGGESTIONS = [
  "Warm, caring, and affectionate. Loves cooking and cozy evenings at home.",
  "Playful and flirty with a great sense of humor. Always up for adventure.",
  "Sweet and shy at first, but opens up to be deeply loving and devoted.",
  "Confident, witty, and independent. Loves intellectual conversations.",
  "Gentle and nurturing. Loves nature, art, and quiet moments together.",
];

export function CompanionSetup({ onCreate }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [personality, setPersonality] = useState("");
  const [avatarUrls, setAvatarUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 4 - avatarUrls.length)) {
        const ext = file.name.split(".").pop();
        const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
        const path = `companion-avatars/${user.id}/${safeName}`;
        const { error } = await supabase.storage.from("seed-images").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("seed-images").getPublicUrl(path);
        setAvatarUrls(prev => [...prev, data.publicUrl]);
      }
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeAvatar = (idx: number) => {
    setAvatarUrls(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreate = async () => {
    if (!name.trim() || avatarUrls.length === 0) return;
    setCreating(true);
    await onCreate(name.trim(), avatarUrls, description.trim(), personality.trim());
    setCreating(false);
  };

  return (
    <div className="space-y-5 max-w-md mx-auto px-3 py-6">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-primary/20 flex items-center justify-center mx-auto">
          <Heart className="h-8 w-8 text-pink-500" />
        </div>
        <h2 className="text-lg font-bold">Create Your Companion</h2>
        <p className="text-sm text-muted-foreground">
          Upload a photo, give them a name, and we'll set up rooms, scenarios, and everything needed to bring them to life.
        </p>
      </div>

      {/* Photo upload — prominent */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-medium flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Reference Photo (required)
          </Label>
          <p className="text-[10px] text-muted-foreground">Upload 1-4 clear reference photos. The AI will use these to generate all character visuals.</p>
          <div className="grid grid-cols-4 gap-2">
            {avatarUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted ring-2 ring-primary/30">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeAvatar(i)} className="absolute top-1 right-1 h-5 w-5 rounded-full bg-background/80 backdrop-blur flex items-center justify-center">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {avatarUrls.length < 4 && (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
              >
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                <span className="text-[10px]">Add</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
        </CardContent>
      </Card>

      {/* Name & Description */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs font-medium">Name</Label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Give them a name..."
              className="w-full mt-1 rounded-md bg-input border-0 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              maxLength={50}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Appearance Description</Label>
            <p className="text-[10px] text-muted-foreground mb-1">Helps AI keep character consistent across all generated images.</p>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Beautiful woman with long dark wavy hair, brown eyes, olive skin, slim figure, 25 years old"
              className="mt-1 min-h-[70px] text-sm"
              maxLength={500}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Personality</Label>
            <Textarea
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              placeholder="Describe their personality..."
              className="mt-1 min-h-[50px] text-sm"
              maxLength={300}
            />
            {/* Personality suggestions */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {PERSONALITY_SUGGESTIONS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPersonality(p)}
                  className="text-[10px] px-2 py-1 rounded-md bg-muted/50 border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                >
                  {p.slice(0, 30)}...
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What happens next */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
        <p className="text-xs font-medium text-foreground">What happens next:</p>
        <ul className="text-[11px] text-muted-foreground space-y-1">
          <li className="flex items-start gap-1.5">
            <span className="text-primary mt-0.5">✦</span>
            <span>5 rooms auto-created (Living Room, Kitchen, Bedroom, Bathroom, Balcony)</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-primary mt-0.5">✦</span>
            <span>8 scenarios pre-loaded (Morning Coffee, Movie Night, etc.)</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-primary mt-0.5">✦</span>
            <span>Generate emotions & room backgrounds in Studio, then enter Play Mode</span>
          </li>
        </ul>
      </div>

      <Button
        onClick={handleCreate}
        disabled={!name.trim() || avatarUrls.length === 0 || creating}
        className="w-full gap-2"
        size="lg"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Create Companion
      </Button>
    </div>
  );
}
