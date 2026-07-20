/**
 * Mock notification feed (UC 32–34: view list / view details / delete).
 * Deterministic seed — read/deleted state lives in localStorage via
 * `use-notifications.ts` until a backend endpoint exists.
 */

export type NotificationType =
  | "event_approved"
  | "event_rejected"
  | "payment_success"
  | "event_reminder"
  | "withdrawal"
  | "system"

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string // ISO
  /** Optional deep link the notification points to. */
  href?: string
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  event_approved: "Sự kiện được duyệt",
  event_rejected: "Sự kiện bị từ chối",
  payment_success: "Thanh toán",
  event_reminder: "Nhắc lịch",
  withdrawal: "Rút tiền",
  system: "Hệ thống",
}

export const NOTIFICATIONS_SEED: AppNotification[] = [
  {
    id: "ntf-1",
    type: "payment_success",
    title: "Thanh toán thành công",
    message:
      "Bạn đã mua thành công 2 vé Standard cho sự kiện “Lễ hội Âm nhạc Mùa Hè Sài Gòn”. Vé điện tử kèm mã QR đã sẵn sàng trong mục Vé của tôi; hóa đơn đã được gửi tới email của bạn.",
    createdAt: "2026-07-04T09:12:00Z",
    href: "/ve-cua-toi",
  },
  {
    id: "ntf-2",
    type: "event_reminder",
    title: "Sự kiện diễn ra ngày mai",
    message:
      "“Workshop Khởi nghiệp Sáng tạo 2026” sẽ bắt đầu lúc 08:00 ngày mai tại Dreamplex Coworking, Quận 1. Hãy đến sớm 15 phút và chuẩn bị sẵn mã QR để check-in nhanh chóng.",
    createdAt: "2026-07-03T18:00:00Z",
    href: "/ve-cua-toi",
  },
  {
    id: "ntf-3",
    type: "event_approved",
    title: "Sự kiện của bạn đã được duyệt",
    message:
      "Sự kiện “Đêm nhạc Acoustic Trịnh Công Sơn” đã được Quản trị viên phê duyệt và công bố trên trang khám phá. Bạn có thể theo dõi số liệu bán vé trong Trung tâm tổ chức.",
    createdAt: "2026-07-02T15:40:00Z",
    href: "/organizer",
  },
  {
    id: "ntf-4",
    type: "withdrawal",
    title: "Yêu cầu rút tiền đang xử lý",
    message:
      "Yêu cầu rút 25.000.000đ của bạn đã được tiếp nhận và đang chờ đối soát. Thời gian xử lý dự kiến 3–5 ngày làm việc kể từ khi sự kiện kết thúc.",
    createdAt: "2026-07-01T10:05:00Z",
  },
  {
    id: "ntf-5",
    type: "event_rejected",
    title: "Sự kiện cần bổ sung hồ sơ",
    message:
      "Sự kiện “Đêm diễn hài kịch” bị từ chối: thiếu giấy phép biểu diễn do Sở VH-TT cấp. Vui lòng bổ sung hồ sơ trong bước Logistics & Giấy phép rồi gửi duyệt lại.",
    createdAt: "2026-06-30T08:30:00Z",
    href: "/organizer",
  },
  {
    id: "ntf-6",
    type: "system",
    title: "Chào mừng bạn đến với EventBox",
    message:
      "Khám phá các sự kiện nổi bật, lưu sự kiện yêu thích và đặt vé chỉ trong vài bước. Hoàn thiện hồ sơ cá nhân để nhận gợi ý sự kiện phù hợp hơn.",
    createdAt: "2026-06-28T12:00:00Z",
    href: "/su-kien",
  },
]
