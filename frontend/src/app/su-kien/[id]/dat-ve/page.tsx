import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Header from "@/components/home/Header"
import { SelectTicketsView } from "@/components/booking/SelectTicketsView"
import { findEventById, getEventDetail } from "@/lib/mockData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const event = findEventById(id)
  return { title: event ? `Chọn vé — ${event.title} | EventBox` : "Chọn vé | EventBox" }
}

/** Booking step 1 — /su-kien/[id]/dat-ve */
export default async function BookTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = findEventById(id)
  if (!event) notFound()

  const detail = getEventDetail(event)
  return (
    <>
      <Header />
      <SelectTicketsView event={event} tickets={detail.tickets} />
    </>
  )
}
