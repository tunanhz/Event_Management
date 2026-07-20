"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { AppNotification } from "@/components/notifications/notifications-data";

const LIST_STORAGE_KEY_PREFIX = "eventbox:notifications-list:";
const STATE_STORAGE_KEY_PREFIX = "eventbox:notifications-state:";
const CHANGE_EVENT = "eventbox:notifications-change";

interface StoredState {
  readIds: string[];
  deletedIds: string[];
}

function getNotificationsList(userId: string): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIST_STORAGE_KEY_PREFIX + userId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotificationsList(userId: string, list: AppNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LIST_STORAGE_KEY_PREFIX + userId, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {}
}

function readState(userId: string): StoredState {
  if (typeof window === "undefined") return { readIds: [], deletedIds: [] };
  try {
    const raw = window.localStorage.getItem(STATE_STORAGE_KEY_PREFIX + userId);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      readIds: Array.isArray(parsed?.readIds) ? parsed.readIds : [],
      deletedIds: Array.isArray(parsed?.deletedIds) ? parsed.deletedIds : [],
    };
  } catch {
    return { readIds: [], deletedIds: [] };
  }
}

function writeState(userId: string, state: StoredState) {
  try {
    window.localStorage.setItem(STATE_STORAGE_KEY_PREFIX + userId, JSON.stringify(state));
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export interface NotificationItem extends AppNotification {
  isRead: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?._id || "guest";
  const [list, setList] = useState<AppNotification[]>([]);
  const [state, setState] = useState<StoredState>({ readIds: [], deletedIds: [] });

  const sync = useCallback(() => {
    setList(getNotificationsList(userId));
    setState(readState(userId));
  }, [userId]);

  // Initial welcome notification when first logging in / visiting
  useEffect(() => {
    // We intentionally synchronize local storage state on mount.
    if (userId === "guest") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      sync();
      return;
    }
    const currentList = getNotificationsList(userId);
    const hasWelcome = currentList.some((n) => n.id.startsWith("welcome"));
    if (!hasWelcome) {
      const welcomeNotif: AppNotification = {
        id: "welcome-" + Date.now(),
        type: "system",
        title: "Chào mừng bạn đến với EventBox",
        message: "Chào mừng bạn đến với EventBox! Khám phá các sự kiện nổi bật, lưu sự kiện yêu thích và đặt vé chỉ trong vài bước. Chúc bạn có trải nghiệm tuyệt vời!",
        createdAt: new Date().toISOString(),
        href: "/su-kien",
      };
      saveNotificationsList(userId, [welcomeNotif, ...currentList]);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sync();
  }, [userId, sync]);

  useEffect(() => {
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const notifications: NotificationItem[] = list
    .filter((n) => !state.deletedIds.includes(n.id))
    .map((n) => ({ ...n, isRead: state.readIds.includes(n.id) }));

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markRead = useCallback((id: string) => {
    const current = readState(userId);
    if (current.readIds.includes(id)) return;
    const next = { ...current, readIds: [...current.readIds, id] };
    writeState(userId, next);
    setState(next);
  }, [userId]);

  const markAllRead = useCallback(() => {
    const current = readState(userId);
    const next = { ...current, readIds: list.map((n) => n.id) };
    writeState(userId, next);
    setState(next);
  }, [userId, list]);

  const remove = useCallback((id: string) => {
    const current = readState(userId);
    const next = { ...current, deletedIds: [...current.deletedIds, id] };
    writeState(userId, next);
    setState(next);
  }, [userId]);

  return { notifications, unreadCount, markRead, markAllRead, remove };
}
