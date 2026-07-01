"use client"

import { useState } from "react"
import { Save } from "lucide-react"
import { cn } from "@/lib/utils"

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-6 w-11 flex-shrink-0 rounded-full transition-colors cursor-pointer",
        on ? "bg-cyan-600" : "bg-slate-300 dark:bg-slate-600"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          on && "translate-x-5"
        )}
      />
    </button>
  )
}

function Row({
  title,
  desc,
  children,
}: {
  title: string
  desc: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const [platformName, setPlatformName] = useState("EventBox")
  const [hotline, setHotline] = useState("1900.6408")
  const [autoApprove, setAutoApprove] = useState(false)
  const [maintenance, setMaintenance] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    // Persisting settings is out of scope for this screen.
    console.log({ platformName, hotline, autoApprove, maintenance, emailAlerts })
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-border bg-muted px-3.5 text-sm text-foreground outline-none transition-all focus:border-cyan-500 focus:bg-card focus:ring-2 focus:ring-cyan-500/20"

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6 animate-fade-up">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cấu hình chung cho nền tảng EventBox.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-cyan-700 cursor-pointer"
        >
          <Save className="h-4 w-4" />
          Lưu thay đổi
        </button>
      </div>

      {/* General */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-foreground">Thông tin chung</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Tên nền tảng</label>
            <input className={inputClass} value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Hotline hỗ trợ</label>
            <input className={inputClass} value={hotline} onChange={(e) => setHotline(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Moderation & system */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm divide-y divide-border">
        <h3 className="pb-2 text-base font-semibold text-foreground">Kiểm duyệt & Hệ thống</h3>
        <Row
          title="Tự động duyệt sự kiện"
          desc="Sự kiện mới được công bố ngay mà không cần Admin duyệt thủ công."
        >
          <Toggle on={autoApprove} onChange={setAutoApprove} />
        </Row>
        <Row
          title="Thông báo qua Email"
          desc="Gửi email cho Admin khi có sự kiện mới cần duyệt."
        >
          <Toggle on={emailAlerts} onChange={setEmailAlerts} />
        </Row>
        <Row
          title="Chế độ bảo trì"
          desc="Tạm khoá truy cập nền tảng đối với người dùng thường."
        >
          <Toggle on={maintenance} onChange={setMaintenance} />
        </Row>
      </div>
    </form>
  )
}
