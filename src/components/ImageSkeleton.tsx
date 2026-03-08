import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Image with skeleton loading state.
 * Shows a shimmer placeholder until the image loads.
 */
export function LazyImage({
  src,
  alt,
  className,
  containerClassName,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={cn("relative overflow-hidden", containerClassName)} onClick={onClick}>
      {/* Skeleton shimmer */}
      {!loaded && !error && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      {error ? (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">Failed</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt || ""}
          className={cn(
            "transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className,
          )}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
