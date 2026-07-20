import { renderHook, act } from "@testing-library/react";
import { useSavedEvents } from "@/lib/use-saved-events";

describe("useSavedEvents Hook", () => {
  const STORAGE_KEY = "eventbox:saved-events";
  const CHANGE_EVENT = "eventbox:saved-events-change";

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("Initial state", () => {
    it("should initialize with empty saved events", () => {
      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual([]);
      expect(result.current.isSaved("test-id")).toBe(false);
    });

    it("should have toggle function available", () => {
      const { result } = renderHook(() => useSavedEvents());

      expect(typeof result.current.toggle).toBe("function");
      expect(typeof result.current.isSaved).toBe("function");
    });
  });

  describe("Reading from localStorage", () => {
    it("should load saved events from localStorage on mount", () => {
      const saved = ["event-1", "event-2", "event-3"];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual(saved);
    });

    it("should handle corrupted localStorage data gracefully", () => {
      localStorage.setItem(STORAGE_KEY, "not-valid-json");

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual([]);
    });

    it("should handle non-array stored data gracefully", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ not: "array" }));

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual([]);
    });

    it("should filter out non-string values from stored array", () => {
      const mixed = ["event-1", 123, null, "event-2", undefined];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mixed));

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual(["event-1", "event-2"]);
    });

    it("should handle empty localStorage gracefully", () => {
      localStorage.removeItem(STORAGE_KEY);

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual([]);
    });
  });

  describe("isSaved callback", () => {
    it("should check if event is in saved list", () => {
      const saved = ["event-1", "event-2"];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.isSaved("event-1")).toBe(true);
      expect(result.current.isSaved("event-2")).toBe(true);
      expect(result.current.isSaved("event-3")).toBe(false);
    });

    it("should return false for empty savedIds", () => {
      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.isSaved("any-id")).toBe(false);
    });

    it("should be recreated when savedIds change", () => {
      const { result } = renderHook(() => useSavedEvents());

      const isSaved1 = result.current.isSaved;

      act(() => {
        result.current.toggle("event-1");
      });

      const isSaved2 = result.current.isSaved;

      expect(isSaved1).not.toBe(isSaved2); // Recreated due to savedIds dependency change
    });
  });

  describe("toggle function - add event", () => {
    it("should add unsaved event to the list", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds).toContain("event-1");
      expect(result.current.isSaved("event-1")).toBe(true);
    });

    it("should persist to localStorage on add", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored).toContain("event-1");
    });

    it("should add new event at the beginning", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(["event-2", "event-3"]));
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds[0]).toBe("event-1");
      expect(result.current.savedIds).toEqual(["event-1", "event-2", "event-3"]);
    });

    it("should handle adding multiple events in sequence", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
        result.current.toggle("event-2");
        result.current.toggle("event-3");
      });

      expect(result.current.savedIds).toHaveLength(3);
      expect(result.current.savedIds).toContain("event-1");
      expect(result.current.savedIds).toContain("event-2");
      expect(result.current.savedIds).toContain("event-3");
    });
  });

  describe("toggle function - remove event", () => {
    it("should remove saved event from the list", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(["event-1", "event-2"]));
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds).not.toContain("event-1");
      expect(result.current.isSaved("event-1")).toBe(false);
      expect(result.current.savedIds).toContain("event-2");
    });

    it("should persist to localStorage on remove", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(["event-1", "event-2"]));
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(stored).not.toContain("event-1");
      expect(stored).toContain("event-2");
    });

    it("should handle removing non-existent event gracefully", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("nonexistent");
      });

      // Should now be "saved"
      expect(result.current.savedIds).toContain("nonexistent");
    });

    it("should remove all events one by one", () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(["e1", "e2", "e3"]));
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("e1");
        result.current.toggle("e2");
        result.current.toggle("e3");
      });

      expect(result.current.savedIds).toEqual([]);
    });
  });

  describe("localStorage persistence", () => {
    it("should persist changes to localStorage", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).toBe(JSON.stringify(["event-1"]));
    });

    it("should survive unmount and remount", () => {
      const { result: result1, unmount } = renderHook(() => useSavedEvents());

      act(() => {
        result1.current.toggle("event-1");
        result1.current.toggle("event-2");
      });

      unmount();

      const { result: result2 } = renderHook(() => useSavedEvents());

      expect(result2.current.savedIds).toEqual(["event-2", "event-1"]);
    });

    it("should handle localStorage write errors silently", () => {
      const setItemSpy = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("QuotaExceededError");
      });

      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        // Should not throw
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds).toContain("event-1");

      setItemSpy.mockRestore();
    });
  });

  describe("Cross-tab synchronization", () => {
    it("should listen to storage events from other tabs", () => {
      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.savedIds).toEqual([]);

      // First, set localStorage to the new value
      const newValue = ["event-1", "event-2"];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newValue));

      // Then simulate storage change from another tab
      act(() => {
        const event = new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify(newValue),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.savedIds).toEqual(newValue);
    });

    it("should ignore storage changes for other keys", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        const event = new StorageEvent("storage", {
          key: "other-key",
          newValue: JSON.stringify(["event-1"]),
        });
        window.dispatchEvent(event);
      });

      expect(result.current.savedIds).toEqual([]);
    });
  });

  describe("Custom event synchronization", () => {
    it("should listen to custom CHANGE_EVENT", () => {
      const { result } = renderHook(() => useSavedEvents());

      localStorage.setItem(STORAGE_KEY, JSON.stringify(["event-1"]));

      act(() => {
        window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
      });

      expect(result.current.savedIds).toEqual(["event-1"]);
    });

    it("should dispatch custom event on toggle", () => {
      const spy = jest.fn();
      window.addEventListener(CHANGE_EVENT, spy);

      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      expect(spy).toHaveBeenCalled();

      window.removeEventListener(CHANGE_EVENT, spy);
    });
  });

  describe("Event listener cleanup", () => {
    it("should remove event listeners on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useSavedEvents());

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

    it("should not leak listeners across multiple hook instances", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      const { unmount: unmount1 } = renderHook(() => useSavedEvents());
      const { unmount: unmount2 } = renderHook(() => useSavedEvents());

      // Each hook should add 2 listeners (CHANGE_EVENT + storage)
      expect(addEventListenerSpy).toHaveBeenCalledTimes(4);

      unmount1();
      unmount2();

      addEventListenerSpy.mockRestore();
    });
  });

  describe("State consistency", () => {
    it("should keep savedIds consistent with localStorage", () => {
      const { result, rerender } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(result.current.savedIds).toEqual(stored);

      act(() => {
        result.current.toggle("event-2");
      });

      const stored2 = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      expect(result.current.savedIds).toEqual(stored2);
    });

    it("should update isSaved predicate after toggle", () => {
      const { result } = renderHook(() => useSavedEvents());

      expect(result.current.isSaved("event-1")).toBe(false);

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.isSaved("event-1")).toBe(true);

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.isSaved("event-1")).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle duplicate toggles correctly", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds).toContain("event-1");

      act(() => {
        result.current.toggle("event-1");
      });

      expect(result.current.savedIds).not.toContain("event-1");
    });

    it("should handle empty string event id", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("");
      });

      expect(result.current.savedIds).toContain("");
      expect(result.current.isSaved("")).toBe(true);
    });

    it("should handle very long event ids", () => {
      const { result } = renderHook(() => useSavedEvents());
      const longId = "e".repeat(1000);

      act(() => {
        result.current.toggle(longId);
      });

      expect(result.current.isSaved(longId)).toBe(true);
    });

    it("should maintain order when toggling", () => {
      const { result } = renderHook(() => useSavedEvents());

      act(() => {
        result.current.toggle("e1");
        result.current.toggle("e2");
        result.current.toggle("e3");
      });

      expect(result.current.savedIds).toEqual(["e3", "e2", "e1"]);

      act(() => {
        result.current.toggle("e2");
      });

      expect(result.current.savedIds).toEqual(["e3", "e1"]);

      act(() => {
        result.current.toggle("e2");
      });

      expect(result.current.savedIds).toEqual(["e2", "e3", "e1"]);
    });
  });
});
