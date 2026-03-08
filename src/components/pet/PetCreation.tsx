import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Plus, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PetCreationProps {
  onCreate: (name: string, avatarUrls: string[], description: string, personality: string) => Promise<any>;
}

export function PetCreation({ onCreate }: PetCreationProps) {
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
        const path = `pet-avatars/${user.id}/${safeName}`;
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
    <div className="space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2 pt-4">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-lg font-bold">Create Your Pet</h2>
        <p className="text-sm text-muted-foreground">Upload photos of a character and bring them to life!</p>
      </div>

      {/* Avatar upload */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-medium">Reference Photos (1-4)</Label>
          <div className="grid grid-cols-4 gap-2">
            {avatarUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
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

      {/* Name & personality */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div>
            <Label className="text-xs font-medium">Name</Label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Give your pet a name..."
              className="w-full mt-1 rounded-md bg-input border-0 px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
              maxLength={50}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What does this character look like? (helps AI maintain consistency)"
              className="mt-1 min-h-[60px] text-sm"
              maxLength={500}
            />
          </div>
          <div>
            <Label className="text-xs font-medium">Personality</Label>
            <Textarea
              value={personality}
              onChange={e => setPersonality(e.target.value)}
              placeholder="e.g. cheerful, adventurous, shy..."
              className="mt-1 min-h-[40px] text-sm"
              maxLength={200}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        onClick={handleCreate}
        disabled={!name.trim() || avatarUrls.length === 0 || creating}
        className="w-full gap-2"
        size="lg"
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Bring to Life!
      </Button>
    </div>
  );
}
