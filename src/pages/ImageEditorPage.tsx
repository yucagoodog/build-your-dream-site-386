import { useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, Star, ChevronDown, Sparkles, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { IMAGE_SIZES } from "@/lib/image-sizes";

const ImageEditorPage = () => {
  const { sourceImageId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedEditId, setSelectedEditId] = useState<string | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Edit form state
  const [editPrompt, setEditPrompt] = useState("");
  const [editNegativePrompt, setEditNegativePrompt] = useState("");
  const [outputSize, setOutputSize] = useState("1024*1024");
  const [editModel, setEditModel] = useState("alibaba/wan-2.6/image-edit");
  const [editSeed, setEditSeed] = useState("");
  const [useRandomSeed, setUseRandomSeed] = useState(true);
  const [promptExpansion, setPromptExpansion] = useState(true);
  const [parentEditId, setParentEditId] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch source image
  const { data: sourceImage } = useQuery({
    queryKey: ["source_image", sourceImageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_images")
        .select("*")
        .eq("id", sourceImageId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!sourceImageId && !!user,
  });

  // Fetch edits
  const { data: edits = [] } = useQuery({
    queryKey: ["image_edits", sourceImageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("image_edits")
        .select("*")
        .eq("source_image_id", sourceImageId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!sourceImageId && !!user,
  });

  // Fetch image prompt blocks
  const { data: promptBlocks = [] } = useQuery({
    queryKey: ["img_prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_blocks")
        .select("*")
        .like("category", "img_%")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const selectedEdit = edits.find((e: any) => e.id === selectedEditId);
  const displayImage = selectedEdit?.output_image_url || sourceImage?.image_url;

  // Group prompt blocks by category
  const blocksByCategory = promptBlocks.reduce((acc: Record<string, any[]>, block: any) => {
    if (!acc[block.category]) acc[block.category] = [];
    acc[block.category].push(block);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    img_realism: "Photo Realism",
    img_lighting: "Lighting",
    img_subject: "Subject Edits",
    img_enhance: "Enhancement",
    img_negative: "Negative Presets",
  };

  const toggleBlock = (value: string) => {
    setEditPrompt((prev) => {
      if (prev.includes(value)) return prev.replace(value, "").replace(/\s{2,}/g, " ").trim();
      return prev ? `${prev} ${value}` : value;
    });
  };

  const applyNegativePreset = (value: string) => {
    setEditNegativePrompt(value);
  };

  const handleRunEdit = async () => {
    if (!sourceImageId || !user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-image", {
        body: {
          action: "start",
          source_image_id: sourceImageId,
          prompt: editPrompt,
          negative_prompt: editNegativePrompt,
          output_size: outputSize,
          seed: useRandomSeed ? -1 : parseInt(editSeed) || -1,
          enable_prompt_expansion: promptExpansion,
          model: editModel,
          parent_edit_id: parentEditId,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      toast({ title: "Edit started!" });
      setEditSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["image_edits", sourceImageId] });

      // Start polling
      if (data?.edit?.id) {
        const poll = setInterval(async () => {
          try {
            const { data: pollData } = await supabase.functions.invoke("generate-image", {
              body: { action: "poll", edit_id: data.edit.id },
            });
            if (pollData?.status === "completed" || pollData?.status === "failed") {
              clearInterval(poll);
              queryClient.invalidateQueries({ queryKey: ["image_edits", sourceImageId] });
              if (pollData.status === "completed") {
                toast({ title: "Edit completed!" });
              } else {
                toast({ title: "Edit failed", description: pollData.error, variant: "destructive" });
              }
            }
          } catch {}
        }, 4000);
        pollingRef.current = poll;
      }
    } catch (err: any) {
      toast({ title: "Edit failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (editId: string) => {
    await supabase.from("image_edits").update({ is_final: true }).eq("id", editId);
    await supabase.from("source_images").update({ approved_edit_id: editId }).eq("id", sourceImageId!);
    queryClient.invalidateQueries({ queryKey: ["image_edits", sourceImageId] });
    queryClient.invalidateQueries({ queryKey: ["source_image", sourceImageId] });
    toast({ title: "Edit approved as final" });
  };

  const handleUseAsSource = (editId: string) => {
    setParentEditId(editId);
    setEditSheetOpen(true);
  };

  return (
    <AppShell
      title="Image Editor"
      headerLeft={
        <button onClick={() => navigate(-1)} className="tap-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
      }
    >
      <div className="flex flex-col">
        {/* Main image preview */}
        <div className="w-full bg-muted aspect-square max-h-[50vh] flex items-center justify-center overflow-hidden">
          {displayImage ? (
            <img src={displayImage} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Version timeline */}
        <div className="border-b border-border">
          <ScrollArea className="w-full">
            <div className="flex gap-2 p-3">
              {/* Original */}
              <button
                onClick={() => setSelectedEditId(null)}
                className={cn(
                  "shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors",
                  !selectedEditId ? "border-primary" : "border-border/50"
                )}
              >
                {sourceImage?.image_url && (
                  <img src={sourceImage.image_url} alt="Original" className="w-full h-full object-cover" />
                )}
              </button>
              {/* Edits */}
              {edits.map((edit: any, i: number) => (
                <button
                  key={edit.id}
                  onClick={() => setSelectedEditId(edit.id)}
                  className={cn(
                    "shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-colors relative",
                    selectedEditId === edit.id ? "border-primary" : "border-border/50"
                  )}
                >
                  {edit.output_image_url ? (
                    <img src={edit.output_image_url} alt={`Edit ${i + 1}`} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      {edit.status === "processing" ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{edit.status}</span>
                      )}
                    </div>
                  )}
                  {edit.is_final && (
                    <Star className="absolute top-0.5 right-0.5 h-3 w-3 fill-yellow-500 text-yellow-500" />
                  )}
                </button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Actions for selected edit */}
        <div className="p-4 space-y-3">
          {selectedEdit && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-[10px]">{selectedEdit.status}</Badge>
                <span>${selectedEdit.cost}</span>
                {selectedEdit.prompt && <span className="truncate flex-1">{selectedEdit.prompt}</span>}
              </div>
              <div className="flex gap-2">
                {selectedEdit.status === "completed" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleApprove(selectedEdit.id)}>
                      <Star className="h-3.5 w-3.5" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleUseAsSource(selectedEdit.id)}>
                      <Sparkles className="h-3.5 w-3.5" /> Use as Source
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={selectedEdit.output_image_url} download target="_blank" rel="noopener noreferrer">
                        Download
                      </a>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          <Button onClick={() => { setParentEditId(null); setEditSheetOpen(true); }} className="w-full">
            <Sparkles className="h-4 w-4" /> New Edit
          </Button>
        </div>
      </div>

      {/* Edit Bottom Sheet */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>
              {parentEditId ? "Chain Edit" : "New Edit"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4">
            {/* Source thumbnail */}
            {sourceImage?.image_url && (
              <div className="w-20 h-20 rounded-md overflow-hidden border border-border">
                <img src={sourceImage.image_url} alt="Source" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Edit Prompt</Label>
                <span className="text-[10px] text-muted-foreground">{editPrompt.length}/2000</span>
              </div>
              <Textarea
                placeholder="Describe the edit you want..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className="bg-surface-1 min-h-[80px]"
                maxLength={2000}
              />
            </div>

            {/* Block pickers */}
            {Object.entries(blocksByCategory).filter(([cat]) => cat !== "img_negative").map(([category, blocks]) => (
              <Collapsible key={category}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-1.5 text-xs font-medium">
                  {categoryLabels[category] || category}
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(blocks as any[]).map((block: any) => (
                      <button
                        key={block.id}
                        onClick={() => toggleBlock(block.value)}
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors",
                          editPrompt.includes(block.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-surface-1 text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {block.label}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}

            {/* Negative prompt */}
            <div className="space-y-1.5">
              <Label className="text-xs">Negative Prompt</Label>
              <Textarea
                placeholder="What to avoid..."
                value={editNegativePrompt}
                onChange={(e) => setEditNegativePrompt(e.target.value)}
                className="bg-surface-1 min-h-[60px]"
              />
              {blocksByCategory["img_negative"] && (
                <div className="flex gap-1.5 pt-1">
                  {(blocksByCategory["img_negative"] as any[]).map((block: any) => (
                    <button
                      key={block.id}
                      onClick={() => applyNegativePreset(block.value)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-surface-1 text-foreground border-border hover:border-primary/50 transition-colors"
                    >
                      {block.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Output size */}
            <div className="space-y-1.5">
              <Label className="text-xs">Output Size</Label>
              <Select value={outputSize} onValueChange={setOutputSize}>
                <SelectTrigger className="bg-surface-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IMAGE_SIZES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label} ({s.value.replace("*", "×")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <Label className="text-xs">Model</Label>
              <Select value={editModel} onValueChange={setEditModel}>
                <SelectTrigger className="bg-surface-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alibaba/wan-2.6/image-edit">WAN 2.6 Image Edit</SelectItem>
                  <SelectItem value="alibaba/qwen-edit-plus">Qwen Edit Plus</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Seed */}
            <div className="flex items-center gap-3">
              <Switch checked={useRandomSeed} onCheckedChange={setUseRandomSeed} />
              <Label className="text-xs">Random Seed</Label>
              {!useRandomSeed && (
                <Input
                  type="number"
                  placeholder="Seed"
                  value={editSeed}
                  onChange={(e) => setEditSeed(e.target.value)}
                  className="bg-surface-1 w-28"
                />
              )}
            </div>

            {/* Prompt Expansion */}
            <div className="flex items-center gap-3">
              <Switch checked={promptExpansion} onCheckedChange={setPromptExpansion} />
              <Label className="text-xs">Prompt Expansion</Label>
            </div>

            {/* Cost + Run */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Cost: $0.021</span>
              <Button
                onClick={handleRunEdit}
                disabled={!editPrompt.trim() || generating}
                className="min-w-[120px]"
              >
                {generating ? <Loader2 className="animate-spin" /> : <Play className="h-4 w-4" />}
                Run Edit
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};

export default ImageEditorPage;
