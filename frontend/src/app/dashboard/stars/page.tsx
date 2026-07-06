"use client"

import { Star as StarIcon } from "lucide-react"
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager"
import { starApi, type Star } from "@/lib/admin-content-api"

const fields: FieldConfig[] = [
  { key: "name", label: "Tên nghệ sĩ / đơn vị", type: "text", required: true, placeholder: "Mỹ Tâm" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "my-tam", help: "Chữ thường, không dấu, phân tách bằng dấu gạch ngang." },
  { key: "imageUrl", label: "Ảnh đại diện (URL)", type: "image", required: true, placeholder: "https://…" },
  { key: "verified", label: "Đã xác minh", type: "boolean" },
  { key: "order", label: "Thứ tự", type: "number", placeholder: "0" },
]

/** Admin — quản lý nghệ sĩ / đơn vị nổi bật (/dashboard/stars). */
export default function StarsPage() {
  return (
    <ResourceManager<Star>
      title="Nghệ sĩ nổi bật"
      description="Carousel “Featured Stars” hiển thị ở trang chủ."
      icon={StarIcon}
      api={starApi}
      fields={fields}
      emptyItem={{ name: "", slug: "", imageUrl: "", verified: false, order: 0 }}
      labelOf={(s) => s.name}
    />
  )
}
