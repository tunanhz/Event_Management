"use client"

import { useRef, useState } from "react"
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
}: {
  initialHTML: string
  onChange: (html: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  // Capture once (lazy init) so React never re-sets innerHTML and clobbers the caret.
  const [seeded] = useState(initialHTML)

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
        data-placeholder="Nhập thông tin chi tiết về sự kiện..."
        onInput={emit}
        dangerouslySetInnerHTML={{ __html: seeded }}
      />
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
