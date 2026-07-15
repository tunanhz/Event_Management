"use client"

import { useEffect, useMemo, useState, useCallback } from "react"
import { CalendarDays, Search, UserCheck, Users, Loader2 } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { fetchAdminEvents, type AdminEvent } from "@/lib/admin-event-api"
import { clientApi } from "@/lib/client-api"
import {
  getStaffByEvent,
  assignStaff,
  removeStaff,
  updateAssignment,
  type StaffAssignment,
} from "@/lib/staff-api"

const ROLES_IN_EVENT = [
  "Soát vé cổng chính",
  "Soát vé cổng phụ",
  "Hỗ trợ khán giả",
  "Điều phối khu vực",
]

interface StaffUser {
  _id: string
  fullName: string
  email: string
  phone?: string
}

export function StaffAssignmentView() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffUser[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<StaffAssignment[]>([])
  const [selectedEventId, setSelectedEventId] = useState("")
  
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")

  // Fetch published events
  useEffect(() => {
    fetchAdminEvents({ limit: 100, status: "published" })
      .then((res) => {
        setEvents(res.events)
        if (res.events.length > 0) {
          setSelectedEventId(res.events[0]._id)
        }
      })
      .catch((err) => setError(err.message ?? "Không thể tải danh sách sự kiện"))
      .finally(() => setLoadingEvents(false))

    // Fetch all staff users
    clientApi.get<any>("/users/admin?role=STAFF&limit=100")
      .then((res) => {
        setStaffMembers(res.data || [])
      })
      .catch((err) => setError(err.message ?? "Không thể tải danh sách nhân viên"))
      .finally(() => setLoadingStaff(false))
  }, [])

  // Fetch current assignments when selected event changes
  const fetchAssignments = useCallback(async () => {
    if (!selectedEventId) return
    setLoadingAssignments(true)
    try {
      const data = await getStaffByEvent(selectedEventId)
      setCurrentAssignments(data)
    } catch (err: any) {
      console.error(err)
    } finally {
      setLoadingAssignments(false)
    }
  }, [selectedEventId])

  useEffect(() => {
    fetchAssignments()
  }, [fetchAssignments])

  // Filter staff rows based on query
  const staffRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return staffMembers
    return staffMembers.filter((s) =>
      [s.fullName, s.email, s.phone || ""].some((v) => v.toLowerCase().includes(q))
    )
  }, [query, staffMembers])

  const selectedEvent = events.find((e) => e._id === selectedEventId)

  // Toggle staff assignment
  const toggleStaff = async (staffId: string) => {
    if (!selectedEventId) return
    const existing = currentAssignments.find((a) => (a.staffId?._id ?? a.staffId) === staffId)
    
    try {
      if (existing) {
        await removeStaff(selectedEventId, staffId)
        setCurrentAssignments((prev) => prev.filter((a) => (a.staffId?._id ?? a.staffId) !== staffId))
      } else {
        const newAssign = await assignStaff({
          eventId: selectedEventId,
          staffId,
          roleInEvent: ROLES_IN_EVENT[0],
          gate: "Cổng chính (A)",
          shift: "18:00 – 22:00",
        })
        setCurrentAssignments((prev) => [...prev, newAssign])
      }
    } catch (err: any) {
      alert(err.message ?? "Thao tác phân công thất bại")
    }
  }

  // Update in-event role
  const changeRole = async (staffId: string, roleInEvent: string) => {
    if (!selectedEventId) return
    try {
      const updated = await updateAssignment(selectedEventId, staffId, { roleInEvent })
      setCurrentAssignments((prev) =>
        prev.map((a) => ((a.staffId?._id ?? a.staffId) === staffId ? { ...a, roleInEvent: updated.roleInEvent } : a))
      )
    } catch (err: any) {
      alert(err.message ?? "Cập nhật vai trò thất bại")
    }
  }

  if (loadingEvents || loadingStaff) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Phân công staff</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gán nhân viên check-in vào các sự kiện đã công bố và chỉ định vai trò tại hiện trường.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* ── Event list ─────────────────────────────────────────── */}
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Chưa có sự kiện nào được công bố.</p>
          ) : (
            events.map((event) => {
              const active = event._id === selectedEventId
              const eventDate = event.startDate || event.date
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
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {eventDate ? formatDate(eventDate) : "Chưa xác định"}
                    </span>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* ── Staff panel for the selected event ─────────────────── */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-foreground">
                {selectedEvent ? selectedEvent.title : "Chọn sự kiện"}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentAssignments.length} / {staffMembers.length} staff được phân công
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

          {loadingAssignments ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {staffRows.map((staff) => {
                const entry = currentAssignments.find((a) => (a.staffId?._id ?? a.staffId) === staff._id)
                const assigned = Boolean(entry)
                return (
                  <div key={staff._id} className="flex flex-wrap items-center gap-3 py-3">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={assigned}
                        onChange={() => toggleStaff(staff._id)}
                        className="h-4.5 w-4.5 rounded border-border accent-cyan-600 cursor-pointer"
                        aria-label={`Phân công ${staff.fullName}`}
                      />
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                        {staff.fullName.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {staff.fullName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {staff.email} {staff.phone ? `· ${staff.phone}` : ""}
                        </span>
                      </span>
                    </label>

                    {assigned ? (
                      <select
                        value={entry?.roleInEvent}
                        onChange={(e) => changeRole(staff._id, e.target.value)}
                        aria-label={`Vai trò của ${staff.fullName}`}
                        className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:border-cyan-500 cursor-pointer"
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
          )}

          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UserCheck className="h-3.5 w-3.5" />
            Nhân viên được phân công sẽ hiển thị lịch làm việc và trạm check-in tương ứng khi họ đăng nhập.
          </p>
        </div>
      </div>
    </div>
  )
}
