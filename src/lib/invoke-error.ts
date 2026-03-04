/** Extract the real error message from supabase.functions.invoke responses.
 *  When edge functions return non-2xx, supabase-js wraps the response —
 *  the actual JSON body is in error.context, not in data. */
export async function extractInvokeError(error: any, data: any): Promise<string | null> {
  if (data?.error) return data.error;
  if (!error) return null;
  try {
    if (error.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      if (body?.error) return body.error;
    }
  } catch {}
  return error.message || "Unknown error";
}
