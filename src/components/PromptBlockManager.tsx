import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  ArrowLeft, ChevronDown, ChevronRight, Eye, EyeOff, GripVertical,
  Loader2, Save, Plus, Trash2, Pencil, Check, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const CATEGORY_LABELS: Record<string, string> = {
  realism: "Realism Levels",
  identity: "Identity Preserve",
  face_swap: "Face/Body Swap",
  motion: "Motion Realism",
  negative: "Negatives",
  template: "Templates",
};

/** Convert a snake_case slug to Title Case for display */
function formatCategoryLabel(slug: string): string {
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface LocalBlockPref { hidden: boolean; custom_sort_order: number | null; }
interface LocalCatPref { hidden: boolean; custom_sort_order: number; }

/* ── Sortable Block Row ── */
function SortableBlockRow({ block, isHidden, toggleHidden, onDelete, onEdit }: { block: any; isHidden: boolean; toggleHidden: () => void; onDelete?: () => void; onEdit?: (label: string, value: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  const isCustom = !block.is_builtin;
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(block.label);
  const [editValue, setEditValue] = useState(block.value);

  const handleSaveEdit = () => {
    if (onEdit && editLabel.trim() && editValue.trim()) {
      onEdit(editLabel.trim(), editValue.trim());
      setEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditLabel(block.label);
    setEditValue(block.value);
    setEditing(false);
  };

  const formatValue = (val: string) => {
    return val.replace(/\.\s+/g, ".\n").replace(/,\s*(?=[A-Z])/g, ",\n");
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="rounded-lg bg-background border border-primary/30 p-3 space-y-2">
        <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="bg-surface-1 text-xs h-9" placeholder="Label" />
        <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="bg-surface-1 text-[11px] min-h-[80px] whitespace-pre-wrap" placeholder="Prompt text..." />
        <div className="flex gap-1.5 justify-end">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={handleCancelEdit}><X className="h-3 w-3" /> Cancel</Button>
          <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}><Check className="h-3 w-3" /> Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "flex items-start gap-2 px-2 py-2.5 rounded-lg transition-colors min-h-[44px]",
        isHidden ? "bg-muted/30 opacity-50" : "bg-background",
        isDragging && "shadow-md ring-2 ring-primary/30"
      )}>
      <button {...attributes} {...listeners}
        className="h-10 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0 mt-0.5">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium">{block.label}</p>
          {isCustom && <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">custom</Badge>}
        </div>
        <p className={cn(
          "text-[10px] text-muted-foreground mt-1 leading-relaxed",
          expanded ? "whitespace-pre-wrap" : "line-clamp-2"
        )}>
          {expanded ? formatValue(block.value) : block.value}
        </p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={() => { setEditing(true); setEditLabel(block.label); setEditValue(block.value); }}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-foreground/10">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {isCustom && onDelete && (
          <button onClick={onDelete} className="h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive active:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <button onClick={toggleHidden}
          className={cn(
            "h-9 w-9 flex items-center justify-center rounded-lg transition-colors",
            isHidden ? "text-muted-foreground hover:text-foreground" : "text-foreground hover:text-muted-foreground"
          )}>
          {isHidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

/* ── Block list with its own DnD context ── */
function BlockList({ blocks, category, isBlockHidden, toggleBlockHidden, moveBlock, onDeleteBlock, onEditBlock }: {
  blocks: any[]; category: string; isBlockHidden: (id: string) => boolean;
  toggleBlockHidden: (id: string) => void;
  moveBlock: (cat: string, blockId: string, fromIdx: number, toIdx: number) => void;
  onDeleteBlock?: (id: string) => void;
  onEditBlock?: (id: string, label: string, value: string) => void;
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
    <div className="mt-1.5 space-y-1 pb-1">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b: any) => b.id)} strategy={verticalListSortingStrategy}>
          {blocks.map((block: any) => (
            <SortableBlockRow key={block.id} block={block} isHidden={isBlockHidden(block.id)} toggleHidden={() => toggleBlockHidden(block.id)}
              onDelete={!block.is_builtin && onDeleteBlock ? () => onDeleteBlock(block.id) : undefined}
              onEdit={onEditBlock ? (label, value) => onEditBlock(block.id, label, value) : undefined} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}

/* ── Sortable Category Row ── */
function SortableCategoryRow({
  category, catBlocks, isCatHidden, isBlockHidden,
  toggleCatHidden, toggleBlockHidden, moveBlock, onDeleteBlock, onEditBlock,
}: {
  category: string; catBlocks: any[];
  isCatHidden: boolean; isBlockHidden: (id: string) => boolean;
  toggleCatHidden: (cat: string) => void;
  toggleBlockHidden: (id: string) => void;
  moveBlock: (cat: string, blockId: string, fromIdx: number, toIdx: number) => void;
  onDeleteBlock?: (id: string) => void;
  onEditBlock?: (id: string, label: string, value: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `cat-${category}` });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined };
  const hiddenInCat = catBlocks.filter((b: any) => isBlockHidden(b.id)).length;
  const visibleCount = catBlocks.length - hiddenInCat;
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div ref={setNodeRef} style={style}
      className={cn(
        "rounded-xl border border-border/40 bg-surface-1 overflow-hidden",
        isCatHidden && "opacity-40",
        isDragging && "shadow-lg ring-2 ring-primary/30"
      )}>
      <div className="flex items-center gap-1 px-1 min-h-[52px]">
        <button {...attributes} {...listeners}
          className="h-12 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none shrink-0">
          <GripVertical className="h-4 w-4" />
        </button>

        <Collapsible className="flex-1" open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center gap-2">
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 py-2 min-h-[44px] active:opacity-70">
              {isOpen
                ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              }
              <span className="text-sm font-medium">{formatCategoryLabel(category)}</span>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{visibleCount}/{catBlocks.length}</Badge>
            </CollapsibleTrigger>
            <button onClick={() => toggleCatHidden(category)}
              className={cn(
                "h-11 w-11 flex items-center justify-center rounded-lg transition-colors shrink-0",
                isCatHidden ? "text-muted-foreground hover:text-foreground active:bg-foreground/10" : "text-foreground hover:text-muted-foreground active:bg-foreground/10"
              )}>
              {isCatHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <CollapsibleContent>
            <BlockList blocks={catBlocks} category={category} isBlockHidden={isBlockHidden} toggleBlockHidden={toggleBlockHidden} moveBlock={moveBlock} onDeleteBlock={onDeleteBlock} onEditBlock={onEditBlock} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}

/* ── Custom Prompt Creator Form ── */
function CustomPromptForm({ userId, onCreated, onClose, allBlocks }: { userId: string; onCreated: () => void; onClose: () => void; allBlocks: any[] }) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [saving, setSaving] = useState(false);

  const baseCategories = ["realism", "identity", "face_swap", "motion", "negative", "template"];
  const existingCustomCategories = [...new Set(
    allBlocks.filter((b: any) => !b.is_builtin && !baseCategories.includes(b.category)).map((b: any) => b.category as string)
  )];
  const categories = [...baseCategories, ...existingCustomCategories.filter((c) => !baseCategories.includes(c))];

  const resolvedCategory = category === "__custom__"
    ? customCategory.trim().toLowerCase().replace(/\s+/g, "_")
    : category;

  const handleCreate = async () => {
    if (!label.trim() || !value.trim() || !resolvedCategory) return;
    setSaving(true);
    if (category === "__custom__" && customCategory.trim()) {
      CATEGORY_LABELS[resolvedCategory] = customCategory.trim();
    }
    const { error } = await supabase.from("prompt_blocks").insert({
      label: label.trim(), value: value.trim(), category: resolvedCategory,
      user_id: userId, is_builtin: false, sort_order: 999,
    });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Custom prompt created" }); onCreated(); onClose(); }
    setSaving(false);
  };

  return (
    <div className="space-y-4 p-1">
      <div className="space-y-1.5">
        <Label className="text-xs">Label</Label>
        <Input placeholder="e.g. My Cinematic Look" value={label} onChange={(e) => setLabel(e.target.value)} className="bg-surface-1 text-sm h-11" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Prompt Text</Label>
        <Textarea placeholder="The actual prompt text to insert..." value={value} onChange={(e) => setValue(e.target.value)} className="bg-surface-1 min-h-[80px] text-sm" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select value={category} onValueChange={(v) => { setCategory(v); if (v !== "__custom__") setCustomCategory(""); }}>
          <SelectTrigger className="bg-surface-1 text-xs h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => <SelectItem key={c} value={c} className="text-xs">{formatCategoryLabel(c)}</SelectItem>)}
            <SelectItem value="__custom__" className="text-xs font-medium">+ New Category…</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {category === "__custom__" && (
        <div className="space-y-1.5">
          <Label className="text-xs">Category Name</Label>
          <Input placeholder="e.g. My Templates" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className="bg-surface-1 text-sm h-11" />
        </div>
      )}
      <Button onClick={handleCreate} disabled={saving || !label.trim() || !value.trim() || !resolvedCategory} className="w-full h-11">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
      </Button>
    </div>
  );
}

/* ── Custom Prompt Creator (Drawer on mobile, Dialog on desktop) ── */
function CustomPromptCreator({ userId, onCreated, allBlocks }: { userId: string; onCreated: () => void; allBlocks: any[] }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const trigger = (
    <Button size="sm" variant="outline" className="gap-1.5 h-9 text-xs" onClick={() => setOpen(true)}>
      <Plus className="h-3.5 w-3.5" /> Add Custom
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-8">
            <DrawerHeader className="px-0">
              <DrawerTitle className="text-sm">New Custom Prompt</DrawerTitle>
            </DrawerHeader>
            <CustomPromptForm userId={userId} onCreated={onCreated} onClose={() => setOpen(false)} allBlocks={allBlocks} />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-sm">New Custom Prompt</DialogTitle></DialogHeader>
          <CustomPromptForm userId={userId} onCreated={onCreated} onClose={() => setOpen(false)} allBlocks={allBlocks} />
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Main Manager ── */
export function PromptBlockManager({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
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

  // All blocks unified — no pipeline filter
  const allCategories = [...new Set(blocks.map((b: any) => b.category))];
  const sortedCategories = [...allCategories].sort((a, b) => {
    const aOrder = localCatPrefs[a]?.custom_sort_order ?? allCategories.indexOf(a);
    const bOrder = localCatPrefs[b]?.custom_sort_order ?? allCategories.indexOf(b);
    return aOrder - bOrder;
  });

  const blocksByCategory: Record<string, any[]> = {};
  blocks.forEach((block: any) => {
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["all_prompt_blocks"] });
    queryClient.invalidateQueries({ queryKey: ["prompt_blocks"] });
  };

  const handleDeleteBlock = async (blockId: string) => {
    const { error } = await supabase.from("prompt_blocks").delete().eq("id", blockId).eq("user_id", user!.id);
    if (error) { toast({ title: "Delete failed", description: error.message, variant: "destructive" }); }
    else { invalidateAll(); toast({ title: "Prompt deleted" }); }
  };

  const handleEditBlock = async (blockId: string, label: string, value: string) => {
    const block = blocks.find((b: any) => b.id === blockId);
    if (!block || !user) return;

    if (block.is_builtin) {
      const { error } = await supabase.from("prompt_blocks").insert({
        label, value, category: block.category,
        user_id: user.id, is_builtin: false, sort_order: block.sort_order,
      });
      if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
      setLocalBlockPrefs((prev) => ({
        ...prev,
        [blockId]: { hidden: true, custom_sort_order: prev[blockId]?.custom_sort_order ?? null },
      }));
      setDirty(true);
      invalidateAll();
      toast({ title: "Custom copy created (original hidden)" });
    } else {
      const { error } = await supabase.from("prompt_blocks").update({ label, value } as any).eq("id", blockId).eq("user_id", user.id);
      if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); }
      else { invalidateAll(); toast({ title: "Prompt updated" }); }
    }
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
      invalidateAll();
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
      {/* Header */}
      <div className="flex items-center gap-3 min-h-[48px]">
        <button onClick={onBack} className="h-11 w-11 flex items-center justify-center rounded-lg active:bg-foreground/10">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm">Prompt Library</h2>
          <p className="text-[10px] text-muted-foreground">{hiddenCats} groups hidden · {hiddenBlocks} blocks hidden</p>
        </div>
        <Button onClick={handleSave} disabled={saving || !dirty} size="sm" className="h-9 gap-1.5">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </Button>
      </div>

      {/* Add Custom (no pipeline toggle anymore) */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">All prompt blocks — reorder, hide, or add custom.</p>
        {user && <CustomPromptCreator userId={user.id} onCreated={invalidateAll} allBlocks={blocks} />}
      </div>

      {/* Category list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
          <SortableContext items={sortedCategories.map((c) => `cat-${c}`)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedCategories.map((category) => (
                <SortableCategoryRow
                  key={category}
                  category={category}
                  catBlocks={blocksByCategory[category] || []}
                  isCatHidden={isCatHidden(category)}
                  isBlockHidden={isBlockHidden}
                  toggleCatHidden={toggleCatHidden}
                  toggleBlockHidden={toggleBlockHidden}
                  moveBlock={moveBlock}
                  onDeleteBlock={handleDeleteBlock}
                  onEditBlock={handleEditBlock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
