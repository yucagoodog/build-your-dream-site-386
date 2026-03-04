import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Sparkles, Play, Download,
  Clock, DollarSign, AlertCircle,
  Image as ImageIcon, Clapperboard, ZoomIn, FolderOpen, Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { downloadFile } from "@/lib/download";
import { saveToDrive } from "@/lib/save-to-drive";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { formatDistanceToNow } from "date-fns";
import { extractInvokeError } from "@/lib/invoke-error";
import {
  ImageSourceSlots, SeedImageUpload,
  ImagePromptSection, ImageParamsSection,
  VideoModelSelector, VideoPromptSection, VideoParamsSection,
  UpscaleParamsSection, OverlayParamsSection,
} from "@/components/generation/SharedGenerationUI";

type Mode = "image" | "video" | "upscale" | "overlay";

function estimateVideoCost(resolution: string, duration: number, audio: boolean, model: string): number {
  if (model === "alibaba/wan-2.6/image-to-video") {
    // Standard: 720p=$0.10/s, 1080p=$0.15/s
    return (resolution === "1080p" ? 0.15 : 0.10) * duration;
  }
  // Flash pricing
  const perSecond = audio
    ? (resolution === "1080p" ? 0.12 : 0.06)
    : (resolution === "1080p" ? 0.0262 : 0.0175);
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
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image state
  const [slotImages, setSlotImages] = useState<(string | null)[]>([null, null, null, null]);
  const [outputSize, setOutputSize] = useState("1280*1280");
  const [imageModel, setImageModel] = useState("alibaba/wan-2.6/image-edit");
  const [imgSeed, setImgSeed] = useState("");
  const [imgRandomSeed, setImgRandomSeed] = useState(true);
  const [imgPromptExpansion, setImgPromptExpansion] = useState(true);

  // Video state
  const [seedImageUrl, setSeedImageUrl] = useState("");
  const [resolution, setResolution] = useState("720p");
  const [duration, setDuration] = useState(5);
  const [vidSeed, setVidSeed] = useState("");
  const [vidRandomSeed, setVidRandomSeed] = useState(true);
  const [shotType, setShotType] = useState("single");
  const [vidPromptExpansion, setVidPromptExpansion] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoModel, setVideoModel] = useState("alibaba/wan-2.6/image-to-video-flash");

  // Upscale state
  const [upscaleImageUrl, setUpscaleImageUrl] = useState("");
  const [upscalePrompt, setUpscalePrompt] = useState("Enhance this image to higher quality and resolution with maximum detail");
  const [upscaleAspectRatio, setUpscaleAspectRatio] = useState("original");
  const [upscaleOutputFormat, setUpscaleOutputFormat] = useState("png");
  const [upscaleResolution, setUpscaleResolution] = useState("1k");

  // Overlay state
  const [overlayBaseUrl, setOverlayBaseUrl] = useState("");
  const [overlayPngUrl, setOverlayPngUrl] = useState("");
  const [overlayOpacity, setOverlayOpacity] = useState(100);
  const [overlayScale, setOverlayScale] = useState(100);
  const [overlayPosX, setOverlayPosX] = useState(0);
  const [overlayPosY, setOverlayPosY] = useState(0);
  const [overlayResultUrl, setOverlayResultUrl] = useState<string | null>(null);

  // Load user defaults
  const { data: userSettings } = useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
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

  const imgBlocksByCategory = imgBlocks.reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  const vidBlocksByCategory = vidBlocks.reduce((acc: Record<string, any[]>, b: any) => {
    if (!acc[b.category]) acc[b.category] = [];
    acc[b.category].push(b);
    return acc;
  }, {});

  // Recent results
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

  // Generate handlers
  const handleGenerateImage = async () => {
    if (filledSlots.length === 0 || !prompt.trim() || !user) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          action: "start", image_urls: filledSlots, prompt, negative_prompt: negativePrompt,
          output_size: outputSize, seed: imgRandomSeed ? -1 : parseInt(imgSeed) || -1,
          enable_prompt_expansion: imgPromptExpansion, model: imageModel,
        },
      });
      const errMsg = await extractInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Generation started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_images"] });
      if (data?.edit?.id) { setLastGeneratedId(data.edit.id); pollImageEdit(data.edit.id); }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleGenerateVideo = async () => {
    if (!seedImageUrl || !prompt.trim() || !user) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: {
          action: "start", prompt, negative_prompt: negativePrompt, seed_image_url: seedImageUrl,
          resolution, duration, seed: vidRandomSeed ? -1 : parseInt(vidSeed) || -1,
          shot_type: shotType, enable_prompt_expansion: vidPromptExpansion, generate_audio: audioEnabled,
          model: videoModel,
        },
      });
      const errMsg = await extractInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Video generation started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_videos"] });
      if (data?.generation?.id) { setLastGeneratedId(data.generation.id); pollVideoGen(data.generation.id); }
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleGenerateUpscale = async () => {
    if (!upscaleImageUrl || !user) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("upscale-image", {
        body: {
          action: "start",
          image_url: upscaleImageUrl,
          prompt: upscalePrompt,
          aspect_ratio: upscaleAspectRatio === "original" ? undefined : upscaleAspectRatio,
          output_format: upscaleOutputFormat,
          resolution: upscaleResolution,
        },
      });
      const errMsg = await extractInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      toast({ title: "Upscale started!" });
      queryClient.invalidateQueries({ queryKey: ["recent_images"] });
      if (data?.edit?.id) { setLastGeneratedId(data.edit.id); pollImageEdit(data.edit.id); }
    } catch (err: any) {
      toast({ title: "Upscale failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const handleGenerateOverlay = async () => {
    if (!overlayBaseUrl || !overlayPngUrl || !user) return;
    setGenerating(true);
    setOverlayResultUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("composite-image", {
        body: {
          base_image_url: overlayBaseUrl,
          overlay_image_url: overlayPngUrl,
          opacity: overlayOpacity,
          scale: overlayScale,
          position_x: overlayPosX,
          position_y: overlayPosY,
        },
      });
      const errMsg = await extractInvokeError(error, data);
      if (errMsg) throw new Error(errMsg);
      setOverlayResultUrl(data.result_url);
      toast({ title: "Overlay complete!" });
    } catch (err: any) {
      toast({ title: "Overlay failed", description: err.message, variant: "destructive" });
    } finally { setGenerating(false); }
  };

  const pollImageEdit = (editId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-image", { body: { action: "poll", edit_id: editId } });
        if (data?.status === "completed" || data?.status === "failed") {
          clearInterval(interval);
          if (pollRef.current === interval) pollRef.current = null;
          queryClient.invalidateQueries({ queryKey: ["recent_images"] });
          queryClient.invalidateQueries({ queryKey: ["library_image_edits"] });
          toast({ title: data.status === "completed" ? "Complete!" : "Failed", description: data.error, variant: data.status === "failed" ? "destructive" : undefined });
        }
      } catch {}
    }, 4000);
    pollRef.current = interval;
  };

  const pollVideoGen = (genId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.functions.invoke("generate-video", { body: { action: "poll", generation_id: genId } });
        if (data?.status === "completed" || data?.status === "failed") {
          clearInterval(interval);
          if (pollRef.current === interval) pollRef.current = null;
          queryClient.invalidateQueries({ queryKey: ["recent_videos"] });
          queryClient.invalidateQueries({ queryKey: ["library_video_gens"] });
          toast({ title: data.status === "completed" ? "Video ready!" : "Failed", description: data.error, variant: data.status === "failed" ? "destructive" : undefined });
        }
      } catch {}
    }, 4000);
    pollRef.current = interval;
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleGenerate = () => {
    if (mode === "image") handleGenerateImage();
    else if (mode === "video") handleGenerateVideo();
    else if (mode === "overlay") handleGenerateOverlay();
    else handleGenerateUpscale();
  };

  const imgCost = 0.021;
  const vidCost = estimateVideoCost(resolution, duration, audioEnabled, videoModel);
  const canGenerate = mode === "image" ? filledSlots.length > 0 && prompt.trim().length > 0
    : mode === "video" ? !!seedImageUrl && prompt.trim().length > 0
    : mode === "overlay" ? !!overlayBaseUrl && !!overlayPngUrl
    : !!upscaleImageUrl;

  const recentResults = mode === "video" ? recentVideos : recentImages;

  return (
    <AppShell title="Create">
      <div className="lg:grid lg:grid-cols-[1fr,1fr] xl:grid-cols-[minmax(0,520px),1fr] lg:gap-0 lg:divide-x lg:divide-border min-h-[calc(100vh-3.5rem-5rem)]">
        {/* Left: Controls */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)] space-y-5">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="image" className="flex-1 gap-1.5"><ImageIcon className="h-3.5 w-3.5" />Image</TabsTrigger>
              <TabsTrigger value="video" className="flex-1 gap-1.5"><Clapperboard className="h-3.5 w-3.5" />Video</TabsTrigger>
              <TabsTrigger value="upscale" className="flex-1 gap-1.5"><ZoomIn className="h-3.5 w-3.5" />Upscale</TabsTrigger>
              <TabsTrigger value="overlay" className="flex-1 gap-1.5"><Layers className="h-3.5 w-3.5" />Overlay</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* IMAGE MODE */}
          {mode === "image" && (
            <>
              <ImageSourceSlots slotImages={slotImages} setSlotImages={setSlotImages} />
              <Separator />
              <ImagePromptSection
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                blocksByCategory={imgBlocksByCategory}
              />
              <Separator />
              <ImageParamsSection
                outputSize={outputSize} setOutputSize={setOutputSize}
                imageModel={imageModel} setImageModel={setImageModel}
                randomSeed={imgRandomSeed} setRandomSeed={setImgRandomSeed}
                seed={imgSeed} setSeed={setImgSeed}
                promptExpansion={imgPromptExpansion} setPromptExpansion={setImgPromptExpansion}
              />
            </>
          )}

          {/* VIDEO MODE */}
          {mode === "video" && (
            <>
              <VideoModelSelector videoModel={videoModel} setVideoModel={setVideoModel} />
              <Separator />
              <SeedImageUpload imageUrl={seedImageUrl} setImageUrl={setSeedImageUrl} />
              <Separator />
              <VideoPromptSection
                prompt={prompt} setPrompt={setPrompt}
                negativePrompt={negativePrompt} setNegativePrompt={setNegativePrompt}
                blocksByCategory={vidBlocksByCategory}
                duration={duration}
              />
              <Separator />
              <VideoParamsSection
                resolution={resolution} setResolution={setResolution}
                shotType={shotType} setShotType={setShotType}
                duration={duration} setDuration={setDuration}
                randomSeed={vidRandomSeed} setRandomSeed={setVidRandomSeed}
                seed={vidSeed} setSeed={setVidSeed}
                promptExpansion={vidPromptExpansion} setPromptExpansion={setVidPromptExpansion}
                audioEnabled={audioEnabled} setAudioEnabled={setAudioEnabled}
                videoModel={videoModel}
              />
            </>
          )}

          {/* UPSCALE MODE */}
          {mode === "upscale" && (
            <>
              <SeedImageUpload imageUrl={upscaleImageUrl} setImageUrl={setUpscaleImageUrl} label="Image to Upscale" />
              <UpscaleParamsSection
                prompt={upscalePrompt} setPrompt={setUpscalePrompt}
                aspectRatio={upscaleAspectRatio} setAspectRatio={setUpscaleAspectRatio}
                outputFormat={upscaleOutputFormat} setOutputFormat={setUpscaleOutputFormat}
                resolution={upscaleResolution} setResolution={setUpscaleResolution}
              />
            </>
          )}

          {/* OVERLAY MODE */}
          {mode === "overlay" && (
            <>
              <SeedImageUpload imageUrl={overlayBaseUrl} setImageUrl={setOverlayBaseUrl} label="Base Image" />
              <Separator />
              <SeedImageUpload imageUrl={overlayPngUrl} setImageUrl={setOverlayPngUrl} label="Overlay PNG" />
              <Separator />
              <OverlayParamsSection
                opacity={overlayOpacity} setOpacity={setOverlayOpacity}
                scale={overlayScale} setScale={setOverlayScale}
                positionX={overlayPosX} setPositionX={setOverlayPosX}
                positionY={overlayPosY} setPositionY={setOverlayPosY}
              />
            </>
          )}

          {/* Generate Button */}
          <Button onClick={handleGenerate} disabled={!canGenerate || generating} className="w-full h-12 text-sm" size="lg">
            {generating ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
            {mode === "image" ? `Generate · $${imgCost.toFixed(3)}` : mode === "video" ? `Generate · $${vidCost.toFixed(2)}` : mode === "overlay" ? "Composite" : `Upscale · $0.01`}
          </Button>
        </div>

        {/* Right: Recent Results */}
        <div className="p-4 lg:p-6 lg:overflow-y-auto lg:max-h-[calc(100vh-3.5rem)]">
          <Separator className="lg:hidden mb-5" />
          <h2 className="text-xs font-medium text-muted-foreground mb-3">
            Last {mode === "video" ? "Video" : mode === "upscale" ? "Upscale" : mode === "overlay" ? "Overlay" : "Image"}
          </h2>

          {/* Overlay result inline */}
          {mode === "overlay" && overlayResultUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-muted group">
                <img src={overlayResultUrl} alt="Composited result" className="w-full" />
                <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 lg:opacity-100 transition-opacity">
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-[11px]" onClick={() => downloadFile(overlayResultUrl, "overlay-result.png")}>
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 gap-1.5 text-[11px]" onClick={async () => {
                    await saveToDrive(overlayResultUrl, user!.id);
                    toast({ title: "Saved to Drive" });
                  }}>
                    <FolderOpen className="h-3.5 w-3.5" /> Save
                  </Button>
                </div>
              </div>
            </div>
          ) : mode === "overlay" ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">Upload a base image and overlay PNG, then composite</p>
            </div>
          ) : recentResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-xs text-muted-foreground">No results yet</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {recentResults.map((item: any) => (
                <ResultCard key={item.id} item={item} mode={mode} userId={user!.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

function ResultCard({ item, mode, userId }: { item: any; mode: Mode; userId: string }) {
  const statusColors: Record<string, string> = {
    completed: "bg-[hsl(var(--status-completed))]/15 text-[hsl(var(--status-completed))] border-[hsl(var(--status-completed))]/20",
    processing: "bg-[hsl(var(--status-processing))]/15 text-[hsl(var(--status-processing))] border-[hsl(var(--status-processing))]/20",
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
          <>
            <video src={item.video_url} controls className="w-full rounded-lg" preload="metadata" />
            <div className="flex gap-1.5 pt-1">
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => saveToDrive(item.video_url!, userId)}>
                <FolderOpen className="h-3 w-3" /> Save to Drive
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2" onClick={() => downloadFile(item.video_url!, `video-${item.id.slice(0,8)}.mp4`)}>
                <Download className="h-3 w-3" /> Download
              </Button>
            </div>
          </>
        )}
        {!isVideo && item.output_image_url && (
          <div className="relative rounded-lg overflow-hidden bg-muted">
            <img src={item.output_image_url} alt="Output" className="w-full" loading="lazy" />
            <div className="absolute bottom-2 right-2 flex gap-1.5">
              <button onClick={() => saveToDrive(item.output_image_url!, userId)}
                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background" title="Save to My Images">
                <FolderOpen className="h-4 w-4" />
              </button>
              <button onClick={() => downloadFile(item.output_image_url!, `image-${item.id.slice(0,8)}.png`)}
                className="h-8 w-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-foreground hover:bg-background">
                <Download className="h-4 w-4" />
              </button>
            </div>
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
