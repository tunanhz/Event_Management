"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface ShellContextValue {
  title: string
  setTitle: (title: string) => void
}

const OrganizerShellContext = createContext<ShellContextValue | null>(null)

/** Holds the current page title so the shared top bar can render it per route. */
export function OrganizerShellProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("")
  return (
    <OrganizerShellContext.Provider value={{ title, setTitle }}>
      {children}
    </OrganizerShellContext.Provider>
  )
}

export function useOrganizerShell() {
  const ctx = useContext(OrganizerShellContext)
  if (!ctx) throw new Error("useOrganizerShell must be used within OrganizerShellProvider")
  return ctx
}

/** Set the top-bar title for the current page (cleared on unmount). */
export function useOrganizerTitle(title: string) {
  const { setTitle } = useOrganizerShell()
  useEffect(() => {
    setTitle(title)
    return () => setTitle("")
  }, [title, setTitle])
}
