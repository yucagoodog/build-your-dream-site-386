import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft, ChevronDown, Eye, EyeOff, GripVertical,
  Loader2, Save, Plus, Trash2, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


const ALL_CATEGORY_LABELS: Record<string, string> = {
  img_realism: "Realism", img_identity: "Identity Preserve", img_face_swap: "Face Swap",
  img_lighting: "Lighting", img_scene: "Scene Edits", img_style: "Style & Film",
  img_enhance: "Enhancement", img_skin: "Skin Quality", img_hair: "Hair Quality",
  img_eyes: "Eye Quality", img_fabric: "Fabric & Clothing", img_camera: "Camera Presets",
  img_optics: "Optical Physics", img_lighting_q: "Lighting Quality",
  img_environment: "Environment & Scene", img_product: "Product & Object",
  img_post: "Post-Processing", img_negative: "Image Negatives",
  shot_type: "Shot Setup", camera: "Camera Movement", motion: "Subject Motion",
  style: "Style & Mood", identity: "Identity Preserve", multi_char: "Multi-Character",
  multi_shot: "Multi-Shot", super_prompt: "Super Prompt", negative: "Video Negatives",
  template: "Templates",
};

interface LocalBlockPref { hidden: boolean; custom_sort_order: number | null; }
interface LocalCatPref { hidden: boolean; custom_sort_order: number; }

/* ── Sortable Category Row ── */
function SortableCategoryRow({
  category, catBlocks, catIdx, totalCats, isCatHidden, isBlockHidden,
  toggleCatHidden, toggleBlockHidden, moveBlock, onDeleteBlock,
}: {
  category: string; catBlocks: any[]; catIdx: number; totalCats: number;
  isCatHidden: boolean; isBlockHidden: (id: string) => boolean;
  toggleCatHidden: (cat: string) => void;
  toggleBlockHidden: (id: string) => void;
  moveBlock: (cat: string, blockId: string, fromIdx: number, toIdx: number) => void;
  onDeleteBlock?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `cat-${category}` });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  const hiddenInCat = catBlocks.filter((b: any) => isBlockHidden(b.id)).length;

  return (
    <div ref={setNodeRef} style={style} className={cn("rounded-lg bg-surface-1", isCatHidden && "opacity-40", isDragging && "shadow-lg ring-2 ring-primary/30")}>
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        {/* Drag handle */}
        <button {...attributes} {...listeners} className="h-8 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
          <GripVertical className="h-4 w-4" />
        </button>

        <Collapsible className="flex-1">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 py-1">
              <span className="text-xs font-medium">{ALL_CATEGORY_LABELS[category] || category}</span>
              <Badge variant="secondary" className="text-[10px] h-5">{catBlocks.length}</Badge>
              {hiddenInCat > 0 && <Badge variant="outline" className="text-[10px] h-5 text-muted-foreground">{hiddenInCat} hidden</Badge>}
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </CollapsibleTrigger>
            <button onClick={() => toggleCatHidden(category)}
              className={cn("h-7 w-7 flex items-center justify-center rounded-md transition-colors shrink-0",
                isCatHidden ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground")}>
              {isCatHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
          </div>
          <CollapsibleContent>
            <BlockList blocks={catBlocks} category={category} isBlockHidden={isBlockHidden} toggleBlockHidden={toggleBlockHidden} moveBlock={moveBlock} onDeleteBlock={onDeleteBlock} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/* ── Sortable Block Row ── */
function SortableBlockRow({ block, isHidden, toggleHidden, onDelete }: { block: any; isHidden: boolean; toggleHidden: () => void; onDelete?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  const isCustom = !block.is_builtin;

  return (
    <div ref={setNodeRef} style={style}
      className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        isHidden ? "bg-muted/30 opacity-50" : "bg-background hover:bg-surface-1",
        isDragging && "shadow-md ring-2 ring-primary/30")}>
      <button {...attributes} {...listeners} className="h-6 w-5 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium truncate">{block.label}</p>
          {isCustom && <Badge variant="outline" className="text-[8px] h-3.5 px-1">custom</Badge>}
        </div>
        <p className="text-[10px] text-muted-foreground truncate">{block.value}</p>
      </div>
      {isCustom && onDelete && (
        <button onClick={onDelete} className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive shrink-0">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
      <button onClick={toggleHidden}
        className={cn("h-6 w-6 flex items-center justify-center rounded-md transition-colors shrink-0",
          isHidden ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground")}>
        {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

/* ── Block list with its own DnD context ── */
function BlockList({ blocks, category, isBlockHidden, toggleBlockHidden, moveBlock, onDeleteBlock }: {
  blocks: any[]; category: string; isBlockHidden: (id: string) => boolean;
  toggleBlockHidden: (id: string) => void;
  moveBlock: (cat: string, blockId: string, fromIdx: number, toIdx: number) => void;
  onDeleteBlock?: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b: any) => b.id === active.id);
    const newIdx = blocks.findIndex((b: any) => b.id === over.id);
    if (oldIdx !== -1 && newIdx !== -1) moveBlock(category, active.id as string, oldIdx, newIdx);
  };

  return (
    <div className="mt-1 space-y-0.5 pl-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block: any) => (
            <SortableBlockRow key={block.id} block={block} isHidden={isBlockHidden(block.id)} toggleHidden={() => toggleBlockHidden(block.id)}
              onDelete={!block.is_builtin && onDeleteBlock ? () => onDeleteBlock(block.id) : undefined} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ── Custom Prompt Creator ── */
function CustomPromptCreator({ userId, pipeline, onCreated }: { userId: string; pipeline: "image" | "video"; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const imgCategories = ["img_realism", "img_identity", "img_lighting", "img_scene", "img_style", "img_enhance", "img_skin", "img_hair", "img_eyes", "img_camera", "img_post", "img_negative"];
  const vidCategories = ["shot_setup", "camera", "motion", "style", "identity", "negative", "super_prompt"];
  const categories = pipeline === "image" ? imgCategories : vidCategories;

  const handleCreate = async () => {
    if (!label.trim() || !value.trim() || !category) return;
    setSaving(true);
    const { error } = await supabase.from("prompt_blocks").insert({
      label: label.trim(), value: value.trim(), category,
      user_id: userId, is_builtin: false, sort_order: 999,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Custom prompt created" }); onCreated(); setOpen(false); setLabel(""); setValue(""); setCategory(""); }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 h-8"><Plus className="h-3.5 w-3.5" />Add Custom</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-sm">New Custom Prompt</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Label</Label><Input placeholder="e.g. My Cinematic Look" value={label} onChange={(e) => setLabel(e.target.value)} className="bg-surface-1 text-sm" /></div>
          <div className="space-y-1"><Label className="text-xs">Prompt Text</Label><Textarea placeholder="The actual prompt text to insert..." value={value} onChange={(e) => setValue(e.target.value)} className="bg-surface-1 min-h-[60px] text-sm" /></div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-surface-1 text-xs h-9"><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="text-xs">{ALL_CATEGORY_LABELS[c] || c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={saving || !label.trim() || !value.trim() || !category} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main Manager ── */
export function PromptBlockManager({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [pipeline, setPipeline] = useState<"image" | "video">("image");
  const [localBlockPrefs, setLocalBlockPrefs] = useState<Record<string, LocalBlockPref>>({});
  const [localCatPrefs, setLocalCatPrefs] = useState<Record<string, LocalCatPref>>({});
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const { data: blocks = [], isLoading: blocksLoading } = useQuery({
    queryKey: ["all_prompt_blocks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prompt_blocks").select("*").order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: blockPrefs = [], isLoading: blockPrefsLoading } = useQuery({
    queryKey: ["user_prompt_block_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_prompt_block_prefs").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: catPrefs = [], isLoading: catPrefsLoading } = useQuery({
    queryKey: ["user_prompt_category_prefs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_prompt_category_prefs").select("*").eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (blockPrefs.length > 0) {
      const map: Record<string, LocalBlockPref> = {};
      blockPrefs.forEach((p: any) => { map[p.block_id] = { hidden: p.hidden, custom_sort_order: p.custom_sort_order }; });
      setLocalBlockPrefs(map);
    }
  }, [blockPrefs]);

  useEffect(() => {
    if (catPrefs.length > 0) {
      const map: Record<string, LocalCatPref> = {};
      catPrefs.forEach((p: any) => { map[p.category] = { hidden: p.hidden, custom_sort_order: p.custom_sort_order ?? 0 }; });
      setLocalCatPrefs(map);
    }
  }, [catPrefs]);

  const isImageCategory = (cat: string) => cat.startsWith("img_");

  const filteredBlocks = blocks.filter((b: any) =>
    pipeline === "image" ? isImageCategory(b.category) : !isImageCategory(b.category)
  );

  const allCategories = [...new Set(filteredBlocks.map((b: any) => b.category))];
  const sortedCategories = [...allCategories].sort((a, b) => {
    const aOrder = localCatPrefs[a]?.custom_sort_order ?? allCategories.indexOf(a);
    const bOrder = localCatPrefs[b]?.custom_sort_order ?? allCategories.indexOf(b);
    return aOrder - bOrder;
  });

  const blocksByCategory: Record<string, any[]> = {};
  filteredBlocks.forEach((block: any) => {
    if (!blocksByCategory[block.category]) blocksByCategory[block.category] = [];
    blocksByCategory[block.category].push(block);
  });
  Object.keys(blocksByCategory).forEach((cat) => {
    blocksByCategory[cat].sort((a: any, b: any) => {
      const aSort = localBlockPrefs[a.id]?.custom_sort_order ?? a.sort_order;
      const bSort = localBlockPrefs[b.id]?.custom_sort_order ?? b.sort_order;
      return aSort - bSort;
    });
  });

  const isBlockHidden = (blockId: string) => localBlockPrefs[blockId]?.hidden ?? false;
  const isCatHidden = (cat: string) => localCatPrefs[cat]?.hidden ?? false;

  const toggleBlockHidden = (blockId: string) => {
    setLocalBlockPrefs((prev) => ({
      ...prev,
      [blockId]: { hidden: !(prev[blockId]?.hidden ?? false), custom_sort_order: prev[blockId]?.custom_sort_order ?? null },
    }));
    setDirty(true);
  };

  const toggleCatHidden = (cat: string) => {
    setLocalCatPrefs((prev) => ({
      ...prev,
      [cat]: { hidden: !(prev[cat]?.hidden ?? false), custom_sort_order: prev[cat]?.custom_sort_order ?? sortedCategories.indexOf(cat) },
    }));
    setDirty(true);
  };

  // Category drag end
  const handleCatDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sortedCategories.findIndex((c) => `cat-${c}` === active.id);
    const newIdx = sortedCategories.findIndex((c) => `cat-${c}` === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const reordered = arrayMove(sortedCategories, oldIdx, newIdx);
    const newPrefs = { ...localCatPrefs };
    reordered.forEach((c, i) => {
      newPrefs[c] = { hidden: newPrefs[c]?.hidden ?? false, custom_sort_order: i };
    });
    setLocalCatPrefs(newPrefs);
    setDirty(true);
  };

  // Block reorder within category
  const moveBlock = (_cat: string, _blockId: string, fromIdx: number, toIdx: number) => {
    const cat = _cat;
    const reordered = arrayMove(blocksByCategory[cat], fromIdx, toIdx);
    const newPrefs = { ...localBlockPrefs };
    reordered.forEach((b: any, i: number) => {
      newPrefs[b.id] = { hidden: newPrefs[b.id]?.hidden ?? false, custom_sort_order: i };
    });
    setLocalBlockPrefs(newPrefs);
    setDirty(true);
  };

  const handleDeleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("prompt_blocks").delete().eq("id", blockId).eq("user_id", user!.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
    else {
      queryClient.invalidateQueries({ queryKey: ["all_prompt_blocks"] });
      queryClient.invalidateQueries({ queryKey: ["img_prompt_blocks"] });
      queryClient.invalidateQueries({ queryKey: ["vid_prompt_blocks"] });
      toast({ title: "Prompt deleted" });
    }
  };

  const handlePromptCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["all_prompt_blocks"] });
    queryClient.invalidateQueries({ queryKey: ["img_prompt_blocks"] });
    queryClient.invalidateQueries({ queryKey: ["vid_prompt_blocks"] });
  };

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const blockUpserts = Object.entries(localBlockPrefs).map(([block_id, pref]) => ({
        user_id: user.id, block_id, hidden: pref.hidden, custom_sort_order: pref.custom_sort_order,
      }));
      if (blockUpserts.length > 0) {
        const { error } = await supabase.from("user_prompt_block_prefs").upsert(blockUpserts, { onConflict: "user_id,block_id" });
        if (error) throw error;
      }
      const catUpserts = Object.entries(localCatPrefs).map(([category, pref]) => ({
        user_id: user.id, category, hidden: pref.hidden, custom_sort_order: pref.custom_sort_order,
      }));
      if (catUpserts.length > 0) {
        const { error } = await supabase.from("user_prompt_category_prefs").upsert(catUpserts, { onConflict: "user_id,category" });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["user_prompt_block_prefs"] });
      queryClient.invalidateQueries({ queryKey: ["user_prompt_category_prefs"] });
      queryClient.invalidateQueries({ queryKey: ["img_prompt_blocks"] });
      queryClient.invalidateQueries({ queryKey: ["prompt_blocks"] });
      toast({ title: "Prompt preferences saved" });
      setDirty(false);
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [user, localBlockPrefs, localCatPrefs, queryClient]);

  const loading = blocksLoading || blockPrefsLoading || catPrefsLoading;
  const hiddenCats = Object.values(localCatPrefs).filter((p) => p.hidden).length;
  const hiddenBlocks = Object.values(localBlockPrefs).filter((p) => p.hidden).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="tap-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">Prompt Library</h2>
          <p className="text-[10px] text-muted-foreground">{hiddenCats} groups hidden · {hiddenBlocks} blocks hidden</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="h-8">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex rounded-lg bg-surface-1 p-1 gap-1 flex-1 mr-2">
        {(["image", "video"] as const).map((p) => (
          <button key={p} onClick={() => setPipeline(p)}
            className={cn("flex-1 rounded-md py-2 text-xs font-medium transition-colors capitalize",
              pipeline === p ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {p} Prompts
          </button>
        ))}
        </div>
        {user && <CustomPromptCreator userId={user.id} pipeline={pipeline} onCreated={handlePromptCreated} />}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
          <SortableContext items={sortedCategories.map((c) => `cat-${c}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1.5">
              {sortedCategories.map((category, catIdx) => (
                <SortableCategoryRow
                  key={category}
                  category={category}
                  catBlocks={blocksByCategory[category] || []}
                  catIdx={catIdx}
                  totalCats={sortedCategories.length}
                  isCatHidden={isCatHidden(category)}
                  isBlockHidden={isBlockHidden}
                  toggleCatHidden={toggleCatHidden}
                  toggleBlockHidden={toggleBlockHidden}
                   moveBlock={moveBlock}
                   onDeleteBlock={handleDeleteBlock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
