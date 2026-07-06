"use client"

import { useMemo, useState } from "react"
import { CalendarDays, Search, UserCheck, Users } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { mockEvents } from "@/lib/mock-data"
import {
  ROLES_IN_EVENT,
  SEED_ASSIGNMENTS,
  STAFF_MEMBERS,
  type StaffAssignmentEntry,
} from "./staff-assignment-data"

// Only events that still need gate operations are assignable.
const ASSIGNABLE_EVENTS = mockEvents.filter((e) => e.status === "published")

/**
 * Admin staff-assignment grid: pick an event on the left, toggle staff and
 * their in-event role on the right. Local mock state — mirrors the designed
 * StaffAssignment entity until the backend exists.
 */
export function StaffAssignmentView() {
  const [assignments, setAssignments] = useState<Record<string, StaffAssignmentEntry[]>>(
    () => ({ ...SEED_ASSIGNMENTS })
  )
  const [selectedEventId, setSelectedEventId] = useState(ASSIGNABLE_EVENTS[0]?.id ?? "")
  const [query, setQuery] = useState("")

  const current = useMemo(
    () => assignments[selectedEventId] ?? [],
    [assignments, selectedEventId]
  )

  const staffRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return STAFF_MEMBERS
    return STAFF_MEMBERS.filter((s) =>
      [s.name, s.email, s.phone].some((v) => v.toLowerCase().includes(q))
    )
  }, [query])

  const setForEvent = (next: StaffAssignmentEntry[]) =>
    setAssignments((prev) => ({ ...prev, [selectedEventId]: next }))

  const toggleStaff = (staffId: string) => {
    const exists = current.some((a) => a.staffId === staffId)
    setForEvent(
      exists
        ? current.filter((a) => a.staffId !== staffId)
        : [...current, { staffId, roleInEvent: ROLES_IN_EVENT[0] }]
    )
  }

  const changeRole = (staffId: string, roleInEvent: string) =>
    setForEvent(current.map((a) => (a.staffId === staffId ? { ...a, roleInEvent } : a)))

  const selectedEvent = ASSIGNABLE_EVENTS.find((e) => e.id === selectedEventId)

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Phân công staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gán nhân viên check-in vào các sự kiện đã công bố và chỉ định vai trò tại hiện trường.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* ── Event list ─────────────────────────────────────────── */}
        <div className="space-y-2">
          {ASSIGNABLE_EVENTS.map((event) => {
            const count = (assignments[event.id] ?? []).length
            const active = event.id === selectedEventId
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => setSelectedEventId(event.id)}
                aria-pressed={active}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-colors cursor-pointer",
                  active
                    ? "border-cyan-500 bg-cyan-500/10 shadow-sm"
                    : "border-border bg-card hover:bg-muted"
                )}
              >
                <p className="font-semibold text-foreground">{event.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {count} staff được phân
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── Staff panel for the selected event ─────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-foreground">
                {selectedEvent ? selectedEvent.title : "Chọn sự kiện"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {current.length} / {STAFF_MEMBERS.length} staff được phân công
              </p>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm staff…"
                aria-label="Tìm nhân viên"
                className="h-10 w-52 rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition-colors focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="divide-y divide-border">
            {staffRows.map((staff) => {
              const entry = current.find((a) => a.staffId === staff.id)
              const assigned = Boolean(entry)
              return (
                <div key={staff.id} className="flex flex-wrap items-center gap-3 py-3">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={assigned}
                      onChange={() => toggleStaff(staff.id)}
                      className="h-4.5 w-4.5 rounded border-border accent-cyan-600"
                      aria-label={`Phân công ${staff.name}`}
                    />
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                      {staff.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {staff.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {staff.email} · {staff.phone}
                      </span>
                    </span>
                  </label>

                  {assigned ? (
                    <select
                      value={entry?.roleInEvent}
                      onChange={(e) => changeRole(staff.id, e.target.value)}
                      aria-label={`Vai trò của ${staff.name}`}
                      className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-cyan-500"
                    >
                      {ROLES_IN_EVENT.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="secondary" className="text-[11px]">Chưa phân</Badge>
                  )}
                </div>
              )
            })}
            {staffRows.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không tìm thấy staff phù hợp.
              </p>
            )}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5" />
            Staff được phân sẽ thấy sự kiện trong khu vực làm việc /staff của họ (khi nối API).
          </p>
        </div>
      </div>
    </div>
  )
}
