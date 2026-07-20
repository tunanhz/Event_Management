/**
 * Tests for src/components/organizer/create-event/map-event-to-form.ts
 *
 * Verifies round-trip conversion from server event detail to wizard form state:
 * - ISO → datetime-local conversion
 * - Nested show/ticket mapping
 * - Missing/null/undefined field handling
 * - Legacy flat event support (orphan tickets)
 */

import { mapDetailToForm } from '@/components/organizer/create-event/map-event-to-form'
import {
  type ServerEventDetail,
  type ServerEventFull,
  type ServerEventShow,
  type ServerEventTicket,
} from '@/components/organizer/organizer-event-detail-api'
import { INITIAL_FORM } from '@/components/organizer/create-event/create-event-data'

describe('map-event-to-form', () => {
  describe('ISO to datetime-local conversion', () => {
    it('should convert ISO timestamp when shows are explicitly provided', () => {
      const iso = '2026-07-21T14:30:00Z'
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          date: iso,
          shows: [
            {
              _id: 'show-1',
              startTime: iso,
              endTime: '2026-07-21T16:00:00Z',
            },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      // Check format YYYY-MM-DDTHH:mm (timezone may vary)
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('should handle missing date fields gracefully', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].startTime).toBe('')
    })

    it('should return empty string for invalid ISO', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          date: 'not-a-date',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].startTime).toBe('')
    })

    it('should preserve wall-clock time by converting to local when orphan tickets exist', () => {
      const iso = '2026-07-21T14:30:00Z'
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          date: iso,
          shows: [],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      // The datetime-local format should match the pattern YYYY-MM-DDTHH:mm
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe('show mapping', () => {
    it('should map shows with their id, title, times', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [
            {
              _id: 'show-1',
              title: 'Đêm 1',
              startTime: '2026-07-21T10:00:00Z',
              endTime: '2026-07-21T12:00:00Z',
            },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows).toHaveLength(1)
      expect(form.shows[0].id).toBe('show-1')
      expect(form.shows[0].title).toBe('Đêm 1')
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(form.shows[0].endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('should filter out shows without id', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [
            {
              title: 'No ID Show',
              startTime: '2026-07-21T10:00:00Z',
              endTime: '2026-07-21T12:00:00Z',
            },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows).toHaveLength(1) // fallback empty show created
    })

    it('should use startDate/endDate when available with orphan tickets', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          startDate: '2026-07-21T10:00:00Z',
          endDate: '2026-07-21T12:00:00Z',
          shows: [],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(form.shows[0].endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('should fall back to date when startDate/endDate missing for orphan tickets', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          date: '2026-07-21T14:30:00Z',
          shows: [],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })
  })

  describe('ticket mapping', () => {
    it('should map ticket fields correctly', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'VIP',
            price: 500000,
            quantity: 100,
            minPerOrder: 1,
            maxPerOrder: 5,
            description: 'VIP seat',
            image: '/uploads/images/vip.png',
            saleStart: '2026-07-20T00:00:00Z',
            saleEnd: '2026-07-21T23:59:59Z',
          },
        ],
      }
      const form = mapDetailToForm(detail)
      const ticket = form.shows[0].tickets[0]
      expect(ticket.id).toBe('ticket-1')
      expect(ticket.name).toBe('VIP')
      expect(ticket.price).toBe(500000)
      expect(ticket.isFree).toBe(false)
      expect(ticket.quantity).toBe(100)
      expect(ticket.minPerOrder).toBe(1)
      expect(ticket.maxPerOrder).toBe(5)
      expect(ticket.description).toBe('VIP seat')
      expect(ticket.image).toBe('/uploads/images/vip.png')
      expect(ticket.saleStart).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(ticket.saleEnd).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('should set isFree when price is 0', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Free',
            price: 0,
            quantity: 999,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      const ticket = form.shows[0].tickets[0]
      expect(ticket.isFree).toBe(true)
    })

    it('should default minPerOrder to 1 when missing', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets[0].minPerOrder).toBe(1)
    })

    it('should default maxPerOrder to 10 when missing', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets[0].maxPerOrder).toBe(10)
    })

    it('should default description to empty string when missing', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets[0].description).toBe('')
    })

    it('should default image to null when missing', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [{ _id: 'show-1' }],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets[0].image).toBeNull()
    })

    it('should group tickets by showId', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          shows: [
            { _id: 'show-1', title: 'Show 1' },
            { _id: 'show-2', title: 'Show 2' },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
          {
            _id: 'ticket-2',
            showId: 'show-2',
            ticketName: 'VIP',
            price: 500000,
            quantity: 50,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets).toHaveLength(1)
      expect(form.shows[0].tickets[0].name).toBe('Standard')
      expect(form.shows[1].tickets).toHaveLength(1)
      expect(form.shows[1].tickets[0].name).toBe('VIP')
    })
  })

  describe('legacy flat event support (orphan tickets)', () => {
    it('should handle tickets with no matching show (legacy flat event)', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Legacy Event',
          startDate: '2026-07-21T10:00:00Z',
          endDate: '2026-07-21T12:00:00Z',
          shows: undefined,
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows).toHaveLength(1)
      expect(form.shows[0].tickets).toHaveLength(1)
      expect(form.shows[0].tickets[0].name).toBe('Standard')
    })

    it('should synthesize show from event date range for orphan tickets', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Legacy Event',
          startDate: '2026-07-21T10:00:00Z',
          endDate: '2026-07-21T12:00:00Z',
          shows: [],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            ticketName: 'Standard',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
      expect(form.shows[0].endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('should append orphan tickets to first show if shows exist', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Mixed Event',
          shows: [
            { _id: 'show-1', title: 'Show 1', startTime: '2026-07-21T10:00:00Z', endTime: '2026-07-21T12:00:00Z' },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'show-1',
            ticketName: 'Ticket 1',
            price: 100000,
            quantity: 100,
          },
          {
            _id: 'ticket-2',
            ticketName: 'Orphan Ticket',
            price: 50000,
            quantity: 50,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets).toHaveLength(2)
      expect(form.shows[0].tickets[0].name).toBe('Ticket 1')
      expect(form.shows[0].tickets[1].name).toBe('Orphan Ticket')
    })

    it('should handle ticket with unknown showId as orphan', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Mixed Event',
          shows: [
            { _id: 'show-1', title: 'Show 1', startTime: '2026-07-21T10:00:00Z', endTime: '2026-07-21T12:00:00Z' },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [
          {
            _id: 'ticket-1',
            showId: 'unknown-show',
            ticketName: 'Unknown Show Ticket',
            price: 100000,
            quantity: 100,
          },
        ],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows[0].tickets).toHaveLength(1)
      expect(form.shows[0].tickets[0].name).toBe('Unknown Show Ticket')
    })
  })

  describe('event field mapping', () => {
    it('should map all basic event fields', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test Event',
          description: 'Event description',
          posterImage: '/uploads/poster.png',
          banner: '/uploads/banner.png',
          imageUrl: '/uploads/image.png',
          locationType: 'offline',
          venue: {
            name: 'Test Venue',
            province: 'HCM',
            ward: 'Q1',
            street: '123 Main St',
          },
          categoryId: 'cat-1',
          organizer: 'Test Organizer',
          organizerLogoUrl: '/uploads/logo.png',
          organizerDescription: 'Org description',
          slug: 'test-event',
          privacy: 'public',
          confirmationMessage: 'Thank you!',
          logisticsServices: ['service-1', 'service-2'],
          permitDocuments: [
            { name: 'permit.pdf', url: '/uploads/permit.pdf', sizeKb: 500 },
          ],
          contract: {
            repName: 'John Doe',
            agreed: true,
            signatureUrl: '/uploads/signature.png',
          },
          paymentInfo: {
            bankName: 'Vietcombank',
            accountNumber: '123456789',
            accountHolder: 'Jane Doe',
          },
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.name).toBe('Test Event')
      expect(form.description).toBe('Event description')
      expect(form.posterImage).toBe('/uploads/poster.png')
      expect(form.bannerImage).toBe('/uploads/banner.png')
      expect(form.locationType).toBe('offline')
      expect(form.venueName).toBe('Test Venue')
      expect(form.province).toBe('HCM')
      expect(form.ward).toBe('Q1')
      expect(form.street).toBe('123 Main St')
      expect(form.category).toBe('cat-1')
      expect(form.orgName).toBe('Test Organizer')
      expect(form.orgLogo).toBe('/uploads/logo.png')
      expect(form.orgInfo).toBe('Org description')
      expect(form.slug).toBe('test-event')
      expect(form.privacy).toBe('public')
      expect(form.confirmationMessage).toBe('Thank you!')
      expect(form.logisticsServices).toEqual(['service-1', 'service-2'])
      expect(form.permitDocuments).toHaveLength(1)
      expect(form.permitDocuments[0].name).toBe('permit.pdf')
      expect(form.contractRepName).toBe('John Doe')
      expect(form.contractAgreed).toBe(true)
      expect(form.signatureDataUrl).toBe('/uploads/signature.png')
      expect(form.bankName).toBe('Vietcombank')
      expect(form.bankAccountNumber).toBe('123456789')
      expect(form.bankAccountHolder).toBe('Jane Doe')
    })

    it('should prefer banner over imageUrl', () => {
      const detail1: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          banner: '/banner.png',
          imageUrl: '/image.png',
          posterImage: '/poster.png',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form1 = mapDetailToForm(detail1)
      expect(form1.bannerImage).toBe('/banner.png')

      const detail2: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Test',
          imageUrl: '/image.png',
          posterImage: '/poster.png',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form2 = mapDetailToForm(detail2)
      expect(form2.bannerImage).toBe('/image.png')
    })

    it('should map online location correctly', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          title: 'Online Event',
          locationType: 'online',
          location: 'https://meet.google.com/xyz',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.locationType).toBe('online')
      expect(form.street).toBe('https://meet.google.com/xyz')
    })

    it('should default missing fields to empty strings or null', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.name).toBe('')
      expect(form.description).toBe('')
      expect(form.posterImage).toBeNull()
      expect(form.bannerImage).toBeNull()
      expect(form.venueName).toBe('')
      expect(form.province).toBe('')
      expect(form.ward).toBe('')
      expect(form.street).toBe('')
      expect(form.category).toBe('')
      expect(form.orgName).toBe('')
      expect(form.orgLogo).toBeNull()
      expect(form.orgInfo).toBe('')
      expect(form.slug).toBe('')
      expect(form.privacy).toBe('public')
      expect(form.confirmationMessage).toBe('')
    })

    it('should default privacy to public when missing', () => {
      const detail: ServerEventDetail = {
        event: { _id: 'evt1', reviewStatus: 'DRAFT' },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.privacy).toBe('public')
    })

    it('should handle empty logistics services', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          logisticsServices: undefined,
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.logisticsServices).toEqual([])
    })
  })

  describe('round-trip conversion', () => {
    it('should not throw on empty event', () => {
      const detail: ServerEventDetail = {
        event: { _id: 'evt1', reviewStatus: 'DRAFT' },
        tickets: [],
      }
      expect(() => mapDetailToForm(detail)).not.toThrow()
    })

    it('should create a valid form from minimal event', () => {
      const detail: ServerEventDetail = {
        event: { _id: 'evt1', reviewStatus: 'DRAFT' },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.shows).toHaveLength(1)
      expect(form.shows[0].id).toBeDefined()
      expect(form.shows[0].tickets).toEqual([])
    })

    it('should preserve permit document metadata', () => {
      const detail: ServerEventDetail = {
        event: {
          _id: 'evt1',
          permitDocuments: [
            { name: 'permit1.pdf', url: '/uploads/permits/1', sizeKb: 500 },
            { name: 'permit2.pdf', url: '/uploads/permits/2', sizeKb: 750 },
          ],
          reviewStatus: 'DRAFT',
        },
        tickets: [],
      }
      const form = mapDetailToForm(detail)
      expect(form.permitDocuments).toHaveLength(2)
      expect(form.permitDocuments[0].name).toBe('permit1.pdf')
      expect(form.permitDocuments[0].sizeKb).toBe(500)
      expect(form.permitDocuments[1].name).toBe('permit2.pdf')
      expect(form.permitDocuments[1].sizeKb).toBe(750)
    })
  })
})
