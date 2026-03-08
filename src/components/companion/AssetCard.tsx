import { Check, X, Loader2 } from "lucide-react";

interface Props {
  asset: any;
  onApprove: () => void;
  onReject: () => void;
  compact?: boolean;
}

export function AssetCard({ asset, onApprove, onReject, compact }: Props) {
  const hasImage = !!asset.image_url;
  const isProcessing = !hasImage && asset.status === "draft";

  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted aspect-square">
      {hasImage ? (
        <img src={asset.image_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-1 left-1">
        {asset.status === "approved" && (
          <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-white" />
          </div>
        )}
        {asset.status === "rejected" && (
          <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
            <X className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      {/* Tags */}
      {!compact && asset.tags && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
          <div className="flex flex-wrap gap-0.5">
            {Object.entries(asset.tags)
              .filter(([k]) => !["custom", "scenario_id", "scenario_name"].includes(k))
              .map(([k, v]) => (
                <span key={k} className="text-[9px] bg-black/40 text-white/90 px-1 py-0.5 rounded capitalize">
                  {String(v)}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Action overlay */}
      {hasImage && asset.status === "draft" && (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button
            onClick={onApprove}
            className="h-8 w-8 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center transition-colors"
          >
            <Check className="h-4 w-4 text-white" />
          </button>
          <button
            onClick={onReject}
            className="h-8 w-8 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}
