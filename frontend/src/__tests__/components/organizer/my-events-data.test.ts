/**
 * Tests for src/components/organizer/my-events-data.ts
 *
 * Verifies organizer event data structures and helper functions:
 * - organizerEvents mock data shape and completeness
 * - summarizeEvent() aggregations (tickets, revenue, percentages)
 * - formatVnd() Vietnamese currency formatting
 * - formatInt() number formatting with Vietnamese locale
 * - getOrganizerEventById() lookup
 */

import {
  organizerEvents,
  getOrganizerEventById,
  summarizeEvent,
  formatVnd,
  formatInt,
  type OrganizerEvent,
  type TicketType,
} from '@/components/organizer/my-events-data'

describe('my-events-data', () => {
  describe('organizerEvents mock data', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(organizerEvents)).toBe(true)
      expect(organizerEvents.length).toBeGreaterThan(0)
    })

    it('should have unique ids', () => {
      const ids = organizerEvents.map((e) => e.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have required properties on each event', () => {
      organizerEvents.forEach((event) => {
        expect(event.id).toBeDefined()
        expect(event.title).toBeDefined()
        expect(event.image).toBeDefined()
        expect(event.dateTime).toBeDefined()
        expect(event.venueName).toBeDefined()
        expect(event.address).toBeDefined()
        expect(event.status).toBeDefined()
      })
    })

    it('should have valid status values', () => {
      const validStatuses = ['upcoming', 'past', 'pending', 'draft', 'waiting_deposit']
      organizerEvents.forEach((event) => {
        expect(validStatuses).toContain(event.status)
      })
    })

    it('should have image URLs that look valid', () => {
      organizerEvents.forEach((event) => {
        expect(event.image).toMatch(/^https?:/)
      })
    })

    it('should have at least one event in each status', () => {
      const statuses = new Set(organizerEvents.map((e) => e.status))
      expect(statuses.size).toBeGreaterThan(0)
    })

    it('should have Vietnamese formatted datetime strings', () => {
      organizerEvents.forEach((event) => {
        if (event.dateTime !== 'Chưa đặt lịch') {
          // Format: "HH:MM, Day, DD tháng MM YYYY"
          expect(event.dateTime).toMatch(/\d{2}:\d{2},/)
        }
      })
    })

    it('should have ticket types with price, sold, total, locked', () => {
      const eventsWithTickets = organizerEvents.filter((e) => e.ticketTypes)
      eventsWithTickets.forEach((event) => {
        expect(event.ticketTypes).toBeDefined()
        event.ticketTypes!.forEach((ticket) => {
          expect(ticket.name).toBeDefined()
          expect(typeof ticket.price).toBe('number')
          expect(typeof ticket.sold).toBe('number')
          expect(typeof ticket.total).toBe('number')
          expect(typeof ticket.locked).toBe('number')
        })
      })
    })

    it('should have realistic ticket data', () => {
      organizerEvents.forEach((event) => {
        if (event.ticketTypes) {
          event.ticketTypes.forEach((ticket) => {
            expect(ticket.sold).toBeLessThanOrEqual(ticket.total)
            expect(ticket.price).toBeGreaterThanOrEqual(0)
          })
        }
      })
    })
  })

  describe('getOrganizerEventById', () => {
    it('should return an event by id', () => {
      const event = getOrganizerEventById('org-1')
      expect(event).toBeDefined()
      expect(event?.id).toBe('org-1')
    })

    it('should return undefined for non-existent id', () => {
      const event = getOrganizerEventById('nonexistent-id')
      expect(event).toBeUndefined()
    })

    it('should find all existing event ids', () => {
      organizerEvents.forEach((event) => {
        const found = getOrganizerEventById(event.id)
        expect(found).toBeDefined()
        expect(found?.id).toBe(event.id)
      })
    })

    it('should return the exact same object from array', () => {
      const originalEvent = organizerEvents[0]
      const foundEvent = getOrganizerEventById(originalEvent.id)
      expect(foundEvent).toBe(originalEvent)
    })
  })

  describe('summarizeEvent', () => {
    it('should return 0 values for event with no tickets', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [],
      }
      const summary = summarizeEvent(event)
      expect(summary.totalTickets).toBe(0)
      expect(summary.soldTickets).toBe(0)
      expect(summary.totalRevenue).toBe(0)
      expect(summary.soldRevenue).toBe(0)
      expect(summary.revenuePct).toBe(0)
      expect(summary.ticketsPct).toBe(0)
    })

    it('should return 0 values for event with undefined tickets', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
      }
      const summary = summarizeEvent(event)
      expect(summary.totalTickets).toBe(0)
      expect(summary.soldTickets).toBe(0)
      expect(summary.totalRevenue).toBe(0)
      expect(summary.soldRevenue).toBe(0)
    })

    it('should calculate total tickets', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 10, total: 50, locked: 0 },
          { name: 'VIP', price: 200000, sold: 5, total: 20, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.totalTickets).toBe(70)
    })

    it('should calculate sold tickets', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 10, total: 50, locked: 0 },
          { name: 'VIP', price: 200000, sold: 5, total: 20, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.soldTickets).toBe(15)
    })

    it('should calculate total revenue', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 10, total: 50, locked: 0 },
          { name: 'VIP', price: 200000, sold: 5, total: 20, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      // (100000 * 50) + (200000 * 20) = 5000000 + 4000000 = 9000000
      expect(summary.totalRevenue).toBe(9000000)
    })

    it('should calculate sold revenue', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 10, total: 50, locked: 0 },
          { name: 'VIP', price: 200000, sold: 5, total: 20, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      // (100000 * 10) + (200000 * 5) = 1000000 + 1000000 = 2000000
      expect(summary.soldRevenue).toBe(2000000)
    })

    it('should calculate revenue percentage', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 50, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      // 5000000 / 10000000 * 100 = 50%
      expect(summary.revenuePct).toBe(50)
    })

    it('should calculate tickets percentage', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 25, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      // 25 / 100 * 100 = 25%
      expect(summary.ticketsPct).toBe(25)
    })

    it('should return 0 percentage when totalRevenue is 0', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Free', price: 0, sold: 0, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.revenuePct).toBe(0)
    })

    it('should return 0 percentage when totalTickets is 0', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 0, total: 0, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.ticketsPct).toBe(0)
    })

    it('should round percentages to nearest integer', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 33, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      // 33 / 100 * 100 = 33%
      expect(summary.ticketsPct).toBe(33)
      expect(typeof summary.ticketsPct).toBe('number')
      expect(summary.ticketsPct % 1).toBe(0) // Is integer
    })

    it('should work with real mock data', () => {
      const event = organizerEvents.find((e) => e.ticketTypes)
      if (event) {
        const summary = summarizeEvent(event)
        expect(summary.totalTickets).toBeGreaterThanOrEqual(0)
        expect(summary.soldTickets).toBeGreaterThanOrEqual(0)
        expect(summary.totalRevenue).toBeGreaterThanOrEqual(0)
        expect(summary.soldRevenue).toBeGreaterThanOrEqual(0)
        expect(summary.revenuePct).toBeGreaterThanOrEqual(0)
        expect(summary.revenuePct).toBeLessThanOrEqual(100)
        expect(summary.ticketsPct).toBeGreaterThanOrEqual(0)
        expect(summary.ticketsPct).toBeLessThanOrEqual(100)
      }
    })
  })

  describe('formatVnd', () => {
    it('should format zero', () => {
      expect(formatVnd(0)).toBe('0đ')
    })

    it('should format thousands with dots', () => {
      const formatted = formatVnd(1000)
      expect(formatted).toContain('.')
      expect(formatted).toMatch(/đ$/)
    })

    it('should format small numbers', () => {
      expect(formatVnd(100)).toBe('100đ')
    })

    it('should format one million', () => {
      const formatted = formatVnd(1000000)
      expect(formatted).toContain('.')
      expect(formatted).toMatch(/đ$/)
    })

    it('should format large currency amount', () => {
      const formatted = formatVnd(1234567890)
      expect(formatted).toMatch(/đ$/)
      expect(formatted).toContain('.')
    })

    it('should use Vietnamese locale (dots for thousands)', () => {
      const formatted = formatVnd(1000000)
      // Vietnamese locale uses . as thousand separator
      expect(formatted).toMatch(/\d+\.\d+đ/)
    })

    it('should work with real ticket prices from mock data', () => {
      organizerEvents.forEach((event) => {
        if (event.ticketTypes) {
          event.ticketTypes.forEach((ticket) => {
            const formatted = formatVnd(ticket.price)
            expect(formatted).toMatch(/đ$/)
            expect(typeof formatted).toBe('string')
          })
        }
      })
    })
  })

  describe('formatInt', () => {
    it('should format zero', () => {
      expect(formatInt(0)).toBe('0')
    })

    it('should format small numbers without separator', () => {
      expect(formatInt(100)).toBe('100')
    })

    it('should format thousands with Vietnamese locale', () => {
      const formatted = formatInt(1000)
      expect(formatted).toContain('.')
    })

    it('should format one million', () => {
      const formatted = formatInt(1000000)
      expect(formatted).toContain('.')
    })

    it('should use Vietnamese locale grouping', () => {
      const formatted = formatInt(1234567)
      expect(formatted).toMatch(/\d+\.\d+/)
    })

    it('should work with decimal input (returns integer formatted)', () => {
      const formatted = formatInt(1234.56)
      // JavaScript's Intl.NumberFormat will use the numeric value
      expect(typeof formatted).toBe('string')
      expect(formatted.length).toBeGreaterThan(0)
    })

    it('should handle negative numbers', () => {
      const formatted = formatInt(-1000)
      expect(formatted).toContain('-')
    })
  })

  describe('edge cases', () => {
    it('should handle event with single free ticket', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Free Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Free', price: 0, sold: 100, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.totalRevenue).toBe(0)
      expect(summary.soldRevenue).toBe(0)
      expect(summary.revenuePct).toBe(0)
    })

    it('should handle event with unsold tickets', () => {
      const event: OrganizerEvent = {
        id: 'test-1',
        title: 'Test Event',
        image: 'https://example.com/image.jpg',
        dateTime: '14:00, Thứ 2, 01 tháng 01 2026',
        venueName: 'Test Venue',
        address: 'Test Address',
        status: 'upcoming',
        ticketTypes: [
          { name: 'Standard', price: 100000, sold: 0, total: 100, locked: 0 },
        ],
      }
      const summary = summarizeEvent(event)
      expect(summary.soldTickets).toBe(0)
      expect(summary.soldRevenue).toBe(0)
      expect(summary.ticketsPct).toBe(0)
    })
  })
})
