"use client"

import { useEffect, useState } from "react"
import { ArrowUp } from "lucide-react"

/**
 * Floating "lên đầu trang" button for the organizer create-event page.
 *
 * The organizer shell scrolls inside <main> (`.content` has overflow-y:auto),
 * not the window — so both the scroll listener and the scroll-to-top act on
 * that element, not `window`. The button only shows once the content is
 * scrolled past a threshold.
 */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const scroller = document.querySelector("main")
    if (!scroller) return
    const onScroll = () => setVisible(scroller.scrollTop > 300)
    scroller.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Lên đầu trang"
      title="Lên đầu trang"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 50,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 44,
        height: 44,
        borderRadius: 9999,
        border: "none",
        background: "#0891b2",
        color: "#fff",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.25)",
        cursor: "pointer",
      }}
    >
      <ArrowUp size={22} aria-hidden="true" />
    </button>
  )
}
