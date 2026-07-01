import { notFound } from "next/navigation"
import { getOrganizerEventById } from "@/components/organizer/my-events-data"
import { SetOrganizerTitle } from "@/components/organizer/SetOrganizerTitle"
import styles from "@/components/organizer/manage/event-manage.module.css"

/** Shell for a single event's management workspace (sidebar lives in the parent
 *  organizer layout, which swaps to the event nav for these routes). */
export default async function EventManageLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = getOrganizerEventById(id)
  if (!event) notFound()

  return (
    <div className={styles.wrap}>
      <SetOrganizerTitle title={event.title} />
      {children}
    </div>
  )
}
