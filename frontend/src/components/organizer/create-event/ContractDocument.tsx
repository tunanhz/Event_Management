"use client"

import type { CreateEventForm } from "./create-event-data"
import styles from "./contract-step.module.css"

/** Standard service-contract clauses between the organizer and the platform. */
export const CONTRACT_CLAUSES: { title: string; text: string }[] = [
  {
    title: "Điều 1. Các bên",
    text: "Hợp đồng dịch vụ được ký kết giữa EventBox (bên cung cấp nền tảng — Bên A) và Ban tổ chức (bên đăng tải và vận hành sự kiện — Bên B).",
  },
  {
    title: "Điều 2. Phạm vi dịch vụ",
    text: "EventBox cung cấp nền tảng đăng tải sự kiện, bán vé trực tuyến, thu hộ và đối soát doanh thu theo các điều khoản hiện hành. Các hạng mục thuê dịch vụ từ nền tảng cần cọc trước 20% chi phí dịch vụ (chi phí cụ thể sẽ được admin thông báo lại sau khi xem và duyệt sự kiện).",
  },
  {
    title: "Điều 3. Trách nhiệm Ban tổ chức",
    text: "Ban tổ chức cam kết cung cấp thông tin sự kiện chính xác, tổ chức đúng như công bố và tuân thủ quy định pháp luật cũng như chính sách nội dung của EventBox.",
  },
  {
    title: "Điều 4. Thanh toán & đối soát",
    text: "Doanh thu bán vé được đối soát và chuyển cho Ban tổ chức sau khi trừ phí dịch vụ, theo lịch và tài khoản khai báo ở bước Thông tin thanh toán.",
  },
  {
    title: "Điều 5. Hủy & hoàn tiền",
    text: "Trường hợp sự kiện bị hủy hoặc thay đổi, Ban tổ chức chịu trách nhiệm hoàn tiền cho người tham gia theo chính sách hoàn vé của EventBox.",
  },
]

/**
 * A4-styled service contract "paper" rendered from the wizard form. The same
 * node is what gets printed / saved as PDF (print CSS hides everything else),
 * including the hand-drawn signature once the organizer signs.
 */
export function ContractDocument({ form }: { form: CreateEventForm }) {
  const today = new Date()
  const dateLine = `ngày ${today.getDate()} tháng ${today.getMonth() + 1} năm ${today.getFullYear()}`

  return (
    <div id="contract-print-area" className={styles.paper}>
      <div className={styles.paperHead}>
        <p className={styles.paperNational}>
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          <br />
          <strong>Độc lập – Tự do – Hạnh phúc</strong>
        </p>
        <h2 className={styles.paperTitle}>HỢP ĐỒNG DỊCH VỤ NỀN TẢNG SỰ KIỆN</h2>
        <p className={styles.paperMeta}>Số: EVB-{today.getFullYear()}/#####-DRAFT · Lập {dateLine}</p>
      </div>

      <div className={styles.paperParties}>
        <p>
          <strong>Bên A (Nền tảng):</strong> EventBox — nền tảng quản lý &amp; phân phối vé sự
          kiện.
        </p>
        <p>
          <strong>Bên B (Ban tổ chức):</strong> {form.orgName || "………………………………"}
          {" — "}đại diện: {form.contractRepName || "………………………………"}
        </p>
        <p>
          <strong>Sự kiện đăng tải:</strong> {form.name || "………………………………"}
        </p>
      </div>

      {CONTRACT_CLAUSES.map((clause) => (
        <div key={clause.title}>
          <h4 className={styles.paperClauseTitle}>{clause.title}</h4>
          <p className={styles.paperClauseText}>{clause.text}</p>
        </div>
      ))}

      <div className={styles.paperSignRow}>
        <div className={styles.paperSignCol}>
          <p className={styles.paperSignRole}>ĐẠI DIỆN BÊN A</p>
          <p className={styles.paperSignNote}>(Ký xác nhận điện tử khi sự kiện được duyệt)</p>
          <div className={styles.paperSignBox}>
            <span className={styles.paperStamp}>EventBox</span>
          </div>
          <p className={styles.paperSignName}>Nền tảng EventBox</p>
        </div>
        <div className={styles.paperSignCol}>
          <p className={styles.paperSignRole}>ĐẠI DIỆN BÊN B</p>
          <p className={styles.paperSignNote}>(Ký tên bằng bảng ký bên dưới)</p>
          <div className={styles.paperSignBox}>
            {form.signatureDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.signatureDataUrl}
                alt="Chữ ký người đại diện Ban tổ chức"
                className={styles.paperSignImg}
              />
            ) : (
              <span className={styles.paperSignPlaceholder}>Chưa ký</span>
            )}
          </div>
          <p className={styles.paperSignName}>{form.contractRepName || "………………………………"}</p>
        </div>
      </div>
    </div>
  )
}
