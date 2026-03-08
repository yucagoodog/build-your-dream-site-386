import { LibraryItem } from "@/pages/LibraryPage";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { LazyImage } from "@/components/ImageSkeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Download, Copy, Trash2, RotateCcw, ZoomIn, FolderOpen,
  Star, ImageIcon, Clapperboard, Clock, DollarSign, Loader2,
  AlertCircle, Hash, Maximize2, Wand2, Layers,
} from "lucide-react";

interface Props {
  item: LibraryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  projectName?: string | null;
  onReEdit: () => void;
  onCopyParams: () => void;
  onUpscale: () => void;
  isUpscaling: boolean;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onDownload: () => void;
  onSaveToDrive: () => void;
}

export function LibraryItemDetail({
  item, open, onOpenChange, userId, projectName,
  onReEdit, onCopyParams, onUpscale, isUpscaling,
  onToggleFavorite, onDelete, onDownload, onSaveToDrive,
}: Props) {
  const isMobile = useIsMobile();

  if (!item) return null;

  const isVideo = item.type === "video";
  const outputUrl = isVideo ? item.video_url : item.output_image_url;
  const params = item.parameters || {};

  const content = (
    <div className="flex flex-col gap-4">
      {/* Preview */}
      <div className="relative rounded-lg overflow-hidden bg-muted mx-auto w-full max-w-md aspect-square">
        {item.status === "completed" && outputUrl ? (
          isVideo ? (
            <video src={outputUrl} className="w-full h-full object-contain bg-black" controls playsInline preload="metadata" />
          ) : (
            <LazyImage src={outputUrl} alt="Output" className="w-full h-full object-contain" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.status === "processing" ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : item.status === "failed" ? (
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-xs text-destructive">{item.error_message || "Generation failed"}</p>
              </div>
            ) : (
              isVideo ? <Clapperboard className="h-8 w-8 text-muted-foreground/30" /> : <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            )}
          </div>
        )}
      </div>

      {/* Status + Type + Favorite */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="outline" className="text-[10px]">
          {isVideo ? <Clapperboard className="h-2.5 w-2.5 mr-1" /> : <ImageIcon className="h-2.5 w-2.5 mr-1" />}
          {item.type}
        </Badge>
        <Badge variant="outline" className={cn("text-[10px]",
          item.status === "completed" ? "border-[hsl(var(--status-completed))]/30 text-[hsl(var(--status-completed))] bg-[hsl(var(--status-completed))]/10" :
          item.status === "failed" ? "border-destructive/30 text-destructive bg-destructive/10" :
          "border-border"
        )}>
          {item.status}
        </Badge>
        {item.is_final && (
          <Badge variant="outline" className="text-[10px] border-[hsl(var(--status-warning))]/30 text-[hsl(var(--status-warning))] bg-[hsl(var(--status-warning))]/10">Approved</Badge>
        )}
        <button onClick={onToggleFavorite}
          className={cn("ml-auto h-8 w-8 rounded-full flex items-center justify-center transition-colors",
            item.is_favorite ? "bg-[hsl(var(--status-warning))]/20 text-[hsl(var(--status-warning))]" : "text-muted-foreground hover:text-foreground"
          )}>
          <Star className={cn("h-4 w-4", item.is_favorite && "fill-current")} />
        </button>
      </div>

      {/* Prompt */}
      {item.prompt && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Prompt</p>
          <p className="text-xs text-foreground whitespace-pre-wrap break-words bg-muted/50 rounded-lg p-3">{item.prompt}</p>
        </div>
      )}

      {item.negative_prompt && (
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Negative Prompt</p>
          <p className="text-xs text-foreground whitespace-pre-wrap break-words bg-muted/50 rounded-lg p-3">{item.negative_prompt}</p>
        </div>
      )}

      {/* Metadata grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetaCell icon={Layers} label="Model" value={item.model} />
        <MetaCell icon={Clock} label="Created" value={format(new Date(item.created_at), "MMM d, yyyy HH:mm")} />
        {item.cost != null && <MetaCell icon={DollarSign} label="Cost" value={`$${Number(item.cost).toFixed(4)}`} />}
        {!isVideo && item.output_size && <MetaCell icon={Maximize2} label="Size" value={item.output_size.replace("*", "×")} />}
        {!isVideo && item.seed != null && <MetaCell icon={Hash} label="Seed" value={String(item.seed)} />}
        {!isVideo && item.enable_prompt_expansion != null && <MetaCell icon={Wand2} label="Expansion" value={item.enable_prompt_expansion ? "On" : "Off"} />}
        {isVideo && params.resolution && <MetaCell icon={Maximize2} label="Resolution" value={params.resolution} />}
        {isVideo && params.duration && <MetaCell icon={Clock} label="Duration" value={`${params.duration}s`} />}
        {projectName && <MetaCell icon={FolderOpen} label="Project" value={projectName} />}
      </div>

      {/* Source images */}
      {item.source_image_urls && item.source_image_urls.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Source Images</p>
          <div className="flex gap-2 overflow-x-auto">
            {item.source_image_urls.map((url, i) => (
              <div key={i} className="h-16 w-16 rounded-md overflow-hidden bg-muted shrink-0">
                <LazyImage src={url} alt={`Source ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {item.error_message && item.status === "failed" && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-xs text-destructive">{item.error_message}</p>
        </div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5" onClick={onReEdit}>
          <RotateCcw className="h-3.5 w-3.5" /> Re-edit
        </Button>
        <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5" onClick={onCopyParams}>
          <Copy className="h-3.5 w-3.5" /> Copy Params
        </Button>
        {item.status === "completed" && outputUrl && (
          <>
            <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5" onClick={onDownload}>
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
            <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5" onClick={onSaveToDrive}>
              <FolderOpen className="h-3.5 w-3.5" /> Save to Drive
            </Button>
          </>
        )}
        {!isVideo && item.status === "completed" && item.output_image_url && item.model !== "google/nano-banana-2/edit" && (
          <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5" onClick={onUpscale} disabled={isUpscaling}>
            {isUpscaling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ZoomIn className="h-3.5 w-3.5" />}
            {isUpscaling ? "Upscaling…" : "Upscale"}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-10 text-xs gap-1.5 text-destructive hover:text-destructive border-destructive/30" onClick={() => { onDelete(); onOpenChange(false); }}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle className="text-sm">Details</DrawerTitle>
          </DrawerHeader>
          <ScrollArea className="px-4 pb-6 overflow-y-auto max-h-[calc(90vh-60px)]">
            {content}
          </ScrollArea>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-sm">Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-6 pb-6 flex-1 overflow-y-auto">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MetaCell({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
