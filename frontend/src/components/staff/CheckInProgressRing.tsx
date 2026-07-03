interface CheckInProgressRingProps {
  /** Completion percentage, 0–100. */
  value: number
  size?: number
  stroke?: number
}

/** Circular check-in completion gauge for the staff hero header. */
export function CheckInProgressRing({ value, size = 116, stroke = 11 }: CheckInProgressRingProps) {
  const pct = Math.min(100, Math.max(0, value))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-extrabold tabular-nums text-foreground">
          {Math.round(pct)}%
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">đã vào</span>
      </div>
    </div>
  )
}
