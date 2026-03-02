import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  X, Loader2, ChevronDown, ImagePlus, Upload, Clipboard,
  Image as ImageIcon, ZoomIn, Copy, RotateCcw, AlertCircle,
} from "lucide-react";
import { SeedImageDrive } from "@/components/SeedImageDrive";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/lib/image-sizes";

const MAX_IMAGES = 4;

/* ─── Image Source Slots ─── */
export function ImageSourceSlots({
  slotImages, setSlotImages,
}: {
  slotImages: (string | null)[];
  setSlotImages: (v: (string | null)[] | ((prev: (string | null)[]) => (string | null)[])) => void;
}) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const [uploading, setUploading] = useState<number | null>(null);
  const filledSlots = slotImages.filter(Boolean) as string[];

  const handleSlotClick = (index: number) => { activeSlotRef.current = index; fileInputRef.current?.click(); };
  const removeSlot = (index: number) => setSlotImages((prev: (string | null)[]) => { const n = [...prev]; n[index] = null; return n; });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const slotIndex = activeSlotRef.current;
    setUploading(slotIndex);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/create/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("seed-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("seed-images").getPublicUrl(path);
      setSlotImages((prev: (string | null)[]) => { const next = [...prev]; next[slotIndex] = urlData.publicUrl; return next; });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground">Source Images ({filledSlots.length}/{MAX_IMAGES})</Label>
        <SeedImageDrive onSelect={(url) => {
          const emptyIdx = slotImages.findIndex((s) => !s);
          if (emptyIdx !== -1) setSlotImages((prev: (string | null)[]) => { const n = [...prev]; n[emptyIdx] = url; return n; });
          else toast({ title: "All slots full" });
        }} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {slotImages.map((url, i) => (
          <div key={i} className={cn("relative aspect-[4/3] rounded-lg border-2 border-dashed transition-all overflow-hidden group",
            url ? "border-border bg-muted" : "border-border/50 bg-surface-1 hover:border-primary/40 cursor-pointer"
          )} onClick={() => !url && handleSlotClick(i)}>
            {url ? (
              <>
                <img src={url} alt={`Image ${filledSlots.indexOf(url) + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 z-10 h-6 w-6 rounded-full bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center shadow-md">{filledSlots.indexOf(url) + 1}</span>
                <button onClick={(e) => { e.stopPropagation(); removeSlot(i); }} className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 lg:opacity-100">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : uploading === i ? (
              <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-1.5">
                <ImagePlus className="h-6 w-6 text-muted-foreground/40" />
                <span className="text-[10px] text-muted-foreground/40">Add image</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Seed Image Upload (single image for video/upscale) ─── */
export function SeedImageUpload({
  imageUrl, setImageUrl, label = "Seed Image",
}: {
  imageUrl: string; setImageUrl: (url: string) => void; label?: string;
}) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const handleUpload = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      setUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/create/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("seed-images").upload(path, file);
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); }
      else { const { data } = supabase.storage.from("seed-images").getPublicUrl(path); setImageUrl(data.publicUrl); }
      setUploading(false);
    };
    input.click();
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        {!imageUrl && <SeedImageDrive onSelect={setImageUrl} />}
      </div>
      {imageUrl ? (
        <div className="relative rounded-xl overflow-hidden bg-muted group">
          <img src={imageUrl} alt="Seed" className="w-full aspect-video object-cover" />
          <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 lg:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface-1/50 p-8 cursor-pointer hover:border-primary/40" onClick={handleUpload}>
          <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">Click to upload {label.toLowerCase()}</p>
        </div>
      )}
      {!imageUrl && (
        <>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" size="sm" className="flex-1" disabled={uploading} onClick={handleUpload}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={async () => {
              try { const text = await navigator.clipboard.readText(); if (text.startsWith("http")) setImageUrl(text); else toast({ title: "No URL in clipboard" }); } catch { toast({ title: "Clipboard denied" }); }
            }}><Clipboard className="h-4 w-4" /> Paste</Button>
          </div>
          <div className="flex gap-2 mt-2">
            <Input placeholder="Paste image URL..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="bg-surface-1 text-sm" />
            <Button size="sm" disabled={!urlInput} onClick={() => { setImageUrl(urlInput); setUrlInput(""); }}>Add</Button>
          </div>
        </>
      )}
    </section>
  );
}

/* ─── Image Prompt Section ─── */
export function ImagePromptSection({ prompt, setPrompt, negativePrompt, setNegativePrompt, blocksByCategory }: {
  prompt: string; setPrompt: (v: string) => void;
  negativePrompt: string; setNegativePrompt: (v: string) => void;
  blocksByCategory: Record<string, any[]>;
}) {
  const [realismLevel, setRealismLevel] = useState<string>("off");
  const [faceSwapOp, setFaceSwapOp] = useState<string>("none");
  const [identityMode, setIdentityMode] = useState<string>("auto");

  const realismBlocks = blocksByCategory["img_realism"] || [];
  const faceSwapBlocks = blocksByCategory["img_face_swap"] || [];
  const identityBlocks = blocksByCategory["img_identity"] || [];
  const negativeBlocks = blocksByCategory["img_negative"] || [];

  const applyRealism = useCallback((level: string) => {
    setRealismLevel(level);
    let cleaned = prompt;
    realismBlocks.forEach((b: any) => { cleaned = cleaned.replace(b.value, "").replace(/\s{2,}/g, " ").trim(); });
    const idx = level === "1" ? 0 : level === "2" ? 1 : level === "3" ? 2 : -1;
    const block = idx >= 0 ? realismBlocks[idx] : null;
    setPrompt(block ? (cleaned ? `${cleaned} ${block.value}` : block.value) : cleaned);
  }, [prompt, realismBlocks, setPrompt]);

  const applyFaceSwap = useCallback((op: string) => {
    setFaceSwapOp(op);
    let cleaned = prompt;
    faceSwapBlocks.forEach((b: any) => { cleaned = cleaned.replace(b.value, "").replace(/\s{2,}/g, " ").trim(); });
    const labelMap: Record<string, string> = { face_swap: "Face Swap", full_replace: "Full Person", reference: "Reference", add_person: "Add Person" };
    const block = faceSwapBlocks.find((b: any) => labelMap[op] && b.label.includes(labelMap[op]));
    setPrompt(block ? (cleaned ? `${block.value} ${cleaned}` : block.value) : cleaned);
  }, [prompt, faceSwapBlocks, setPrompt]);

  const applyIdentity = useCallback((mode: string) => {
    setIdentityMode(mode);
    let cleaned = prompt;
    identityBlocks.forEach((b: any) => { cleaned = cleaned.replace(b.value, "").replace(/\s{2,}/g, " ").trim(); });
    const block = mode === "auto" ? identityBlocks[0] : mode === "full" ? identityBlocks[1] : null;
    setPrompt(block ? (cleaned ? `${block.value} ${cleaned}` : block.value) : cleaned);
  }, [prompt, identityBlocks, setPrompt]);

  // Negative prompt is user-opt-in only — no auto-fill

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Edit Prompt</Label>
        <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
      </div>
      <Textarea placeholder="Describe the edit — what to change, how it should look..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="bg-surface-1 min-h-[100px]" maxLength={2000} />

      {/* Realism Level */}
      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Realism Level</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: "off", label: "Off" },
            { key: "1", label: "Ad-Ready" },
            { key: "2", label: "Magazine" },
            { key: "3", label: "Premium" },
          ].map((lvl) => (
            <button key={lvl.key} onClick={() => applyRealism(lvl.key)}
              className={cn("rounded-lg py-2.5 text-[11px] font-medium transition-colors min-h-[40px]",
                realismLevel === lvl.key ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground hover:text-foreground")}>
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Face/Body Swap */}
      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Swap Operation</Label>
        <Select value={faceSwapOp} onValueChange={applyFaceSwap}>
          <SelectTrigger className="bg-surface-1 h-10 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">None</SelectItem>
            <SelectItem value="face_swap" className="text-xs">Face Swap (face only)</SelectItem>
            <SelectItem value="full_replace" className="text-xs">Full Person Replace</SelectItem>
            <SelectItem value="reference" className="text-xs">Reference-Based Scene</SelectItem>
            <SelectItem value="add_person" className="text-xs">Add Person to Group</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Identity Preservation */}
      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Identity Preservation</Label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { key: "off", label: "Off" },
            { key: "auto", label: "Face" },
            { key: "full", label: "Full Body" },
          ].map((m) => (
            <button key={m.key} onClick={() => applyIdentity(m.key)}
              className={cn("rounded-lg py-2.5 text-[11px] font-medium transition-colors min-h-[40px]",
                identityMode === m.key ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground hover:text-foreground")}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Negative Prompt */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
          Negative Prompt<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-1">
          <Textarea placeholder="What to avoid..." value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="bg-surface-1 min-h-[50px] text-sm" />
          <div className="flex flex-wrap gap-1.5">
            {negativeBlocks.map((b: any) => (
              <button key={b.id} onClick={() => {
                if (negativePrompt.includes(b.value)) setNegativePrompt(negativePrompt.replace(b.value, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim());
                else setNegativePrompt(negativePrompt ? `${negativePrompt}, ${b.value}` : b.value);
              }}
                className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  negativePrompt.includes(b.value) ? "bg-destructive/20 text-destructive" : "bg-surface-1 text-muted-foreground hover:bg-surface-2")}>
                {b.label}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

/* ─── Image Parameters ─── */
export function ImageParamsSection({
  outputSize, setOutputSize, imageModel, setImageModel,
  randomSeed, setRandomSeed, seed, setSeed,
  promptExpansion, setPromptExpansion,
}: {
  outputSize: string; setOutputSize: (v: string) => void;
  imageModel: string; setImageModel: (v: string) => void;
  randomSeed: boolean; setRandomSeed: (v: boolean) => void;
  seed: string; setSeed: (v: string) => void;
  promptExpansion: boolean; setPromptExpansion: (v: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Output Size</Label>
          <Select value={outputSize} onValueChange={setOutputSize}>
            <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{IMAGE_SIZES.map((s) => <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Model</Label>
          <Select value={imageModel} onValueChange={setImageModel}>
            <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alibaba/wan-2.6/image-edit" className="text-xs">WAN 2.6 Edit</SelectItem>
              <SelectItem value="alibaba/qwen-edit-plus" className="text-xs">Qwen Edit Plus</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2"><Switch checked={randomSeed} onCheckedChange={setRandomSeed} /><Label className="text-xs">Random Seed</Label></div>
        {!randomSeed && <Input type="number" placeholder="Seed" value={seed} onChange={(e) => setSeed(e.target.value)} className="bg-surface-1 h-9 w-24 text-xs" />}
        <div className="flex items-center gap-2"><Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} /><Label className="text-xs">Expand</Label></div>
      </div>
    </section>
  );
}

/* ─── Video Prompt Section ─── */
export function VideoPromptSection({ prompt, setPrompt, negativePrompt, setNegativePrompt, blocksByCategory, duration }: {
  prompt: string; setPrompt: (v: string) => void;
  negativePrompt: string; setNegativePrompt: (v: string) => void;
  blocksByCategory: Record<string, any[]>;
  duration: number;
}) {
  const [realismLevel, setRealismLevel] = useState<string>("off");
  const [motionRealism, setMotionRealism] = useState(true);
  const [identityMode, setIdentityMode] = useState<string>("auto");

  const realismBlocks = blocksByCategory["vid_realism"] || [];
  const motionBlock = (blocksByCategory["vid_motion"] || [])[0];
  const identityBlocks = blocksByCategory["vid_identity"] || [];
  const negativeBlocks = blocksByCategory["vid_negative"] || [];

  const applyRealism = useCallback((level: string) => {
    setRealismLevel(level);
    let cleaned = prompt;
    realismBlocks.forEach((b: any) => { cleaned = cleaned.replace(b.value, "").replace(/\s{2,}/g, " ").trim(); });
    const idx = level === "1" ? 0 : level === "2" ? 1 : level === "3" ? 2 : -1;
    const block = idx >= 0 ? realismBlocks[idx] : null;
    setPrompt(block ? (cleaned ? `${cleaned} ${block.value}` : block.value) : cleaned);
  }, [prompt, realismBlocks, setPrompt]);

  const toggleMotion = useCallback((on: boolean) => {
    setMotionRealism(on);
    if (!motionBlock) return;
    let cleaned = prompt.replace(motionBlock.value, "").replace(/\s{2,}/g, " ").trim();
    setPrompt(on ? (cleaned ? `${cleaned} ${motionBlock.value}` : motionBlock.value) : cleaned);
  }, [prompt, motionBlock, setPrompt]);

  const applyIdentity = useCallback((mode: string) => {
    setIdentityMode(mode);
    let cleaned = prompt;
    identityBlocks.forEach((b: any) => { cleaned = cleaned.replace(b.value, "").replace(/\s{2,}/g, " ").trim(); });
    let block: any = null;
    if (mode === "auto") block = duration >= 10 ? identityBlocks[3] : identityBlocks[0];
    else if (mode === "multi") block = identityBlocks[1];
    else if (mode === "multi_shot") block = identityBlocks[2];
    setPrompt(block ? (cleaned ? `${cleaned} ${block.value}` : block.value) : cleaned);
  }, [prompt, identityBlocks, duration, setPrompt]);

  // Negative prompt is user-opt-in only — no auto-fill

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Scene Direction</Label>
        <span className={cn("text-[10px] font-mono", prompt.length > 2000 ? "text-destructive" : "text-muted-foreground")}>{prompt.length}/2000</span>
      </div>
      <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="bg-surface-1 min-h-[100px] text-sm" placeholder="Describe what happens — action, camera, mood, style..." />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(prompt); toast({ title: "Copied" }); }}><Copy className="h-3 w-3" /> Copy</Button>
        <Button variant="outline" size="sm" onClick={() => { setPrompt(""); }}><RotateCcw className="h-3 w-3" /> Reset</Button>
      </div>

      {/* Realism Level */}
      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Realism Level</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: "off", label: "Off" },
            { key: "1", label: "Ad-Ready" },
            { key: "2", label: "Magazine" },
            { key: "3", label: "Premium" },
          ].map((lvl) => (
            <button key={lvl.key} onClick={() => applyRealism(lvl.key)}
              className={cn("rounded-lg py-2.5 text-[11px] font-medium transition-colors min-h-[40px]",
                realismLevel === lvl.key ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground hover:text-foreground")}>
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Motion Realism */}
      <div className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-3">
        <div>
          <Label className="text-xs font-medium">Motion Realism</Label>
          <p className="text-[10px] text-muted-foreground">Natural motion, micro-expressions, physics</p>
        </div>
        <Switch checked={motionRealism} onCheckedChange={toggleMotion} />
      </div>

      {/* Identity Reinforcement */}
      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground font-medium">Identity Reinforcement</Label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { key: "off", label: "Off" },
            { key: "auto", label: "Single" },
            { key: "multi", label: "Multi" },
            { key: "multi_shot", label: "Shots" },
          ].map((m) => (
            <button key={m.key} onClick={() => applyIdentity(m.key)}
              className={cn("rounded-lg py-2.5 text-[11px] font-medium transition-colors min-h-[40px]",
                identityMode === m.key ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground hover:text-foreground")}>
              {m.label}
            </button>
          ))}
        </div>
        {duration >= 10 && identityMode === "auto" && (
          <p className="text-[10px] text-[hsl(var(--status-warning))] flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Duration ≥10s: extended identity lock applied</p>
        )}
      </div>

      {/* Negative */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
          Negative Prompt<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-1">
          <Textarea value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} className="bg-surface-1 min-h-[50px] text-sm" placeholder="What to avoid..." />
          <div className="flex flex-wrap gap-1.5">
            {negativeBlocks.map((b: any) => (
              <button key={b.id} onClick={() => {
                if (negativePrompt.includes(b.value)) setNegativePrompt(negativePrompt.replace(b.value, "").replace(/,\s*,/g, ",").replace(/^,\s*|,\s*$/g, "").trim());
                else setNegativePrompt(negativePrompt ? `${negativePrompt}, ${b.value}` : b.value);
              }}
                className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  negativePrompt.includes(b.value) ? "bg-destructive/20 text-destructive" : "bg-surface-1 text-muted-foreground hover:bg-surface-2")}>
                {b.label}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

/* ─── Video Parameters ─── */
export function VideoParamsSection({
  resolution, setResolution, shotType, setShotType,
  duration, setDuration, randomSeed, setRandomSeed,
  seed, setSeed, promptExpansion, setPromptExpansion,
  audioEnabled, setAudioEnabled,
}: {
  resolution: string; setResolution: (v: string) => void;
  shotType: string; setShotType: (v: string) => void;
  duration: number; setDuration: (v: number) => void;
  randomSeed: boolean; setRandomSeed: (v: boolean) => void;
  seed: string; setSeed: (v: string) => void;
  promptExpansion: boolean; setPromptExpansion: (v: boolean) => void;
  audioEnabled: boolean; setAudioEnabled: (v: boolean) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Resolution</Label>
          <Select value={resolution} onValueChange={setResolution}>
            <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="720p">720p</SelectItem><SelectItem value="1080p">1080p</SelectItem></SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Shot Type</Label>
          <Select value={shotType} onValueChange={setShotType}>
            <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="multi">Multi</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Duration</Label>
          <span className="text-xs text-muted-foreground font-mono">{duration}s</span>
        </div>
        <Slider value={[duration]} onValueChange={(v) => setDuration(v[0])} min={2} max={15} step={1} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2"><Switch checked={randomSeed} onCheckedChange={setRandomSeed} /><Label className="text-xs">Random Seed</Label></div>
        {!randomSeed && <Input type="number" placeholder="Seed" value={seed} onChange={(e) => setSeed(e.target.value)} className="bg-surface-1 h-9 w-24 text-xs font-mono" />}
        <div className="flex items-center gap-2"><Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} /><Label className="text-xs">Expand</Label></div>
        <div className="flex items-center gap-2"><Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} /><Label className="text-xs">Audio</Label></div>
      </div>
    </section>
  );
}

/* ─── Upscale Parameters ─── */
export function UpscaleParamsSection({
  targetResolution, setTargetResolution,
}: {
  targetResolution: string; setTargetResolution: (v: string) => void;
}) {
  return (
    <section className="space-y-2">
      <Label className="text-xs text-muted-foreground">Target Resolution</Label>
      <Select value={targetResolution} onValueChange={setTargetResolution}>
        <SelectTrigger className="bg-surface-1 h-9 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="2k">2K</SelectItem>
          <SelectItem value="4k">4K</SelectItem>
        </SelectContent>
      </Select>
    </section>
  );
}
