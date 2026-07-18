import { redirect } from "next/navigation"

/**
 * Route cũ được giữ để bookmark không bị lỗi. Theo dõi trạng thái đã được
 * hợp nhất vào danh sách Quản trị sự kiện.
 */
export default function EventStatusRedirectPage() {
  redirect("/dashboard/events")
}
