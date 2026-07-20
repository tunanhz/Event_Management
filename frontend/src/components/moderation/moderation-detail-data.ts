import { mockModerationEvents } from "@/lib/mock-data"
import type { ModerationEvent } from "@/types"

// Chi tiết hồ sơ duyệt sự kiện (mock) — mở rộng ModerationEvent với dữ liệu
// mà Admin cần thẩm định: mô tả, lịch, sức chứa, loại vé, hồ sơ pháp lý.
export interface ModerationTicketType {
  /** Backend ticket _id — absent for mock data, present for API-loaded events. */
  id?: string
  name: string
  price: number
  quantity: number
  saleStart: string
  saleEnd: string
}

export interface ModerationDocument {
  name: string
  type: "permit" | "contract" | "proposal"
  sizeKb: number
  url?: string
}

export interface ModerationEventDetail extends ModerationEvent {
  description: string
  startDate: string
  endDate: string
  capacity: number
  organizerEmail: string
  organizerPhone: string
  tickets: ModerationTicketType[]
  documents: ModerationDocument[]
  rejectionReason?: string
  // Service & deposit fields (quotation workflow)
  logisticsServices?: string[]
  serviceCost?: number
  depositAmount?: number
  depositStatus?: "UNPAID" | "PAID"
  additionalCost?: number
  finalPaymentAmount?: number
  finalPaymentStatus?: "UNPAID" | "PAID"
  // Raw backend reviewStatus (for distinguishing APPROVED_WAITING_DEPOSIT)
  reviewStatus?: string
  // Contract info
  contract?: {
    repName?: string
    signatureUrl?: string
    agreedToTerms?: boolean
    serviceDepositAgreed?: boolean
  }
}

const DETAIL_EXTRAS: Record<string, Omit<ModerationEventDetail, keyof ModerationEvent>> = {
  "mod-1": {
    description:
      "Đêm nhạc acoustic tưởng nhớ nhạc sĩ Trịnh Công Sơn với sự tham gia của các ca sĩ trẻ. Chương trình kéo dài 3 giờ, phục vụ khán giả mọi lứa tuổi.",
    startDate: "2026-08-01T19:30:00Z",
    endDate: "2026-08-01T22:30:00Z",
    capacity: 1200,
    organizerEmail: "contact@sgmusicgroup.vn",
    organizerPhone: "028 3822 1234",
    tickets: [
      { name: "Standard", price: 350000, quantity: 800, saleStart: "2026-07-05T00:00:00Z", saleEnd: "2026-08-01T12:00:00Z" },
      { name: "VIP", price: 750000, quantity: 300, saleStart: "2026-07-05T00:00:00Z", saleEnd: "2026-08-01T12:00:00Z" },
      { name: "VVIP (gặp nghệ sĩ)", price: 1500000, quantity: 100, saleStart: "2026-07-05T00:00:00Z", saleEnd: "2026-07-25T12:00:00Z" },
    ],
    documents: [
      { name: "giay-phep-bieu-dien-so-vhtt.pdf", type: "permit", sizeKb: 842 },
      { name: "hop-dong-thue-nha-hat-hoa-binh.pdf", type: "contract", sizeKb: 1260 },
      { name: "kich-ban-chuong-trinh.docx", type: "proposal", sizeKb: 355 },
    ],
  },
  "mod-2": {
    description:
      "Hội thảo nửa ngày về tác động của AI tới thị trường lao động, gồm 2 phiên keynote và 1 phiên thảo luận bàn tròn với chuyên gia.",
    startDate: "2026-08-10T08:00:00Z",
    endDate: "2026-08-10T12:00:00Z",
    capacity: 500,
    organizerEmail: "hello@techtalk.vn",
    organizerPhone: "024 3868 8888",
    tickets: [
      { name: "Vé miễn phí (sinh viên)", price: 0, quantity: 300, saleStart: "2026-07-10T00:00:00Z", saleEnd: "2026-08-09T17:00:00Z" },
      { name: "Vé thường", price: 150000, quantity: 200, saleStart: "2026-07-10T00:00:00Z", saleEnd: "2026-08-09T17:00:00Z" },
    ],
    documents: [
      { name: "cong-van-dong-y-cua-truong.pdf", type: "permit", sizeKb: 512 },
      { name: "de-cuong-noi-dung-hoi-thao.pdf", type: "proposal", sizeKb: 980 },
    ],
  },
  "mod-3": {
    description:
      "Giải chạy gây quỹ từ thiện cự ly 5km/10km/21km quanh Hồ Tây, dự kiến 3.000 vận động viên, toàn bộ lợi nhuận ủng hộ quỹ trẻ em vùng cao.",
    startDate: "2026-09-13T05:00:00Z",
    endDate: "2026-09-13T11:00:00Z",
    capacity: 3000,
    organizerEmail: "info@runforlife.vn",
    organizerPhone: "024 3993 4455",
    tickets: [
      { name: "5km Fun Run", price: 250000, quantity: 1500, saleStart: "2026-07-15T00:00:00Z", saleEnd: "2026-09-06T23:59:00Z" },
      { name: "10km", price: 400000, quantity: 1000, saleStart: "2026-07-15T00:00:00Z", saleEnd: "2026-09-06T23:59:00Z" },
      { name: "21km Half Marathon", price: 600000, quantity: 500, saleStart: "2026-07-15T00:00:00Z", saleEnd: "2026-09-06T23:59:00Z" },
    ],
    documents: [
      { name: "giay-phep-su-dung-duong-chay-q-tay-ho.pdf", type: "permit", sizeKb: 1105 },
      { name: "phuong-an-an-ninh-y-te.pdf", type: "proposal", sizeKb: 2240 },
      { name: "hop-dong-doi-tac-nuoc-uong.pdf", type: "contract", sizeKb: 640 },
    ],
  },
  "mod-4": {
    description: "Triển lãm 120 tác phẩm nhiếp ảnh đường phố của 24 tác giả, mở cửa tự do 10 ngày.",
    startDate: "2026-07-18T09:00:00Z",
    endDate: "2026-07-28T21:00:00Z",
    capacity: 400,
    organizerEmail: "team@urbanlens.vn",
    organizerPhone: "028 3910 2020",
    tickets: [
      { name: "Vé vào cửa", price: 80000, quantity: 400, saleStart: "2026-07-01T00:00:00Z", saleEnd: "2026-07-28T18:00:00Z" },
    ],
    documents: [
      { name: "giay-phep-trien-lam-so-vhtt-hcm.pdf", type: "permit", sizeKb: 730 },
      { name: "hop-dong-thue-khong-gian-the-factory.pdf", type: "contract", sizeKb: 890 },
    ],
  },
  "mod-5": {
    description: "Lễ hội ẩm thực đường phố 3 ngày với 60 gian hàng, khu trò chơi và sân khấu nhạc sống ven biển Mỹ Khê.",
    startDate: "2026-07-24T15:00:00Z",
    endDate: "2026-07-26T23:00:00Z",
    capacity: 8000,
    organizerEmail: "booking@danangevents.vn",
    organizerPhone: "0236 3777 999",
    tickets: [
      { name: "Vé vào cổng", price: 50000, quantity: 8000, saleStart: "2026-07-01T00:00:00Z", saleEnd: "2026-07-26T20:00:00Z" },
    ],
    documents: [
      { name: "giay-phep-to-chuc-le-hoi-ubnd-da-nang.pdf", type: "permit", sizeKb: 1320 },
      { name: "phuong-an-ve-sinh-atvstp.pdf", type: "proposal", sizeKb: 1710 },
    ],
  },
  "mod-6": {
    description: "Đêm diễn hài kịch tổng hợp. Hồ sơ thiếu giấy phép biểu diễn và kịch bản có nội dung chưa phù hợp quy định nền tảng.",
    startDate: "2026-07-30T20:00:00Z",
    endDate: "2026-07-30T22:30:00Z",
    capacity: 350,
    organizerEmail: "comedy@nightco.vn",
    organizerPhone: "028 3833 5566",
    tickets: [
      { name: "Vé thường", price: 200000, quantity: 350, saleStart: "2026-07-10T00:00:00Z", saleEnd: "2026-07-30T18:00:00Z" },
    ],
    documents: [{ name: "kich-ban-chuong-trinh.docx", type: "proposal", sizeKb: 410 }],
    rejectionReason:
      "Thiếu giấy phép biểu diễn nghệ thuật do Sở VH-TT cấp; kịch bản chứa nội dung chưa phù hợp quy định nền tảng. Vui lòng bổ sung giấy phép và điều chỉnh kịch bản trước khi gửi lại.",
  },
}

export const DOCUMENT_TYPE_LABELS: Record<ModerationDocument["type"], string> = {
  permit: "Giấy phép",
  contract: "Hợp đồng",
  proposal: "Hồ sơ/Kịch bản",
}

export function getModerationDetailById(id: string): ModerationEventDetail | undefined {
  const base = mockModerationEvents.find((e) => e.id === id)
  const extras = DETAIL_EXTRAS[id]
  if (!base || !extras) return undefined
  return { ...base, ...extras }
}
