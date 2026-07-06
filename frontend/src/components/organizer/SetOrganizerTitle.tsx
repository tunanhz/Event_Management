"use client"

import { useOrganizerTitle } from "./OrganizerShellContext"

/** Sets the shared top-bar title from a server component (renders nothing). */
export function SetOrganizerTitle({ title }: { title: string }) {
  useOrganizerTitle(title)
  return null
}
