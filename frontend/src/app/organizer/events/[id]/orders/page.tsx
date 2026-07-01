import { Receipt } from "lucide-react"
import { ManageSectionEmpty } from "@/components/organizer/manage/ManageSectionEmpty"

/** Orders ("Đơn hàng"): purchase orders for the event. */
export default function EventOrdersPage() {
  return (
    <ManageSectionEmpty
      Icon={Receipt}
      title="Chưa có đơn hàng"
      text="Các đơn đặt vé sẽ hiển thị ở đây ngay khi khách hàng hoàn tất thanh toán."
    />
  )
}
