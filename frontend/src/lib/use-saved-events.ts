"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Client-side "saved events" store backed by localStorage.
 *
 * No backend endpoint exists for bookmarks yet, so saved event IDs live in the
 * browser. Kept in a hook so any component (event card, detail page, the saved
 * list) shares one source of truth and stays in sync — across tabs (native
 * `storage` event) and within the same tab (custom event, which `storage`
 * does not fire for).
 */
const STORAGE_KEY = "eventbox:saved-events";
const CHANGE_EVENT = "eventbox:saved-events-change";

function readSaved(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeSaved(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable (private mode / quota) — ignore */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useSavedEvents() {
  // Start empty so server and first client render match; hydrate in effect.
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setSavedIds(readSaved());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isSaved = useCallback((id: string) => savedIds.includes(id), [savedIds]);

  const toggle = useCallback((id: string) => {
    const current = readSaved();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [id, ...current];
    writeSaved(next);
    setSavedIds(next);
  }, []);

  return { savedIds, isSaved, toggle };
}
