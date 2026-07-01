/**
 * Terms shown on the "Điều khoản cho Ban tổ chức" page.
 *
 * Single source of truth for the list — an admin adds a new section by
 * appending an entry (unique `id`, `title`, `fileName`, `pdfUrl`). Each term
 * links to a PDF opened in the in-app viewer at /organizer/terms/<id>.
 *
 * PDFs live in `public/terms/`; the current files are placeholders — replace
 * them with the official documents (keep the same filenames or update `pdfUrl`).
 */
export interface OrganizerTerm {
  id: string
  title: string
  /** Human-readable file name shown in the viewer header. */
  fileName: string
  /** Public path to the PDF (served from public/). */
  pdfUrl: string
}

export const ORGANIZER_TERMS: OrganizerTerm[] = [
  {
    id: "danh-muc-cam-kinh-doanh",
    title: "Danh mục hàng hoá, dịch vụ cấm kinh doanh",
    fileName: "Danh mục hàng hoá, dịch vụ cấm kinh doanh.pdf",
    pdfUrl: "/terms/danh-muc-cam-kinh-doanh.pdf",
  },
  {
    id: "danh-muc-cam-quang-cao",
    title: "Danh mục hàng hóa, dịch vụ cấm quảng cáo",
    fileName: "Danh mục hàng hóa, dịch vụ cấm quảng cáo.pdf",
    pdfUrl: "/terms/danh-muc-cam-quang-cao.pdf",
  },
  {
    id: "quy-dinh-kiem-duyet",
    title: "Quy định kiểm duyệt nội dung & hình ảnh",
    fileName: "Quy định kiểm duyệt nội dung & hình ảnh.pdf",
    pdfUrl: "/terms/quy-dinh-kiem-duyet.pdf",
  },
]

export function getTermById(id: string): OrganizerTerm | undefined {
  return ORGANIZER_TERMS.find((t) => t.id === id)
}
