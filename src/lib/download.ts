import { toast } from "@/hooks/use-toast";

/**
 * Downloads a file by fetching it as a blob first.
 * This works on mobile browsers where <a download> fails for cross-origin URLs.
 */
export async function downloadFile(url: string, filename?: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || url.split("/").pop() || "download";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // Small delay before cleanup for iOS Safari
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (err: any) {
    toast({ title: "Download failed", description: err.message, variant: "destructive" });
  }
}
