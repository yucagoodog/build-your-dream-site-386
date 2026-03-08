import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ai-studio-prompt-history";
const MAX_ITEMS = 20;

export interface PromptHistoryEntry {
  prompt: string;
  negativePrompt: string;
  mode: string;
  timestamp: number;
}

export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const savePrompt = useCallback((entry: Omit<PromptHistoryEntry, "timestamp">) => {
    if (!entry.prompt.trim()) return;
    setHistory((prev) => {
      // Deduplicate by prompt text
      const filtered = prev.filter((h) => h.prompt !== entry.prompt);
      const next = [{ ...entry, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  return { history, savePrompt, clearHistory };
}
