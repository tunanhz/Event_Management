"use client"

import { Image as ImageIcon } from "lucide-react"
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager"
import { bannerApi, type Banner } from "@/lib/admin-content-api"

const fields: FieldConfig[] = [
  { key: "title", label: "Tiêu đề", type: "text", required: true, placeholder: "Đại Nhạc Hội Quốc Tế 2026" },
  { key: "subtitle", label: "Mô tả ngắn", type: "textarea", placeholder: "Trải nghiệm âm nhạc đỉnh cao…" },
  { key: "imageUrl", label: "Ảnh banner (URL)", type: "image", required: true, placeholder: "https://…" },
  { key: "ctaLabel", label: "Nhãn nút CTA", type: "text", placeholder: "Mua vé ngay" },
  { key: "linkUrl", label: "Link CTA", type: "text", placeholder: "/su-kien hoặc https://…" },
  { key: "order", label: "Thứ tự", type: "number", placeholder: "0" },
  { key: "isActive", label: "Đang hiển thị", type: "boolean" },
]

/** Admin — quản lý hero banner trang chủ (/dashboard/banners). */
export default function BannersPage() {
  return (
    <ResourceManager<Banner>
      title="Hero banner"
      description="Carousel banner lớn ở đầu trang chủ (chỉ banner “đang hiển thị” lên public)."
      icon={ImageIcon}
      api={bannerApi}
      fields={fields}
      emptyItem={{ title: "", subtitle: "", imageUrl: "", ctaLabel: "", linkUrl: "", order: 0, isActive: true }}
      labelOf={(b) => b.title}
    />
  )
}
