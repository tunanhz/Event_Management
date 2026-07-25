import { clientApi } from "@/lib/client-api"

jest.mock("@/lib/client-api", () => ({
  clientApi: { get: jest.fn() },
}))

import {
  fetchMyTickets,
  toUserTicket,
  type ApiRegistration,
} from "@/lib/booking-api"

const NOW = Date.parse("2026-07-25T10:00:00.000Z")

function registration(
  overrides: Partial<ApiRegistration> = {}
): ApiRegistration {
  return {
    _id: "64b000000000000000000001",
    eventId: {
      _id: "64b000000000000000000010",
      title: "Test Event",
      startDate: "2026-07-25T09:00:00.000Z",
      endDate: "2026-07-25T12:00:00.000Z",
      location: "Test Venue",
    },
    ticketId: {
      _id: "64b000000000000000000020",
      ticketName: "Standard",
    },
    quantity: 1,
    totalAmount: 100000,
    status: "PAID",
    checkedIn: false,
    createdAt: "2026-07-20T10:00:00.000Z",
    ...overrides,
  }
}

describe("Vé của tôi status mapping", () => {
  it("keeps an unchecked ticket upcoming after start but before the event ends", () => {
    expect(toUserTicket(registration(), NOW).status).toBe("upcoming")
  })

  it("marks a ticket used only after it has actually checked in", () => {
    expect(
      toUserTicket(registration({ checkedIn: true }), NOW).status
    ).toBe("used")
  })

  it("marks an unchecked ticket expired as soon as the event end time passes", () => {
    const ticket = registration({
      eventId: {
        _id: "64b000000000000000000010",
        title: "Ended Event",
        startDate: "2026-07-25T06:00:00.000Z",
        endDate: "2026-07-25T09:59:59.000Z",
      },
    })

    expect(toUserTicket(ticket, NOW).status).toBe("expired")
  })

  it("uses the ticket show window for a multi-show event", () => {
    const ticket = registration({
      eventId: {
        _id: "64b000000000000000000010",
        title: "Multi-show Event",
        startDate: "2026-07-25T06:00:00.000Z",
        endDate: "2026-07-25T18:00:00.000Z",
        shows: [
          {
            _id: "64b000000000000000000031",
            startTime: "2026-07-25T06:00:00.000Z",
            endTime: "2026-07-25T08:00:00.000Z",
          },
          {
            _id: "64b000000000000000000032",
            startTime: "2026-07-25T16:00:00.000Z",
            endTime: "2026-07-25T18:00:00.000Z",
          },
        ],
      },
      ticketId: {
        _id: "64b000000000000000000020",
        ticketName: "Morning Show",
        showId: "64b000000000000000000031",
      },
    })

    expect(toUserTicket(ticket, NOW).status).toBe("expired")
  })

  it("keeps cancelled registrations separate from expired tickets", () => {
    expect(
      toUserTicket(registration({ status: "REFUNDED" }), NOW).status
    ).toBe("cancelled")
  })
})

describe("fetchMyTickets", () => {
  // Regression test: Array.prototype.map invokes its callback with
  // (element, index, array) — passing `toUserTicket` straight to `.map`
  // let the array index leak into `toUserTicket`'s `now` parameter, which
  // made every ended event after index 0 register as "upcoming" instead
  // of "expired" (closesAt < now is false once now collapses to a tiny
  // array index instead of the real clock).
  it("does not let the array index leak into toUserTicket's now parameter", async () => {
    jest.spyOn(Date, "now").mockReturnValue(NOW)

    const endedRegistration = registration({
      _id: "64b000000000000000000002",
      eventId: {
        _id: "64b000000000000000000011",
        title: "Ended Event",
        startDate: "2026-07-25T06:00:00.000Z",
        endDate: "2026-07-25T09:00:00.000Z",
      },
    })

    // Put the ended registration at a non-zero index so a leaked index
    // (e.g. now=4) would make it look like "upcoming".
    const registrations = [registration(), registration(), registration(), registration(), endedRegistration]
    ;(clientApi.get as jest.Mock).mockResolvedValue({ data: registrations })

    const tickets = await fetchMyTickets()

    expect(tickets[4].status).toBe("expired")

    jest.restoreAllMocks()
  })
})
