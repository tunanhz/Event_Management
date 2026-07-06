"use client"

import { useState } from "react"
import { Eye, EyeOff, type LucideIcon } from "lucide-react"

interface AccountFieldProps {
  id: string
  label: string
  icon: LucideIcon
  value: string
  type?: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  readOnly?: boolean
  autoComplete?: string
  inputMode?: "text" | "tel" | "email" | "numeric"
  maxLength?: number
  helperText?: string
  error?: string
}

/**
 * Shared labelled input for the account area. Handles the icon affordance,
 * read-only styling, an accessible error/helper line, and — for password
 * fields — a show/hide toggle. Keeps both account forms DRY and consistent.
 */
export function AccountField({
  id,
  label,
  icon: Icon,
  value,
  type = "text",
  onChange,
  placeholder,
  required,
  readOnly,
  autoComplete,
  inputMode,
  maxLength,
  helperText,
  error,
}: AccountFieldProps) {
  const [reveal, setReveal] = useState(false)
  const isPassword = type === "password"
  const resolvedType = isPassword ? (reveal ? "text" : "password") : type

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-semibold uppercase tracking-wider text-foreground"
      >
        {label}
        {required && (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <input
          id={id}
          type={resolvedType}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          placeholder={placeholder}
          required={required}
          readOnly={readOnly}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : helperText ? `${id}-helper` : undefined}
          className={`block min-h-[44px] w-full rounded-xl border py-2.5 pl-10 text-foreground placeholder-slate-400 transition-all sm:text-sm ${
            isPassword ? "pr-11" : "pr-3"
          } ${
            readOnly
              ? "cursor-not-allowed border-border bg-muted/50 text-muted-foreground"
              : "border-border bg-muted focus:border-cyan-500 focus:bg-card focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          }`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            {reveal ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p id={`${id}-helper`} className="mt-1 text-xs text-muted-foreground">
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
    </div>
  )
}
