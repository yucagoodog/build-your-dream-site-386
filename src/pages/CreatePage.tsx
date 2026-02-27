import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X, Loader2, ChevronDown, Sparkles, Play, ImagePlus, Download,
  Clock, DollarSign, AlertCircle, Upload, Clipboard,
  Image as ImageIcon, Clapperboard, ZoomIn, Copy, RotateCcw, FolderOpen,
} from "lucide-react";
import { SeedImageDrive } from "@/components/SeedImageDrive";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { formatDistanceToNow } from "date-fns";
import { usePromptBlockPrefs } from "@/hooks/use-prompt-block-prefs";

type Mode = "image" | "video" | "upscale";

const MAX_IMAGES = 4;

// Atlas Cloud pricing (per-second for video, flat for image/upscale)
// Video Flash w/ audio:  $0.06/s (720p), $0.12/s (1080p)
// Video Flash no audio:  $0.035/s (720p), $0.0262/s (1080p)
// Image Edit: $0.021 flat per run (regardless of image count)
// Upscale: $0.01 flat per run
function estimateVideoCost(resolution: string, duration: number, audio: boolean): number {
  const perSecond = audio
    ? (resolution === "1080p" ? 0.12 : 0.06)
    : (resolution === "1080p" ? 0.0262 : 0.035);
  return perSecond * duration;
}

const CreatePage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();

  // Mode
  const [mode, setMode] = useState<Mode>("image");

  // Shared state
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);
  const [lastGeneratedId, setLastGeneratedId] = useState<string | null>(null);

  // Image state
  const [slotImages, setSlotImages] = useState<(string | null)[]>([null, null, null, null]);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeSlotRef = useRef<number>(0);
  const [outputSize, setOutputSize] = useState("1280*1280");
  const [imageModel, setImageModel] = useState("alibaba/wan-2.6/image-edit");
  const [imgSeed, setImgSeed] = useState("");
  const [imgRandomSeed, setImgRandomSeed] = useState(true);
  const [imgPromptExpansion, setImgPromptExpansion] = useState(true);

  // Video state
  const [seedImageUrl, setSeedImageUrl] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [videoUploading, setVideoUploading] = useState(false);
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [vidSeed, setVidSeed] = useState("");
  const [vidRandomSeed, setVidRandomSeed] = useState(true);
  const [shotType, setShotType] = useState("single");
  const [vidPromptExpansion, setVidPromptExpansion] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState<Set<string>>(new Set());

  // Upscale state
  const [upscaleImageUrl, setUpscaleImageUrl] = useState("");
  const [upscaleUploading, setUpscaleUploading] = useState(false);
  const upscaleFileRef = useRef<HTMLInputElement>(null);
  const [targetResolution, setTargetResolution] = useState("4k");

  // Load user defaults
  const { data: userSettings } = useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (defaultsLoaded || !userSettings) return;
    const s = userSettings as any;
    setMode(s.default_mode === "image" ? "image" : "video");
    setImageModel(s.default_image_model || "alibaba/wan-2.6/image-edit");
    const valid = IMAGE_SIZES.some((sz) => sz.value === s.default_image_output_size);
    setOutputSize(valid ? s.default_image_output_size : "1280*1280");
    setImgPromptExpansion(s.default_image_prompt_expansion ?? true);
    setResolution(s.default_resolution || "720p");
    setDuration(s.default_duration || 5);
    setShotType(s.default_shot_type || "single");
    setVidPromptExpansion(s.default_prompt_expansion ?? true);
    setAudioEnabled(s.default_audio ?? false);
    setDefaultsLoaded(true);
  }, [userSettings, defaultsLoaded]);

  // Handle re-edit state from Library
  useEffect(() => {
    const reEdit = (location.state as any)?.reEdit;
    if (!reEdit) return;
    if (reEdit.mode === "video") {
      setMode("video");
      setPrompt(reEdit.prompt || "");
      setNegativePrompt(reEdit.negative_prompt || "");
      setSeedImageUrl(reEdit.seed_image_url || "");
      setResolution(reEdit.resolution || "720p");
      setDuration(reEdit.duration || 5);
      setShotType(reEdit.shot_type || "single");
      setVidPromptExpansion(reEdit.prompt_expansion ?? true);
      setAudioEnabled(reEdit.audio ?? false);
      if (reEdit.seed != null && reEdit.seed !== -1) { setVidSeed(String(reEdit.seed)); setVidRandomSeed(false); }
    } else {
      setMode("image");
      setPrompt(reEdit.prompt || "");
      setNegativePrompt(reEdit.negative_prompt || "");
      setOutputSize(reEdit.output_size || "1280*1280");
      setImageModel(reEdit.model || "alibaba/wan-2.6/image-edit");
      setImgPromptExpansion(reEdit.enable_prompt_expansion ?? true);
      if (reEdit.seed != null) { setImgSeed(String(reEdit.seed)); setImgRandomSeed(false); }
      if (reEdit.source_image_urls?.length) {
        const slots: (string | null)[] = [null, null, null, null];
        reEdit.source_image_urls.slice(0, 4).forEach((url: string, i: number) => { slots[i] = url; });
        setSlotImages(slots);
      }
    }
    setDefaultsLoaded(true);
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // Prompt blocks
  const { data: imgBlocks = [] } = useQuery({
    queryKey: ["img_prompt_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("prompt_blocks").select("*").like("category", "img_%").order("sort_order");
      return data || [];
    },
  });

  const { data: vidBlocks = [] } = useQuery({
    queryKey: ["vid_prompt_blocks"],
    queryFn: async () => {
      const { data } = await supabase.from("prompt_blocks").select("*").not("category", "like", "img_%").order("sort_order");
      return data || [];
    },
    enabled: !!user,
  });

  const { applyPrefs, applyCategoryPrefs, isCategoryHidden } = usePromptBlockPrefs();

  // Image blocks
  const imgBlocksByCategory = applyPrefs(imgBlocks).reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});
  const sortedImgCategories = applyCategoryPrefs(
    Object.keys(imgBlocksByCategory).filter((c) => c !== "img_negative")
  );
  const imgCategoryLabels: Record<string, string> = {
    img_realism: "Realism", img_identity: "Identity Preserve", img_face_swap: "Face Swap",
    img_lighting: "Lighting", img_scene: "Scene Edits", img_style: "Style & Film",
    img_enhance: "Enhancement", img_skin: "Skin Quality", img_hair: "Hair Quality",
    img_eyes: "Eye Quality", img_fabric: "Fabric & Clothing", img_camera: "Camera Presets",
    img_optics: "Optical Physics", img_lighting_q: "Lighting Quality",
    img_environment: "Environment & Scene", img_product: "Product & Object", img_post: "Post-Processing",
  };

  // Video blocks
  const vidBlocksByCategory = applyPrefs(vidBlocks).reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});
  const vidCategoryLabels: Record<string, string> = {
    shot_setup: "Shot Setup", camera: "Camera Move", motion: "Subject Motion",
    style: "Style & Mood", identity: "Identity Preserve",
    multi_char: "Multi-Character", multi_shot: "Multi-Shot",
  };
  const sortedVidCategories = applyCategoryPrefs(
    ["shot_setup", "camera", "motion", "style", "identity", "multi_char", "multi_shot"]
      .filter((k) => (vidBlocksByCategory[k] || []).length > 0)
  );

  // Recent results — only last 1 per mode
  const { data: recentImages = [] } = useQuery({
    queryKey: ["recent_images", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("image_edits").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1);
      return data || [];
    },
    enabled: !!user && (mode === "image" || mode === "upscale"),
    refetchInterval: 5000,
  });

  const { data: recentVideos = [] } = useQuery({
    queryKey: ["recent_videos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("generations").select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(1);
      return data || [];
    },
    enabled: !!user && mode === "video",
    refetchInterval: 5000,
  });

  const filledSlots = slotImages.filter(Boolean) as string[];

  // Handlers
  const handleSlotClick = (index: number) => { activeSlotRef.current = index; fileInputRef.current?.click(); };

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
      setSlotImages((prev) => { const next = [...prev]; next[slotIndex] = urlData.publicUrl; return next; });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeSlot = (index: number) => setSlotImages((prev) => { const n = [...prev]; n[index] = null; return n; });

  const toggleImgBlock = (value: string) => {
    setPrompt((prev) => {
      if (prev.includes(value)) return prev.replace(value, "").replace(/\s{2,}/g, " ").trim();
      return prev ? `${prev} ${value}` : value;
    });
  };

  const toggleVidBlock = (blockId: string, value: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
        setPrompt((p) => p.replace(` ${value}`, "").replace(`${value} `, "").replace(value, "").trim());
      } else {
        next.add(blockId);
        setPrompt((p) => (p ? `${p} ${value}` : value));
      }
      return next;
    });
  };

  const toggleNegativeBlock = (blockId: string, value: string) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
        setNegativePrompt((p) => p.replace(`, ${value}`, "").replace(`${value}, `, "").replace(value, "").trim());
      } else {
        next.add(blockId);
        setNegativePrompt((p) => (p ? `${p}, ${value}` : value));
      }
      return next;
    });
  };

  const handleVideoUpload = async () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !user) return;
      setVideoUploading(true);
      const ext = file.name.split(".").pop();
      const path = `${user.id}/create/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("seed-images").upload(path, file);
      if (error) { toast({ title: "Upload failed", description: error.message, variant: "destructive" }); }
      else { const { data } = supabase.storage.from("seed-images").getPublicUrl(path); setSeedImageUrl(data.publicUrl); }
      setVideoUploading(false);
    };
    input.click();
  };

  const handleUpscaleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUpscaleUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/create/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("seed-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("seed-images").getPublicUrl(path);
      setUpscaleImageUrl(data.publicUrl);
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUpscaleUploading(false);
      if (upscaleFileRef.current) upscaleFileRef.current.value = "";
    }
  };

  // Generate handlers
  const handleGenerateImage = async () => {
    if (filledSlots.length === 0 || !prompt.trim() || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          action: "start", image_urls: filledSlots, prompt, negative_prompt: negativePrompt,
          output_size: outputSize, seed: imgRandomSeed ? -1 : parseInt(imgSeed) || -1,
          enable_prompt_expansion: imgPromptExpansion, model: imageModel,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Generation started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_images"] });
      if (data?.edit?.id) { setLastGeneratedId(data.edit.id); pollImageEdit(data.edit.id); }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleGenerateVideo = async () => {
    if (!seedImageUrl || !prompt.trim() || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          action: "start",
          prompt, negative_prompt: negativePrompt, seed_image_url: seedImageUrl,
          resolution, duration, seed: vidRandomSeed ? -1 : parseInt(vidSeed) || -1,
          shot_type: shotType, enable_prompt_expansion: vidPromptExpansion,
          generate_audio: audioEnabled,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Video generation started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_videos"] });
      if (data?.generation?.id) { setLastGeneratedId(data.generation.id); pollVideoGen(data.generation.id); }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleGenerateUpscale = async () => {
    if (!upscaleImageUrl || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: { action: "start", image_url: upscaleImageUrl, target_resolution: targetResolution, creativity: 2 },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "Upscale started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_images"] });
      if (data?.edit?.id) { setLastGeneratedId(data.edit.id); pollImageEdit(data.edit.id); }
    } catch (err: any) {
      toast({ title: "Upscale failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const pollImageEdit = (editId: string) => {
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-image", { body: { action: "poll", edit_id: editId } });
        if (data?.status === "completed" || data?.status === "failed") {
          clearInterval(poll);
          queryClient.invalidateQueries({ queryKey: ["recent_images"] });
          toast({ title: data.status === "completed" ? "Complete!" : "Failed", description: data.error, variant: data.status === "failed" ? "destructive" : undefined });
        }
      } catch {}
    }, 4000);
  };

  const pollVideoGen = (genId: string) => {
    const poll = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-video", { body: { action: "poll", generation_id: genId } });
        if (data?.status === "completed" || data?.status === "failed") {
          clearInterval(poll);
          queryClient.invalidateQueries({ queryKey: ["recent_videos"] });
          toast({ title: data.status === "completed" ? "Video ready!" : "Failed", description: data.error, variant: data.status === "failed" ? "destructive" : undefined });
        }
      } catch {}
    }, 4000);
  };

  const handleGenerate = () => {
    if (mode === "image") handleGenerateImage();
    else if (mode === "video") handleGenerateVideo();
    else handleGenerateUpscale();
  };

  const imgCost = 0.021;
  const vidCost = estimateVideoCost(resolution, duration, audioEnabled);
  const canGenerate = mode === "image" ? filledSlots.length > 0 && prompt.trim().length > 0
    : mode === "video" ? !!seedImageUrl && prompt.trim().length > 0
    : !!upscaleImageUrl;

  const recentResults = lastGeneratedId
    ? (mode === "video" ? recentVideos : recentImages).filter((r: any) => {
        if (mode === "upscale") return r.id === lastGeneratedId;
        if (mode === "image") return r.id === lastGeneratedId;
        return r.id === lastGeneratedId;
      })
    : [];

  return (
    <AppShell title="Create">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <input ref={upscaleFileRef} type="file" accept="image/*" className="hidden" onChange={handleUpscaleUpload} />

      <div className="lg:grid lg:grid-cols-[1fr,1fr] xl:grid-cols-[minmax(0,520px),1fr] lg:gap-0 lg:divide-x lg:divide-border min-h-[calc(100vh-3.5rem-5rem)]">
        {/* Left: Controls */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)] space-y-5">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="image" className="flex-1 gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Image Edit</TabsTrigger>
              <TabsTrigger value="video" className="flex-1 gap-1.5"><Clapperboard className="h-3.5 w-3.5" />Video</TabsTrigger>
              <TabsTrigger value="upscale" className="flex-1 gap-1.5"><ZoomIn className="h-3.5 w-3.5" />Upscale</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ===== IMAGE MODE ===== */}
          {mode === "image" && (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Source Images ({filledSlots.length}/{MAX_IMAGES})</Label>
                  <SeedImageDrive onSelect={(url) => {
                    const emptyIdx = slotImages.findIndex((s) => !s);
                    if (emptyIdx !== -1) setSlotImages((prev) => { const n = [...prev]; n[emptyIdx] = url; return n; });
                    else toast({ title: "All slots full" });
                  }} />
                </div>
                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  {slotImages.map((url, i) => (
                    <div key={i} className={cn("relative aspect-[4/3] lg:aspect-square rounded-lg border-2 border-dashed transition-all overflow-hidden group",
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
              <Separator />
              <ImagePromptSection
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                blocksByCategory={imgBlocksByCategory} sortedCategories={sortedImgCategories}
                categoryLabels={imgCategoryLabels} toggleBlock={toggleImgBlock}
              />
              <Separator />
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
                  <div className="flex items-center gap-2"><Switch checked={imgRandomSeed} onCheckedChange={setImgRandomSeed} /><Label className="text-xs">Random Seed</Label></div>
                  {!imgRandomSeed && <Input type="number" placeholder="Seed" value={imgSeed} onChange={(e) => setImgSeed(e.target.value)} className="bg-surface-1 h-9 w-24 text-xs" />}
                  <div className="flex items-center gap-2"><Switch checked={imgPromptExpansion} onCheckedChange={setImgPromptExpansion} /><Label className="text-xs">Expand</Label></div>
                </div>
              </section>
            </>
          )}

          {/* ===== VIDEO MODE ===== */}
          {mode === "video" && (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Seed Image</Label>
                  {!seedImageUrl && <SeedImageDrive onSelect={setSeedImageUrl} />}
                </div>
                {seedImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-muted group">
                    <img src={seedImageUrl} alt="Seed" className="w-full aspect-video object-cover" />
                    <button onClick={() => setSeedImageUrl("")} className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 lg:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface-1/50 p-8 cursor-pointer hover:border-primary/40" onClick={handleVideoUpload}>
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Click to upload seed image</p>
                  </div>
                )}
                {!seedImageUrl && (
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="flex-1" disabled={videoUploading} onClick={handleVideoUpload}>
                      {videoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={async () => {
                      try { const text = await navigator.clipboard.readText(); if (text.startsWith("http")) setSeedImageUrl(text); else toast({ title: "No URL in clipboard" }); } catch { toast({ title: "Clipboard denied" }); }
                    }}><Clipboard className="h-4 w-4" /> Paste</Button>
                  </div>
                )}
                {!seedImageUrl && (
                  <div className="flex gap-2 mt-2">
                    <Input placeholder="Paste image URL..." value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} className="bg-surface-1 text-sm" />
                    <Button size="sm" disabled={!imageUrlInput} onClick={() => { setSeedImageUrl(imageUrlInput); setImageUrlInput(""); }}>Add</Button>
                  </div>
                )}
              </section>
              <Separator />
              <VideoPromptSection
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                blocksByCategory={vidBlocksByCategory} sortedCategories={sortedVidCategories}
                categoryLabels={vidCategoryLabels} selectedBlocks={selectedBlocks}
                toggleBlock={toggleVidBlock} toggleNegativeBlock={toggleNegativeBlock}
                isCategoryHidden={isCategoryHidden}
              />
              <Separator />
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
                  <div className="flex items-center gap-2"><Switch checked={vidRandomSeed} onCheckedChange={setVidRandomSeed} /><Label className="text-xs">Random Seed</Label></div>
                  {!vidRandomSeed && <Input type="number" placeholder="Seed" value={vidSeed} onChange={(e) => setVidSeed(e.target.value)} className="bg-surface-1 h-9 w-24 text-xs font-mono" />}
                  <div className="flex items-center gap-2"><Switch checked={vidPromptExpansion} onCheckedChange={setVidPromptExpansion} /><Label className="text-xs">Expand</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={audioEnabled} onCheckedChange={setAudioEnabled} /><Label className="text-xs">Audio</Label></div>
                </div>
              </section>
            </>
          )}

          {/* ===== UPSCALE MODE ===== */}
          {mode === "upscale" && (
            <>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">Image to Upscale</Label>
                  {!upscaleImageUrl && <SeedImageDrive onSelect={setUpscaleImageUrl} />}
                </div>
                {upscaleImageUrl ? (
                  <div className="relative rounded-xl overflow-hidden bg-muted group">
                    <img src={upscaleImageUrl} alt="Upscale source" className="w-full aspect-square object-cover" />
                    <button onClick={() => setUpscaleImageUrl("")} className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center rounded-full bg-background/80 backdrop-blur text-foreground opacity-0 group-hover:opacity-100 lg:opacity-100">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-surface-1/50 p-12 cursor-pointer hover:border-primary/40" onClick={() => upscaleFileRef.current?.click()}>
                    {upscaleUploading ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /> : (
                      <>
                        <ZoomIn className="h-8 w-8 text-muted-foreground/40 mb-2" />
                        <p className="text-xs text-muted-foreground">Click to upload image</p>
                      </>
                    )}
                  </div>
                )}
              </section>
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
            </>
          )}

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full h-12 text-sm" size="lg">
            {generating ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
            {mode === "image" ? `Generate · $${imgCost.toFixed(3)}` : mode === "video" ? `Generate · $${vidCost.toFixed(2)}` : `Upscale · $0.01`}
          </Button>
        </div>

        {/* Right: Recent Results */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)]">
          <Separator className="lg:hidden mb-5" />
          <h2 className="text-xs font-medium text-muted-foreground mb-3">
            Last {mode === "video" ? "Video" : mode === "upscale" ? "Upscale" : "Image"}
          </h2>
          {recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">No results yet</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {recentResults.map((item: any) => (
                <ResultCard key={item.id} item={item} mode={mode} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

// Sub-components

function ImagePromptSection({ prompt, setPrompt, negativePrompt, setNegativePrompt, blocksByCategory, sortedCategories, categoryLabels, toggleBlock }: any) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Edit Prompt</Label>
        <span className="text-[10px] text-muted-foreground">{prompt.length}/2000</span>
      </div>
      <Textarea placeholder="Describe the edit..." value={prompt} onChange={(e: any) => setPrompt(e.target.value)} className="bg-surface-1 min-h-[80px]" maxLength={2000} />
      {sortedCategories.map((category: string) => {
        const blocks = blocksByCategory[category] || [];
        if (blocks.length === 0) return null;
        return (
          <Collapsible key={category}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
              {categoryLabels[category] || category}<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {blocks.map((b: any) => (
                  <button key={b.id} onClick={() => toggleBlock(b.value)}
                    className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                      prompt.includes(b.value) ? "bg-primary text-primary-foreground border-primary" : "bg-surface-1 text-foreground border-border hover:border-primary/50")}>
                    {b.label}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
          Negative Prompt<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 pt-1">
          <Textarea placeholder="What to avoid..." value={negativePrompt} onChange={(e: any) => setNegativePrompt(e.target.value)} className="bg-surface-1 min-h-[50px]" />
          {blocksByCategory["img_negative"] && (
            <div className="flex gap-1.5 pt-1 flex-wrap">
              {(blocksByCategory["img_negative"] as any[]).map((b: any) => (
                <button key={b.id} onClick={() => setNegativePrompt(b.value)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-surface-1 text-foreground border-border hover:border-primary/50">
                  {b.label}
                </button>
              ))}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function VideoPromptSection({ prompt, setPrompt, negativePrompt, setNegativePrompt, blocksByCategory, sortedCategories, categoryLabels, selectedBlocks, toggleBlock, toggleNegativeBlock, isCategoryHidden }: any) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Prompt</Label>
        <span className={cn("text-[10px] font-mono", prompt.length > 2000 ? "text-destructive" : "text-muted-foreground")}>{prompt.length}/2000</span>
      </div>
      <Textarea value={prompt} onChange={(e: any) => setPrompt(e.target.value)} className="bg-surface-1 min-h-[80px] text-sm" placeholder="Build your prompt..." />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(prompt); toast({ title: "Copied" }); }}><Copy className="h-3 w-3" /> Copy</Button>
        <Button variant="outline" size="sm" onClick={() => { setPrompt(""); }}><RotateCcw className="h-3 w-3" /> Reset</Button>
      </div>

      {/* Templates */}
      {!isCategoryHidden("template") && (blocksByCategory["template"] || []).length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary">
            ⚡ Quick Templates<ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1.5">
              {(blocksByCategory["template"] || []).map((b: any) => (
                <button key={b.id} onClick={() => { try { const t = JSON.parse(b.value); setPrompt(t.positive || ""); setNegativePrompt(t.negative || ""); } catch {} }}
                  className="rounded-md bg-primary/10 px-2.5 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/20">{b.label}</button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {sortedCategories.map((key: string) => (
        <Collapsible key={key}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-surface-1 px-3 py-2.5 text-xs font-medium">
            {categoryLabels[key] || key}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">{(blocksByCategory[key] || []).length}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1.5">
              {(blocksByCategory[key] || []).map((b: any) => (
                <button key={b.id} onClick={() => toggleBlock(b.id, b.value)}
                  className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    selectedBlocks.has(b.id) ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                  {b.label}
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}

      {/* Super Prompts */}
      {!isCategoryHidden("super_prompt") && (blocksByCategory["super_prompt"] || []).length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-accent/30 px-3 py-2.5 text-xs font-medium">
            <span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Super Prompts</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="flex flex-wrap gap-1.5">
              {(blocksByCategory["super_prompt"] || []).map((b: any) => (
                <button key={b.id} onClick={() => toggleBlock(b.id, b.value)}
                  className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                    selectedBlocks.has(b.id) ? "bg-accent text-accent-foreground ring-1 ring-accent-foreground/20" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                  {b.label}
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Negative */}
      <Collapsible>
        <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
          Negative Prompt<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1.5 pt-1">
          <Textarea value={negativePrompt} onChange={(e: any) => setNegativePrompt(e.target.value)} className="bg-surface-1 min-h-[50px] text-sm" placeholder="What to avoid..." />
          <div className="flex flex-wrap gap-1.5">
            {(blocksByCategory["negative"] || []).map((b: any) => (
              <button key={b.id} onClick={() => toggleNegativeBlock(b.id, b.value)}
                className={cn("rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                  selectedBlocks.has(b.id) ? "bg-destructive/20 text-destructive" : "bg-surface-2 text-muted-foreground hover:bg-surface-3")}>
                {b.label}
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}

function ResultCard({ item, mode }: { item: any; mode: Mode }) {
  const statusColors: Record<string, string> = {
    completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    processing: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    failed: "bg-destructive/15 text-destructive border-destructive/20",
    queued: "bg-muted text-muted-foreground border-border",
  };

  const isVideo = mode === "video";
  const outputUrl = isVideo ? item.video_url : item.output_image_url;
  const promptText = isVideo ? item.prompt_used : item.prompt;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className={cn("text-[10px] border", statusColors[item.status] || statusColors.queued)}>
            {item.status}
          </Badge>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {item.cost != null && <span className="flex items-center gap-0.5"><DollarSign className="h-3 w-3" />{Number(item.cost).toFixed(3)}</span>}
            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
          </div>
        </div>

        {promptText && <p className="text-[11px] text-muted-foreground line-clamp-2">{promptText}</p>}

        {isVideo && item.video_url && (
          <video src={item.video_url} controls className="w-full rounded-lg" preload="metadata" />
        )}

        {!isVideo && item.output_image_url && (
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img src={item.output_image_url} alt="Output" className="w-full" loading="lazy" />
            <a href={item.output_image_url} download target="_blank" rel="noopener noreferrer"
              className="absolute bottom-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background">
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}

        {item.status === "failed" && (item.error_message || item.error) && (
          <div className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{item.error_message || item.error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CreatePage;
