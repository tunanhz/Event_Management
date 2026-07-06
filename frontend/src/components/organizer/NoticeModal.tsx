"use client"

import { useEffect, useRef } from "react"
import styles from "./NoticeModal.module.css"

/**
 * "Lưu ý khi đăng tải sự kiện" modal shown when the organizer opens their
 * events area. Dismissible via the OK button, Escape, or an overlay click.
 */
export function NoticeModal({ onClose }: { onClose: () => void }) {
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    okRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notice-title"
      onClick={onClose}
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 id="notice-title" className={styles.title}>
          LƯU Ý KHI ĐĂNG TẢI SỰ KIỆN
        </h2>

        <ol className={styles.list}>
          <li className={styles.item}>
            <span>
              Vui lòng{" "}
              <strong>không hiển thị thông tin liên lạc của Ban Tổ Chức</strong>{" "}
              (ví dụ: Số điện thoại/ Email/ Website/ Facebook/ Instagram...){" "}
              <strong>trên banner và trong nội dung bài đăng.</strong> Chỉ sử dụng
              duy nhất Hotline EventBox - 1900.6408.
            </span>
          </li>
          <li className={styles.item}>
            <span>
              Trong trường hợp Ban tổ chức{" "}
              <strong>
                tạo mới hoặc cập nhật sự kiện không đúng theo quy định nêu trên,
                EventBox có quyền từ chối phê duyệt sự kiện.
              </strong>
            </span>
          </li>
          <li className={styles.item}>
            <span>
              EventBox sẽ liên tục kiểm tra thông tin các sự kiện đang được hiển
              thị trên nền tảng,{" "}
              <strong>
                nếu phát hiện có sai phạm liên quan đến hình ảnh/ nội dung bài
                đăng, EventBox có quyền gỡ bỏ hoặc từ chối cung cấp dịch vụ đối với
                các sự kiện này,
              </strong>{" "}
              dựa theo điều khoản 2.9 trong Hợp đồng dịch vụ.
            </span>
          </li>
        </ol>

        <div className={styles.footer}>
          <button ref={okRef} type="button" className={styles.okBtn} onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
