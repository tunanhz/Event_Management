import Link from "next/link"
import { Ticket, Zap, ShieldCheck, CalendarDays, Sparkles } from "lucide-react"

/**
 * Branded left panel for the split-screen auth layout (login / register).
 * Self-contained cyan brand band (no external assets): layered gradient,
 * radial glows, a faint dot grid, glass value cards and a stats row.
 * Hidden below the `lg` breakpoint — pages render a compact logo instead.
 */
const VALUE_PROPS = [
  { icon: Zap, title: "Đặt vé nhanh chóng", desc: "Mua vé chỉ trong vài giây, xác nhận tức thì." },
  { icon: ShieldCheck, title: "Thanh toán an toàn", desc: "Bảo mật, minh bạch, hỗ trợ hoàn tiền." },
  { icon: CalendarDays, title: "1000+ sự kiện mỗi tháng", desc: "Âm nhạc, thể thao, workshop, sân khấu…" },
]

const STATS = [
  { value: "500K+", label: "Vé đã bán" },
  { value: "1000+", label: "Sự kiện / tháng" },
  { value: "4.9/5", label: "Đánh giá" },
]

export function AuthBrandPanel() {
  return (
    <aside
      className="relative hidden w-1/2 max-w-xl flex-col gap-10 overflow-hidden p-12 text-white lg:flex"
      style={{ background: "linear-gradient(140deg, #0891b2 0%, #0c6f8c 52%, #124e62 100%)" }}
    >
      {/* Decorative layers */}
      {/* Light source — top-left highlight gives the flat gradient dimension */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(115% 90% at 0% 0%, rgba(125,234,250,0.40), transparent 55%)" }}
      />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-sky-500/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-cyan-200/20 blur-3xl" />

      {/* Concentric "ripple" motif — evokes sound / live events */}
      <svg
        aria-hidden
        viewBox="0 0 400 400"
        fill="none"
        className="pointer-events-none absolute -bottom-24 -right-24 h-[30rem] w-[30rem] text-white/[0.07]"
      >
        <circle cx="200" cy="200" r="70" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="200" r="120" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="200" r="170" stroke="currentColor" strokeWidth="2" />
        <circle cx="200" cy="200" r="200" stroke="currentColor" strokeWidth="2" />
      </svg>

      {/* Dot grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      {/* Top sheen */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/10 to-transparent" />

      {/* Logo */}
      <Link href="/" aria-label="Về trang chủ EventBox" className="relative flex items-center gap-2.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
          <Ticket className="h-6 w-6" />
        </span>
        <span className="text-2xl font-extrabold tracking-tight">EventBox</span>
      </Link>

      {/* Headline + value props */}
      <div className="relative">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ring-1 ring-white/20 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5" />
          Nền tảng sự kiện #1 Việt Nam
        </span>

        <h1 className="mt-5 text-4xl font-extrabold leading-[1.12]">
          Khám phá &amp; đặt vé
          <br />
          sự kiện <span className="text-cyan-100">hàng đầu</span> Việt Nam
        </h1>

        <ul className="mt-8 space-y-3">
          {VALUE_PROPS.map(({ icon: Icon, title, desc }) => (
            <li
              key={title}
              className="flex items-start gap-3 rounded-2xl bg-white/10 p-3.5 ring-1 ring-white/10 backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold leading-tight">{title}</p>
                <p className="mt-0.5 text-sm text-cyan-50/80">{desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Stats + copyright — pinned to the bottom of the panel */}
      <div className="relative mt-auto">
        <div className="flex items-center gap-8">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-xs text-cyan-50/70">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-cyan-50/55">© 2026 EventBox. Nền tảng sự kiện hàng đầu.</p>
      </div>
    </aside>
  )
}
