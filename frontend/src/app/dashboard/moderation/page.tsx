"use client"

import { useState } from "react"
import { Check, X, Building2, MapPin, Inbox, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { mockModerationEvents } from "@/lib/mock-data"
import type { ModerationEvent, ModerationStatus } from "@/types"

const TABS: { id: ModerationStatus; label: string }[] = [
  { id: "pending", label: "Chờ duyệt" },
  { id: "approved", label: "Đã duyệt" },
  { id: "rejected", label: "Từ chối" },
]

export default function ModerationPage() {
  const [events, setEvents] = useState<ModerationEvent[]>(mockModerationEvents)
  const [tab, setTab] = useState<ModerationStatus>("pending")

  const setStatus = (id: string, status: ModerationStatus) =>
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))

  const count = (s: ModerationStatus) => events.filter((e) => e.status === s).length
  const rows = events.filter((e) => e.status === tab)

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Kiểm duyệt sự kiện</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Xét duyệt các sự kiện do Ban tổ chức gửi lên trước khi công bố.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              tab === t.id
                ? "bg-cyan-600 text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:bg-muted"
            )}
          >
            {t.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs font-bold",
                tab === t.id ? "bg-white/20" : "bg-muted"
              )}
            >
              {count(t.id)}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {rows.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Inbox className="h-12 w-12 opacity-40" />
            <p className="text-sm">Không có sự kiện nào trong mục này.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rows.map((event) => (
              <div key={event.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl gradient-primary text-lg font-bold text-white">
                  {event.title.charAt(0)}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold text-foreground">{event.title}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {event.organizer}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </span>
                    <Badge variant="secondary" className="text-[11px]">
                      {event.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gửi lúc{" "}
                    {new Date(event.submittedAt).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-shrink-0 items-center gap-2">
                  {event.status === "pending" ? (
                    <>
                      <button
                        onClick={() => setStatus(event.id, "approved")}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                        Duyệt
                      </button>
                      <button
                        onClick={() => setStatus(event.id, "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        Từ chối
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge variant={event.status === "approved" ? "success" : "destructive"}>
                        {event.status === "approved" ? "Đã duyệt" : "Đã từ chối"}
                      </Badge>
                      <button
                        onClick={() => setStatus(event.id, "pending")}
                        title="Đưa về chờ duyệt"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
