"use client"

import { Sun, Moon } from "lucide-react"

/**
 * Light/dark theme toggle.
 *
 * Flips the `dark` class on <html> and persists the choice to localStorage.
 * The icon is driven purely by the `dark:` Tailwind variant (CSS), so it stays
 * correct after the no-FOUC script runs without any React state — avoiding both
 * hydration mismatches and a setState-in-effect.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const toggle = () => {
    const root = document.documentElement
    const isDark = root.classList.toggle("dark")
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light")
    } catch {
      /* storage unavailable (private mode) — toggle still applies for the session */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Chuyển chế độ sáng / tối"
      title="Chế độ sáng / tối"
      className={className}
    >
      {/* Shown in light mode (tap → dark) */}
      <Moon className="h-5 w-5 dark:hidden" />
      {/* Shown in dark mode (tap → light) */}
      <Sun className="hidden h-5 w-5 dark:block" />
    </button>
  )
}
