import type { Metadata } from "next"
import { ModerationDetailView } from "@/components/moderation/ModerationDetailView"

export const metadata: Metadata = {
  title: "Thẩm định sự kiện | EventBox",
  description: "Panel thẩm định hồ sơ sự kiện cho quản trị viên: thông tin, loại vé, hồ sơ pháp lý.",
}

/** Admin moderation detail — /dashboard/moderation/[id]. Data is fetched
 *  client-side (auth cookie) by ModerationDetailView from /api/admin/events/:id. */
export default async function ModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ModerationDetailView eventId={id} />
}
