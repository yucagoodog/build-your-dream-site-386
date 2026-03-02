import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * Downloads a media file from a URL and saves it to the user's Seed Image Drive.
 */
export async function saveToDrive(url: string, userId: string, filename?: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch file");
    const blob = await res.blob();
    const ext = filename?.split(".").pop() || (blob.type.includes("video") ? "mp4" : "png");
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const path = `drive/${userId}/${safeName}`;
    const { error } = await supabase.storage.from("seed-images").upload(path, blob);
    if (error) throw error;
    toast({ title: "Saved to My Images" });
    return true;
  } catch (err: any) {
    toast({ title: "Save failed", description: err.message, variant: "destructive" });
    return false;
  }
}
