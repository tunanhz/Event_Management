"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CalendarDays, Search, UserCheck, Users, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { clientApi } from "@/lib/client-api"
import {
  fetchEventAssignments,
  createAssignment,
  updateAssignmentNote,
  deleteAssignment,
  type StaffAssignment,
} from "@/lib/staff-api"
import { fetchAdminEvents, type AdminEvent } from "@/lib/admin-event-api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  _id: string
  fullName: string
  email: string
  phone?: string
  role: string
  accountStatus: string
}

interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
  meta?: { currentPage: number; totalPages: number; totalItems: number; itemsPerPage: number }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffAssignmentView() {
  // State: events
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)

  // State: staff users
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [staffLoading, setStaffLoading] = useState(true)

  // State: current event + assignments
  const [selectedEventId, setSelectedEventId] = useState<string>("")
  const [assignments, setAssignments] = useState<StaffAssignment[]>([])
  const [assignmentsLoading, setAssignmentsLoading] = useState(false)

  // State: in-progress ops (staffId → loading)
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({})
  const savedNotesRef = useRef<Record<string, string>>({})

  // State: search + feedback
  const [query, setQuery] = useState("")
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // ── Fetch events ────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAdminEvents({ status: "published", limit: 100 })
      .then(({ events: ev }) => {
        setEvents(ev)
        if (ev.length > 0) setSelectedEventId(ev[0]._id)
      })
      .catch(console.error)
      .finally(() => setEventsLoading(false))
  }, [])

  // ── Fetch staff users ───────────────────────────────────────────────────────

  useEffect(() => {
    clientApi
      .get<ApiEnvelope<StaffUser[]>>("/users/admin?role=STAFF&limit=200")
      .then((res) => setStaffUsers(res.data ?? []))
      .catch(console.error)
      .finally(() => setStaffLoading(false))
  }, [])

  // ── Fetch assignments for selected event ────────────────────────────────────

  const loadAssignments = useCallback(async (eventId: string) => {
    if (!eventId) return
    setAssignmentsLoading(true)
    try {
      const data = await fetchEventAssignments(eventId)
      setAssignments(data)
      savedNotesRef.current = Object.fromEntries(
        data.map((assignment) => [assignment._id, assignment.note ?? ""])
      )
    } catch {
      setAssignments([])
    } finally {
      setAssignmentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedEventId) loadAssignments(selectedEventId)
  }, [selectedEventId, loadAssignments])

  // ── Derived data ────────────────────────────────────────────────────────────

  const filteredStaff = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staffUsers
    return staffUsers.filter((s) =>
      [s.fullName, s.email, s.phone ?? ""].some((v) => v.toLowerCase().includes(q))
    )
  }, [staffUsers, query])

  const selectedEvent = events.find((e) => e._id === selectedEventId)

  // Helper: find existing assignment for a staff member
  const getAssignment = (staffId: string) =>
    assignments.find(
      (a) =>
        (typeof a.staffId === "string" ? a.staffId : a.staffId._id) === staffId
    )

  // ── Toggle assign / unassign ────────────────────────────────────────────────

  const toggleStaff = async (staffId: string) => {
    if (!selectedEventId || toggling[staffId]) return
    setToggling((p) => ({ ...p, [staffId]: true }))

    const existing = getAssignment(staffId)
    try {
      if (existing) {
        // Unassign
        await deleteAssignment(selectedEventId, existing._id)
        setAssignments((prev) => prev.filter((a) => a._id !== existing._id))
        delete savedNotesRef.current[existing._id]
        showToast("Đã hủy phân công", true)
      } else {
        // Phân công trước; admin có thể nhập ghi chú nhiệm vụ ngay sau đó.
        const newA = await createAssignment(selectedEventId, {
          staffId,
          note: "",
        })
        setAssignments((prev) => [...prev, newA])
        savedNotesRef.current[newA._id] = newA.note ?? ""
        showToast("Phân công thành công!", true)
      }
    } catch (err: any) {
      showToast(err.message ?? "Lỗi khi thực hiện phân công", false)
    } finally {
      setToggling((p) => ({ ...p, [staffId]: false }))
    }
  }

  const changeNote = (assignmentId: string, note: string) => {
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment._id === assignmentId ? { ...assignment, note } : assignment
      )
    )
  }

  const saveNote = async (staffId: string, note: string) => {
    const existing = getAssignment(staffId)
    if (!existing || toggling[staffId] || savingNotes[staffId]) return

    const normalizedNote = note.trim()
    if (normalizedNote === (savedNotesRef.current[existing._id] ?? "")) {
      if (normalizedNote !== note) changeNote(existing._id, normalizedNote)
      return
    }

    setSavingNotes((prev) => ({ ...prev, [staffId]: true }))
    try {
      const updated = await updateAssignmentNote(
        selectedEventId,
        existing._id,
        normalizedNote
      )
      savedNotesRef.current[existing._id] = updated.note ?? ""
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment._id === existing._id ? updated : assignment
        )
      )
      showToast("Đã lưu ghi chú nhiệm vụ", true)
    } catch (err: any) {
      changeNote(existing._id, savedNotesRef.current[existing._id] ?? "")
      showToast(err.message ?? "Không thể lưu ghi chú nhiệm vụ", false)
    } finally {
      setSavingNotes((prev) => ({ ...prev, [staffId]: false }))
    }
  }

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = eventsLoading || staffLoading

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Phân công staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gán nhân viên check-in vào sự kiện và ghi chú nhiệm vụ cần thực hiện.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg",
            toast.ok
              ? "bg-emerald-600 text-white"
              : "bg-destructive text-destructive-foreground"
          )}
        >
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          {/* ── Event list ─────────────────────────────────────────── */}
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Không có sự kiện đang công bố nào.
              </p>
            ) : (
              events.map((event) => {
                const active = event._id === selectedEventId
                return (
                  <button
                    key={event._id}
                    type="button"
                    onClick={() => setSelectedEventId(event._id)}
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
                      {(event.startDate || event.date) && (
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(event.startDate ?? event.date ?? "").toLocaleDateString("vi-VN")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {active ? assignments.length : "–"} staff được phân
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* ── Staff panel ─────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-foreground">
                  {selectedEvent ? selectedEvent.title : "Chọn sự kiện"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {assignmentsLoading ? "Đang tải..." : `${assignments.length} / ${staffUsers.length} staff được phân công`}
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

            {assignmentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStaff.map((staff) => {
                  const entry = getAssignment(staff._id)
                  const assigned = Boolean(entry)
                  const isToggling = toggling[staff._id]
                  const assignmentStatusLabel = entry?.status === "assigned"
                    ? "Chờ xác nhận"
                    : entry?.status === "confirmed"
                      ? "Đã xác nhận"
                      : entry?.status === "expired"
                        ? "Không làm"
                        : entry?.status === "completed"
                          ? "Hoàn thành"
                          : "Đã hủy"
                  const assignmentStatusVariant = entry?.status === "confirmed"
                    ? "success"
                    : entry?.status === "assigned"
                      ? "warning"
                      : entry?.status === "expired" || entry?.status === "cancelled"
                        ? "destructive"
                        : "secondary"
                  return (
                    <div key={staff._id} className="flex flex-wrap items-center gap-3 py-3">
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                        <input
                          type="checkbox"
                          checked={assigned}
                          onChange={() => toggleStaff(staff._id)}
                          disabled={isToggling || !selectedEventId}
                          className="h-4 w-4 rounded border-border accent-cyan-600 disabled:opacity-50"
                          aria-label={`Phân công ${staff.fullName}`}
                        />
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                          {staff.fullName.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {staff.fullName}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {staff.email}{staff.phone ? ` · ${staff.phone}` : ""}
                          </span>
                        </span>
                      </label>

                      {isToggling ? (
                        <Loader2 className="animate-spin text-muted-foreground" size={18} />
                      ) : assigned && entry ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Badge variant={assignmentStatusVariant} className="text-[11px]">
                            {assignmentStatusLabel}
                          </Badge>
                          <div className="relative">
                            <input
                              type="text"
                              value={entry.note ?? ""}
                              onChange={(event) => changeNote(entry._id, event.target.value)}
                              onBlur={(event) => saveNote(staff._id, event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.currentTarget.blur()
                              }}
                              maxLength={500}
                              disabled={savingNotes[staff._id]}
                              placeholder="Ghi chú nhiệm vụ..."
                              aria-label={`Ghi chú nhiệm vụ của ${staff.fullName}`}
                              className="h-9 w-56 rounded-lg border border-border bg-background px-2.5 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-cyan-500 disabled:opacity-60"
                            />
                            {savingNotes[staff._id] && (
                              <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[11px]">Chưa phân</Badge>
                      )}
                    </div>
                  )
                })}
                {filteredStaff.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Không tìm thấy staff phù hợp.
                  </p>
                )}
              </div>
            )}

            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCheck className="h-3.5 w-3.5" />
              Staff được phân sẽ thấy sự kiện trong khu vực làm việc /staff của họ.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
