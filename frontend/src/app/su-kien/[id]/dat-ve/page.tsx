import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Header from "@/components/home/Header"
import { SelectTicketsView } from "@/components/booking/SelectTicketsView"
import { fetchEventDetail } from "@/lib/discovery-api"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const detail = await fetchEventDetail(id)
  return { title: detail ? `Chọn vé — ${detail.event.title} | EventBox` : "Chọn vé | EventBox" }
}

/** Booking step 1 — /su-kien/[id]/dat-ve */
export default async function BookTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await fetchEventDetail(id)
  if (!detail) notFound()

  return (
    <>
      <Header />
      <SelectTicketsView event={detail.event} tickets={detail.tickets} />
    </>
  )
}
