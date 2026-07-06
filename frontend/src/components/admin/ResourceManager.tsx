"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Pencil, Trash2, X, Loader2, type LucideIcon } from "lucide-react"
import type { ResourceApi, WithId } from "@/lib/admin-content-api"

export type FieldType = "text" | "number" | "image" | "emoji" | "boolean" | "textarea"

export interface FieldConfig {
  key: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  help?: string
}

export interface ResourceManagerProps<T extends WithId> {
  title: string
  description: string
  icon: LucideIcon
  api: ResourceApi<T>
  fields: FieldConfig[]
  /** Defaults for a new record (create form seed). */
  emptyItem: Record<string, unknown>
  /** Human label for one record (used in delete confirm), e.g. (r) => r.name. */
  labelOf: (item: T) => string
}

type FormState = Record<string, unknown>

/** Generic admin CRUD screen: list table + create/edit modal + delete. */
export function ResourceManager<T extends WithId>({
  title,
  description,
  icon: Icon,
  api,
  fields,
  emptyItem,
  labelOf,
}: ResourceManagerProps<T>) {
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Modal: null = closed; {} spread with _id when editing.
  const [form, setForm] = useState<FormState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await api.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu")
    } finally {
      setLoading(false)
    }
  }, [api])

  useEffect(() => {
    void reload()
  }, [reload])

  const openCreate = () => {
    setEditingId(null)
    setForm({ ...emptyItem })
    setFormError(null)
  }

  const openEdit = (item: T) => {
    setEditingId(item._id)
    setForm(Object.fromEntries(fields.map((f) => [f.key, item[f.key] ?? emptyItem[f.key]])))
    setFormError(null)
  }

  const setField = (key: string, value: unknown) =>
    setForm((f) => (f ? { ...f, [key]: value } : f))

  const save = async () => {
    if (!form || saving) return
    // Required-field validation.
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || String(form[f.key]).trim() === "")) {
        setFormError(`Vui lòng nhập "${f.label}"`)
        return
      }
    }
    // Coerce numbers.
    const payload: Record<string, unknown> = {}
    for (const f of fields) {
      payload[f.key] = f.type === "number" ? Number(form[f.key] ?? 0) : form[f.key]
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingId) await api.update(editingId, payload as Partial<T>)
      else await api.create(payload as Partial<T>)
      setForm(null)
      await reload()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lưu thất bại")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (item: T) => {
    if (!window.confirm(`Xoá "${labelOf(item)}"? Hành động này không thể hoàn tác.`)) return
    setBusyId(item._id)
    setError(null)
    try {
      await api.remove(item._id)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá thất bại")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <Icon className="h-6 w-6 text-cyan-500" /> {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Thêm mới
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin opacity-60" />
            <p className="text-sm">Đang tải…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-muted-foreground">
            <p className="text-sm">Chưa có mục nào. Bấm “Thêm mới” để tạo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  {fields.map((f) => (
                    <th key={f.key} className="px-4 py-3 font-semibold">{f.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-muted/40">
                    {fields.map((f) => (
                      <td key={f.key} className="px-4 py-3 align-middle text-foreground">
                        <CellValue type={f.type} value={item[f.key]} />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEdit(item)}
                          title="Sửa"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-cyan-600 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(item)}
                          disabled={busyId === item._id}
                          title="Xoá"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                        >
                          {busyId === item._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {form && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !saving && setForm(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl animate-fade-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground">
                {editingId ? `Sửa ${title.toLowerCase()}` : `Thêm ${title.toLowerCase()}`}
              </h3>
              <button onClick={() => setForm(null)} className="text-muted-foreground hover:text-foreground cursor-pointer" aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((f) => (
                <FieldInput key={f.key} field={f} value={form[f.key]} onChange={(v) => setField(f.key, v)} />
              ))}
            </div>

            {formError && (
              <p role="alert" className="mt-3 text-sm text-rose-500">{formError}</p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setForm(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                Huỷ
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-50 cursor-pointer"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingId ? "Lưu thay đổi" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Render a table cell by field type. */
function CellValue({ type, value }: { type: FieldType; value: unknown }) {
  if (type === "image") {
    return value ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={String(value)} alt="" className="h-10 w-16 rounded-md object-cover" />
    ) : (
      <span className="text-muted-foreground">—</span>
    )
  }
  if (type === "emoji") return <span className="text-xl">{String(value ?? "")}</span>
  if (type === "boolean")
    return (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
          value ? "bg-emerald-500/15 text-emerald-600" : "bg-muted text-muted-foreground"
        }`}
      >
        {value ? "Có" : "Không"}
      </span>
    )
  const text = String(value ?? "")
  return <span className={text ? "" : "text-muted-foreground"}>{text || "—"}</span>
}

/** Render a form input by field type. */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldConfig
  value: unknown
  onChange: (v: unknown) => void
}) {
  const label = (
    <label className="mb-1 flex items-center gap-1 text-sm font-semibold text-foreground">
      {field.required && <span className="text-rose-500">*</span>}
      {field.label}
    </label>
  )
  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-cyan-500"

  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
        <input
          type="checkbox"
          className="h-5 w-5 accent-cyan-600"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    )
  }

  return (
    <div>
      {label}
      {field.type === "textarea" ? (
        <textarea
          rows={3}
          className={inputCls}
          placeholder={field.placeholder}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={field.type === "number" ? "number" : "text"}
          className={inputCls}
          placeholder={field.placeholder}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help && <p className="mt-1 text-xs text-muted-foreground">{field.help}</p>}
      {field.type === "image" && value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={String(value)} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
      ) : null}
    </div>
  )
}
