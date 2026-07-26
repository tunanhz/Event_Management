"use client"

import { useEffect, useRef } from "react"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  ImagePlus,
  Clapperboard,
} from "lucide-react"
import styles from "./RichTextEditor.module.css"

/**
 * Minimal, dependency-free rich-text editor built on a contentEditable region.
 * Uses document.execCommand — deprecated but universally supported and adequate
 * for authoring event descriptions without pulling in an editor library.
 */
export function RichTextEditor({
  initialHTML,
  onChange,
  maxChars,
  currentChars,
}: {
  initialHTML: string
  onChange: (html: string) => void
  /** Optional plain-text character cap — shows a live counter under the editor.
   *  Counting is owned by the parent (so it matches the wizard's validation)
   *  and passed back in via `currentChars`. */
  maxChars?: number
  currentChars?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Seed the DOM imperatively, once, on mount — never via the declarative
  // dangerouslySetInnerHTML prop on every render. React re-applies that prop
  // on each re-render regardless of whether the string value changed, which
  // was silently reverting every keystroke back to the original seed a few
  // ms later (confirmed with a MutationObserver: edit lands, then a second
  // mutation puts the old content straight back). Setting innerHTML directly
  // here means React has no opinion about this node's children afterward, so
  // later re-renders (triggered by our own onChange → parent setState) can
  // never touch it again — only the browser's native contentEditable
  // handling and our onInput listener do from this point on.
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHTML
    // Intentionally run once: re-seeding on every `initialHTML` change would
    // reintroduce the same clobbering bug this effect exists to avoid.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emit = () => onChange(ref.current?.innerHTML ?? "")

  const exec = (command: string, value?: string) => {
    ref.current?.focus()
    document.execCommand(command, false, value)
    emit()
  }

  const insertImage = () => {
    const url = window.prompt("Nhập đường dẫn hình ảnh (URL):")
    if (url) exec("insertImage", url)
  }

  const insertVideo = () => {
    const url = window.prompt("Nhập đường dẫn video (URL):")
    if (url) exec("createLink", url)
  }

  const COLORS = ["#ffffff", "#22c55e", "#f97316", "#eab308"]

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} role="toolbar" aria-label="Định dạng văn bản">
        <select
          className={styles.select}
          aria-label="Kiểu đoạn văn"
          defaultValue="p"
          onChange={(e) => exec("formatBlock", e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
        </select>

        <span className={styles.divider} aria-hidden="true" />

        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={styles.swatch}
            style={{ background: c }}
            aria-label={`Màu chữ ${c}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("foreColor", c)}
          />
        ))}

        <span className={styles.divider} aria-hidden="true" />

        <ToolBtn label="In đậm" onClick={() => exec("bold")}><Bold size={17} /></ToolBtn>
        <ToolBtn label="In nghiêng" onClick={() => exec("italic")}><Italic size={17} /></ToolBtn>
        <ToolBtn label="Gạch chân" onClick={() => exec("underline")}><Underline size={17} /></ToolBtn>

        <span className={styles.divider} aria-hidden="true" />

        <ToolBtn label="Căn trái" onClick={() => exec("justifyLeft")}><AlignLeft size={17} /></ToolBtn>
        <ToolBtn label="Căn giữa" onClick={() => exec("justifyCenter")}><AlignCenter size={17} /></ToolBtn>
        <ToolBtn label="Căn phải" onClick={() => exec("justifyRight")}><AlignRight size={17} /></ToolBtn>
        <ToolBtn label="Căn đều" onClick={() => exec("justifyFull")}><AlignJustify size={17} /></ToolBtn>

        <span className={styles.divider} aria-hidden="true" />

        <ToolBtn label="Danh sách dấu đầu dòng" onClick={() => exec("insertUnorderedList")}>
          <List size={17} />
        </ToolBtn>
        <ToolBtn label="Danh sách đánh số" onClick={() => exec("insertOrderedList")}>
          <ListOrdered size={17} />
        </ToolBtn>

        <span className={styles.divider} aria-hidden="true" />

        <ToolBtn label="Chèn hình ảnh" onClick={insertImage}><ImagePlus size={17} /></ToolBtn>
        <ToolBtn label="Chèn video" onClick={insertVideo}><Clapperboard size={17} /></ToolBtn>
      </div>

      <div
        ref={ref}
        className={styles.content}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Nội dung thông tin sự kiện"
        data-placeholder="Giới thiệu sự kiện, chương trình chính, khách mời, trải nghiệm đặc biệt, điều khoản và điều kiện..."
        onInput={emit}
      />

      {maxChars != null && (
        <div
          aria-live="polite"
          style={{
            marginTop: 6,
            textAlign: "right",
            fontSize: 12,
            color: (currentChars ?? 0) > maxChars ? "#ef4444" : "var(--muted-foreground, #71717a)",
          }}
        >
          {currentChars ?? 0}/{maxChars} ký tự
        </div>
      )}
    </div>
  )
}

function ToolBtn({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={styles.btn}
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
