import { toast } from "@/hooks/use-toast";

/**
 * Downloads a file. For Supabase storage URLs, uses a direct link with
 * Content-Disposition header. For other URLs, fetches as blob first.
 */
export async function downloadFile(url: string, filename?: string) {
  const safeName = filename || url.split("/").pop()?.split("?")[0] || "download";

  try {
    // For Supabase public storage URLs, append ?download= to trigger
    // Content-Disposition: attachment header from the CDN
    if (url.includes("/storage/v1/object/public/")) {
      const downloadUrl = url.includes("?")
        ? `${url}&download=${encodeURIComponent(safeName)}`
        : `${url}?download=${encodeURIComponent(safeName)}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = safeName;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 200);
      return;
    }

    // Fallback: fetch as blob for cross-origin URLs
    const res = await fetch(url);
    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    }, 100);
  } catch (err: any) {
    toast({ title: "Download failed", description: err.message, variant: "destructive" });
  }
}
