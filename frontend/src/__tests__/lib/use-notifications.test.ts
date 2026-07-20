import { renderHook, act } from "@testing-library/react";
import { useNotifications } from "@/lib/use-notifications";
import { NOTIFICATIONS_SEED } from "@/components/notifications/notifications-data";

describe("useNotifications Hook", () => {
  const STORAGE_KEY = "eventbox:notifications-state";
  const CHANGE_EVENT = "eventbox:notifications-change";

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Initial state", () => {
    it("should initialize with all notifications unread", () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toHaveLength(NOTIFICATIONS_SEED.length);
      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length);
    });

    it("should initialize with empty readIds and deletedIds", () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications.every((n) => !n.isRead)).toBe(true);
    });

    it("should have utility functions available", () => {
      const { result } = renderHook(() => useNotifications());

      expect(typeof result.current.markRead).toBe("function");
      expect(typeof result.current.markAllRead).toBe("function");
      expect(typeof result.current.remove).toBe("function");
    });
  });

  describe("Reading from localStorage", () => {
    it("should load read state from localStorage", () => {
      const state = {
        readIds: ["ntf-1", "ntf-2"],
        deletedIds: [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications.find((n) => n.id === "ntf-1")?.isRead).toBe(true);
      expect(result.current.notifications.find((n) => n.id === "ntf-2")?.isRead).toBe(true);
    });

    it("should load deleted state from localStorage", () => {
      const state = {
        readIds: [],
        deletedIds: ["ntf-1"],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications.find((n) => n.id === "ntf-1")).toBeUndefined();
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "not-valid-json");

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toHaveLength(NOTIFICATIONS_SEED.length);
      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length);
    });

    it("should handle missing read/deleted fields", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: "data" }));

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications).toHaveLength(NOTIFICATIONS_SEED.length);
      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length);
    });

    it("should filter out non-string values from arrays", () => {
      const state = {
        readIds: ["ntf-1", 123, null, "ntf-2"],
        deletedIds: ["ntf-3", undefined, "ntf-4"],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      const { result } = renderHook(() => useNotifications());

      expect(result.current.notifications.find((n) => n.id === "ntf-1")?.isRead).toBe(true);
      expect(result.current.notifications.find((n) => n.id === "ntf-2")?.isRead).toBe(true);
      expect(result.current.notifications.find((n) => n.id === "ntf-3")).toBeUndefined();
    });
  });

  describe("markRead function", () => {
    it("should mark a notification as read", () => {
      const { result } = renderHook(() => useNotifications());

      const notificationId = NOTIFICATIONS_SEED[0].id;

      act(() => {
        result.current.markRead(notificationId);
      });

      expect(result.current.notifications.find((n) => n.id === notificationId)?.isRead).toBe(true);
    });

    it("should decrease unreadCount when marking as read", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.unreadCount;

      act(() => {
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      expect(result.current.unreadCount).toBe(initialCount - 1);
    });

    it("should persist to localStorage", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      expect(stored.readIds).toContain(NOTIFICATIONS_SEED[0].id);
    });

    it("should not double-add already read notification", () => {
      const notifId = NOTIFICATIONS_SEED[0].id;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ readIds: [notifId], deletedIds: [] })
      );

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markRead(notifId);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const count = stored.readIds.filter((id: string) => id === notifId).length;
      expect(count).toBe(1);
    });

    it("should handle marking multiple notifications", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
        result.current.markRead(NOTIFICATIONS_SEED[1].id);
        result.current.markRead(NOTIFICATIONS_SEED[2].id);
      });

      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length - 3);
    });
  });

  describe("markAllRead function", () => {
    it("should mark all notifications as read", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAllRead();
      });

      expect(result.current.unreadCount).toBe(0);
      expect(result.current.notifications.every((n) => n.isRead)).toBe(true);
    });

    it("should persist all read ids to localStorage", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAllRead();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      expect(stored.readIds).toHaveLength(NOTIFICATIONS_SEED.length);
      expect(stored.readIds).toContain(NOTIFICATIONS_SEED[0].id);
    });

    it("should work even if some are already read", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [NOTIFICATIONS_SEED[0].id],
          deletedIds: [],
        })
      );

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAllRead();
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it("should preserve deleted notifications when marking all read", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [],
          deletedIds: [NOTIFICATIONS_SEED[0].id],
        })
      );

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markAllRead();
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      expect(stored.deletedIds).toContain(NOTIFICATIONS_SEED[0].id);
      expect(result.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[0].id)).toBeUndefined();
    });
  });

  describe("remove function", () => {
    it("should remove a notification from the list", () => {
      const { result } = renderHook(() => useNotifications());

      const notificationId = NOTIFICATIONS_SEED[0].id;

      act(() => {
        result.current.remove(notificationId);
      });

      expect(result.current.notifications.find((n) => n.id === notificationId)).toBeUndefined();
    });

    it("should persist to localStorage", () => {
      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.remove(NOTIFICATIONS_SEED[0].id);
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      expect(stored.deletedIds).toContain(NOTIFICATIONS_SEED[0].id);
    });

    it("should not remove other notifications", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.notifications.length;

      act(() => {
        result.current.remove(NOTIFICATIONS_SEED[0].id);
      });

      expect(result.current.notifications).toHaveLength(initialCount - 1);
    });

    it("should handle removing multiple notifications", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.notifications.length;

      act(() => {
        result.current.remove(NOTIFICATIONS_SEED[0].id);
        result.current.remove(NOTIFICATIONS_SEED[1].id);
      });

      expect(result.current.notifications).toHaveLength(initialCount - 2);
    });

    it("should preserve read state when removing", () => {
      const { result } = renderHook(() => useNotifications());

      const id1 = NOTIFICATIONS_SEED[0].id;
      const id2 = NOTIFICATIONS_SEED[1].id;

      act(() => {
        result.current.markRead(id2);
        result.current.remove(id1);
      });

      expect(result.current.notifications.find((n) => n.id === id2)?.isRead).toBe(true);
    });
  });

  describe("Unread count tracking", () => {
    it("should calculate unreadCount correctly", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [NOTIFICATIONS_SEED[0].id, NOTIFICATIONS_SEED[1].id],
          deletedIds: [],
        })
      );

      const { result } = renderHook(() => useNotifications());

      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length - 2);
    });

    it("should not count deleted notifications in unreadCount", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [],
          deletedIds: [NOTIFICATIONS_SEED[0].id],
        })
      );

      const { result } = renderHook(() => useNotifications());

      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length - 1);
    });

    it("should decrement unreadCount when read", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.unreadCount;

      act(() => {
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      expect(result.current.unreadCount).toBe(initialCount - 1);
    });

    it("should not change unreadCount when removing unread notification", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.unreadCount;

      act(() => {
        result.current.remove(NOTIFICATIONS_SEED[0].id);
      });

      // Removing unread should decrease unread count
      expect(result.current.unreadCount).toBe(initialCount - 1);
    });
  });

  describe("Notification item structure", () => {
    it("should return notification items with isRead field", () => {
      const { result } = renderHook(() => useNotifications());

      result.current.notifications.forEach((notif) => {
        expect(notif).toHaveProperty("isRead");
        expect(typeof notif.isRead).toBe("boolean");
      });
    });

    it("should preserve original notification properties", () => {
      const { result } = renderHook(() => useNotifications());

      const notif = result.current.notifications[0];
      const original = NOTIFICATIONS_SEED[0];

      expect(notif.id).toBe(original.id);
      expect(notif.type).toBe(original.type);
      expect(notif.title).toBe(original.title);
      expect(notif.message).toBe(original.message);
    });

    it("should include href when present", () => {
      const { result } = renderHook(() => useNotifications());

      const notifWithHref = result.current.notifications.find((n) => n.href);
      if (notifWithHref) {
        expect(typeof notifWithHref.href).toBe("string");
      }
    });
  });

  describe("localStorage persistence", () => {
    it("should persist state across unmount and remount", () => {
      const { result: result1, unmount } = renderHook(() => useNotifications());

      act(() => {
        result1.current.markRead(NOTIFICATIONS_SEED[0].id);
        result1.current.remove(NOTIFICATIONS_SEED[1].id);
      });

      unmount();

      const { result: result2 } = renderHook(() => useNotifications());

      expect(result2.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[0].id)?.isRead).toBe(true);
      expect(result2.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[1].id)).toBeUndefined();
    });

    it("should handle localStorage write errors silently", () => {
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const { result } = renderHook(() => useNotifications());

      act(() => {
        // Should not throw
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      expect(result.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[0].id)?.isRead).toBe(true);

      setItemSpy.mockRestore();
    });
  });

  describe("Cross-tab synchronization", () => {
    it("should listen to storage events from other tabs", () => {
      const { result } = renderHook(() => useNotifications());

      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length);

      const newState = {
        readIds: [NOTIFICATIONS_SEED[0].id],
        deletedIds: [],
      };

      // Set localStorage to new value first
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));

      act(() => {
        const event = new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify(newState),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.unreadCount).toBe(NOTIFICATIONS_SEED.length - 1);
    });

    it("should ignore storage changes for other keys", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.unreadCount;

      act(() => {
        const event = new StorageEvent("storage", {
          key: "other-key",
          newValue: JSON.stringify({ readIds: ["all"] }),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.unreadCount).toBe(initialCount);
    });
  });

  describe("Custom event synchronization", () => {
    it("should listen to custom CHANGE_EVENT", () => {
      const { result } = renderHook(() => useNotifications());

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [NOTIFICATIONS_SEED[0].id],
          deletedIds: [],
        })
      );

      act(() => {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
      });

      expect(result.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[0].id)?.isRead).toBe(true);
    });

    it("should dispatch custom event on state change", () => {
      const spy = jest.fn();
      window.addEventListener(CHANGE_EVENT, spy);

      const { result } = renderHook(() => useNotifications());

      act(() => {
        result.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      expect(spy).toHaveBeenCalled();

      window.removeEventListener(CHANGE_EVENT, spy);
    });
  });

  describe("Event listener cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useNotifications());

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        CHANGE_EVENT,
        expect.any(Function)
      );
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "storage",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle marking as read then removing", () => {
      const { result } = renderHook(() => useNotifications());

      const id = NOTIFICATIONS_SEED[0].id;

      act(() => {
        result.current.markRead(id);
      });

      expect(result.current.notifications.find((n) => n.id === id)?.isRead).toBe(true);

      act(() => {
        result.current.remove(id);
      });

      expect(result.current.notifications.find((n) => n.id === id)).toBeUndefined();
    });

    it("should handle removing unread notification", () => {
      const { result } = renderHook(() => useNotifications());

      const initialCount = result.current.unreadCount;

      act(() => {
        result.current.remove(NOTIFICATIONS_SEED[0].id);
      });

      expect(result.current.unreadCount).toBe(initialCount - 1);
    });

    it("should handle markAllRead on partially deleted list", () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          readIds: [],
          deletedIds: [NOTIFICATIONS_SEED[0].id, NOTIFICATIONS_SEED[1].id],
        })
      );

      const { result } = renderHook(() => useNotifications());

      const beforeCount = result.current.notifications.length;

      act(() => {
        result.current.markAllRead();
      });

      expect(result.current.unreadCount).toBe(0);
      // Deleted ones should still be deleted
      expect(result.current.notifications).toHaveLength(beforeCount);
    });

    it("should sync across multiple hooks", () => {
      const { result: result1 } = renderHook(() => useNotifications());
      const { result: result2 } = renderHook(() => useNotifications());

      act(() => {
        result1.current.markRead(NOTIFICATIONS_SEED[0].id);
      });

      act(() => {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
      });

      expect(result2.current.notifications.find((n) => n.id === NOTIFICATIONS_SEED[0].id)?.isRead).toBe(true);
    });
  });
});
