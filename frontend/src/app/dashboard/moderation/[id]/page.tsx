import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getModerationDetailById } from "@/components/moderation/moderation-detail-data"
import { ModerationDetailView } from "@/components/moderation/ModerationDetailView"

export const metadata: Metadata = {
  title: "Thẩm định sự kiện | EventBox",
  description: "Panel thẩm định hồ sơ sự kiện cho quản trị viên: thông tin, loại vé, hồ sơ pháp lý.",
}

/** Admin moderation detail — /dashboard/moderation/[id]. */
export default async function ModerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = getModerationDetailById(id)
  if (!detail) notFound()

  return <ModerationDetailView key={detail.id} detail={detail} />
}
