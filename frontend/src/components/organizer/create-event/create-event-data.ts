/**
 * Types, constants and default content for the organizer "Create Event" wizard.
 * Kept dependency-free so both server and client components can import it.
 */

export type WizardStep = 1 | 2 | 3 | 4
export type LocationType = "offline" | "online"

export interface CreateEventForm {
  /** Poster shown across the platform (portrait 720x958). Object URL for preview. */
  posterImage: string | null
  /** Wide cover/banner (landscape 1280x720). Object URL for preview. */
  bannerImage: string | null
  name: string
  locationType: LocationType
  venueName: string
  province: string
  ward: string
  street: string
  category: string
  /** Rich-text HTML from the description editor. */
  description: string
  orgLogo: string | null
  orgName: string
  orgInfo: string
}

/** Character limits mirrored from the reference UI. */
export const LIMITS = {
  name: 100,
  venueName: 80,
  street: 80,
  orgName: 80,
  orgInfo: 500,
} as const

export const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: "Thông tin sự kiện" },
  { id: 2, label: "Thời gian & Loại vé" },
  { id: 3, label: "Cài đặt" },
  { id: 4, label: "Thông tin thanh toán" },
]

export const EVENT_CATEGORIES = [
  "Nhạc sống",
  "Sân khấu & Nghệ thuật",
  "Thể thao",
  "Hội thảo & Workshop",
  "Triển lãm",
  "Khác",
]

export const PROVINCES = [
  "Hà Nội",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hải Phòng",
  "Cần Thơ",
  "An Giang",
  "Bà Rịa - Vũng Tàu",
  "Bình Dương",
  "Bình Định",
  "Đồng Nai",
  "Khánh Hòa",
  "Lâm Đồng",
  "Nghệ An",
  "Quảng Ninh",
  "Thừa Thiên Huế",
]

/**
 * Sample wards for the most common cities; other provinces fall back to a
 * generic centre option. Enough for a realistic dependent-select without
 * bundling the full administrative dataset.
 */
const WARDS_BY_PROVINCE: Record<string, string[]> = {
  "Hà Nội": ["Phường Hàng Bạc", "Phường Cửa Nam", "Phường Kim Mã", "Phường Dịch Vọng"],
  "TP. Hồ Chí Minh": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Đa Kao", "Phường Tân Định"],
  "Đà Nẵng": ["Phường Hải Châu 1", "Phường Thạch Thang", "Phường Thanh Bình"],
}

export function getWards(province: string): string[] {
  if (!province) return []
  return WARDS_BY_PROVINCE[province] ?? ["Phường trung tâm", "Phường lân cận"]
}

/** Pre-filled description template shown in the reference editor. */
export const DEFAULT_DESCRIPTION_HTML = `<p><strong>Giới thiệu sự kiện:</strong></p>
<p>[Tóm tắt ngắn gọn về sự kiện: Nội dung chính của sự kiện, điểm đặc sắc nhất và lý do khiến người tham gia không nên bỏ lỡ]</p>
<p><strong>Chi tiết sự kiện:</strong></p>
<ul>
<li><strong>Chương trình chính:</strong> [Liệt kê những hoạt động nổi bật trong sự kiện: các phần trình diễn, khách mời đặc biệt, lịch trình các tiết mục cụ thể nếu có.]</li>
<li><strong>Khách mời:</strong> [Thông tin về các khách mời đặc biệt, nghệ sĩ, diễn giả sẽ tham gia sự kiện.]</li>
<li><strong>Trải nghiệm đặc biệt:</strong> [Nếu có các hoạt động đặc biệt khác như workshop, khu trải nghiệm, photo booth, khu vực check-in hay các phần quà/ưu đãi dành riêng cho người tham dự.]</li>
</ul>
<p><strong>Điều khoản và điều kiện:</strong></p>
<p>[TnC] sự kiện</p>
<p>Lưu ý về điều khoản trẻ em</p>
<p>Lưu ý về điều khoản VAT</p>`

export const INITIAL_FORM: CreateEventForm = {
  posterImage: null,
  bannerImage: null,
  name: "",
  locationType: "offline",
  venueName: "",
  province: "",
  ward: "",
  street: "",
  category: "",
  description: DEFAULT_DESCRIPTION_HTML,
  orgLogo: null,
  orgName: "",
  orgInfo: "",
}
