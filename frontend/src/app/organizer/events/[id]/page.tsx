import { redirect } from "next/navigation"

/** Bare event route → default to the overview section. */
export default async function EventManageIndex({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/organizer/events/${id}/summary`)
}
