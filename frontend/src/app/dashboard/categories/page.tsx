"use client"

import { Tag } from "lucide-react"
import { ResourceManager, type FieldConfig } from "@/components/admin/ResourceManager"
import { categoryApi, type Category } from "@/lib/admin-content-api"

const fields: FieldConfig[] = [
  { key: "name", label: "Tên danh mục", type: "text", required: true, placeholder: "Nhạc sống" },
  { key: "slug", label: "Slug", type: "text", required: true, placeholder: "nhac-song", help: "Chữ thường, không dấu, phân tách bằng dấu gạch ngang." },
  { key: "icon", label: "Icon", type: "emoji", required: true, placeholder: "🎵", help: "Một emoji đại diện cho danh mục." },
  { key: "order", label: "Thứ tự", type: "number", placeholder: "0" },
]

/** Admin — quản lý danh mục sự kiện (/dashboard/categories). */
export default function CategoriesPage() {
  return (
    <ResourceManager<Category>
      title="Danh mục sự kiện"
      description="Danh mục hiển thị ở thanh điều hướng và bộ lọc trang khám phá."
      icon={Tag}
      api={categoryApi}
      fields={fields}
      emptyItem={{ name: "", slug: "", icon: "", order: 0 }}
      labelOf={(c) => c.name}
    />
  )
}
