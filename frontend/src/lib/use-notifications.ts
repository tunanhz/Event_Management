"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NOTIFICATIONS_SEED,
  type AppNotification,
} from "@/components/notifications/notifications-data";

/**
 * Client-side notification state (read + deleted ids) backed by localStorage.
 * The feed itself is a mock seed; this hook only tracks which entries the user
 * has read or removed, synced across tabs (`storage`) and within one tab
 * (custom event) — same pattern as `use-saved-events.ts`.
 */
const STORAGE_KEY = "eventbox:notifications-state";
const CHANGE_EVENT = "eventbox:notifications-change";

interface StoredState {
  readIds: string[];
  deletedIds: string[];
}

function readState(): StoredState {
  if (typeof window === "undefined") return { readIds: [], deletedIds: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
      deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    return { readIds: [], deletedIds: [] };
  }
}

function writeState(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode / quota) — ignore */
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export interface NotificationItem extends AppNotification {
  isRead: boolean;
}

export function useNotifications() {
  // Start with everything unread so server and first client render match.
  const [state, setState] = useState<StoredState>({ readIds: [], deletedIds: [] });

  useEffect(() => {
    const sync = () => setState(readState());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const notifications: NotificationItem[] = NOTIFICATIONS_SEED.filter(
    (n) => !state.deletedIds.includes(n.id)
  ).map((n) => ({ ...n, isRead: state.readIds.includes(n.id) }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useCallback((id: string) => {
    const current = readState();
    if (current.readIds.includes(id)) return;
    const next = { ...current, readIds: [...current.readIds, id] };
    writeState(next);
    setState(next);
  }, []);

  const markAllRead = useCallback(() => {
    const current = readState();
    const next = { ...current, readIds: NOTIFICATIONS_SEED.map((n) => n.id) };
    writeState(next);
    setState(next);
  }, []);

  const remove = useCallback((id: string) => {
    const current = readState();
    const next = { ...current, deletedIds: [...current.deletedIds, id] };
    writeState(next);
    setState(next);
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, remove };
}
