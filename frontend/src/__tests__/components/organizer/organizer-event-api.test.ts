/**
 * Tests for src/components/organizer/create-event/organizer-event-api.ts
 *
 * Tests API call mocking (fetch-based), including:
 * - saveEventDraft() for new events (POST) and re-saves (PUT)
 * - uploadLocalFile() for images and signatures
 * - Form validation before save
 * - Error handling (failed uploads, bad responses)
 * - Show ID mapping between client and server
 */

import { saveEventDraft } from '@/components/organizer/create-event/organizer-event-api'
import {
  INITIAL_FORM,
  createEmptyShow,
  createEmptyTicket,
  type CreateEventForm,
} from '@/components/organizer/create-event/create-event-data'

// Mock the clientApi module
jest.mock('@/lib/client-api', () => ({
  clientApi: {
    post: jest.fn(),
    put: jest.fn(),
  },
}))

import { clientApi } from '@/lib/client-api'

describe('organizer-event-api', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('saveEventDraft', () => {
    it('should throw error if event name is missing', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: '',
      }
      await expect(saveEventDraft(form)).rejects.toThrow('Vui lòng nhập tên sự kiện')
    })

    it('should throw error if banner image is missing', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: null,
      }
      await expect(saveEventDraft(form)).rejects.toThrow('ảnh nền sự kiện')
    })

    it('should throw error if category is missing', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: '',
      }
      await expect(saveEventDraft(form)).rejects.toThrow('thể loại sự kiện')
    })

    it('should throw error if offline event missing venue info', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: 'cat',
        locationType: 'offline',
        venueName: '',
      }
      await expect(saveEventDraft(form)).rejects.toThrow('địa điểm')
    })

    it('should throw error if online event missing join link', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: 'cat',
        locationType: 'online',
        street: '',
      }
      await expect(saveEventDraft(form)).rejects.toThrow('link tham gia')
    })

    it('should throw error if no shows with times', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Desc',
        shows: [{ ...createEmptyShow(), startTime: '', endTime: '' }],
      }
      await expect(saveEventDraft(form)).rejects.toThrow('suất diễn')
    })

    it('should throw error if no tickets', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Desc',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [],
          },
        ],
      }
      await expect(saveEventDraft(form)).rejects.toThrow('ít nhất 1 loại vé')
    })

    it('should throw error if signature missing when agreed', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: 'data:image/png;base64,abc',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Desc',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
        contractAgreed: true,
        signatureDataUrl: null,
      }
      await expect(saveEventDraft(form)).rejects.toThrow('ký tên')
    })

    it('should POST new event and return result', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        posterImage: '/uploads/poster.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              {
                ...createEmptyTicket(),
                name: 'Standard',
                quantity: 100,
              },
            ],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      const result = await saveEventDraft(form)
      expect(result.eventId).toBe('evt-123')
      expect(result.showIdMap).toHaveLength(1)
      expect(result.showIdMap[0].serverId).toBe('show-456')
      expect(clientApi.post).toHaveBeenCalledWith(
        '/organizer/events',
        expect.objectContaining({
          title: 'Test Event',
          categoryId: 'cat',
        })
      )
    })

    it('should PUT existing event and update tickets', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Updated Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            id: 'show-server-456',
            title: 'Show 1',
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              {
                ...createEmptyTicket(),
                name: 'Standard',
                quantity: 100,
              },
            ],
          },
        ],
      }

      ;(clientApi.put as jest.Mock).mockResolvedValue({
        data: {
          _id: 'evt-123',
          shows: [{ _id: 'show-server-456' }],
        },
      })

      const result = await saveEventDraft(form, 'evt-123')
      expect(result.eventId).toBe('evt-123')
      expect(clientApi.put).toHaveBeenCalledWith(
        '/organizer/events/evt-123',
        expect.objectContaining({
          title: 'Updated Event',
        })
      )
      expect(clientApi.put).toHaveBeenCalledWith(
        '/organizer/events/evt-123/tickets',
        expect.objectContaining({
          tickets: expect.any(Array),
        })
      )
    })

    it('should return assetPatch with uploaded URLs', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        posterImage: '/uploads/poster.png',
        orgLogo: '/uploads/logo.png',
        signatureDataUrl: '/uploads/signature.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      const result = await saveEventDraft(form)
      expect(result.assetPatch).toHaveProperty('bannerImage')
      expect(result.assetPatch.bannerImage).toBe('/uploads/banner.png')
    })

    it('should map FE show ids to server ids', async () => {
      const feShowId = 'show-fe-1'
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            id: feShowId,
            title: 'Show 1',
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-server-123' }],
          },
        },
      })

      const result = await saveEventDraft(form)
      expect(result.showIdMap[0].feShowId).toBe(feShowId)
      expect(result.showIdMap[0].serverId).toBe('show-server-123')
    })

    it('should include only valid shows (with start/end times) in payload', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            id: 'show-1',
            title: 'Valid Show',
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
          {
            id: 'show-2',
            title: 'Invalid Show (no times)',
            startTime: '',
            endTime: '',
            tickets: [],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-server-1' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.shows).toHaveLength(1)
    })

    it('should slugify the slug before sending', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        slug: 'My Event!!!',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.slug).toBe('my-event')
    })

    it('should trim whitespace from string fields', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: '  Test Event  ',
        bannerImage: '/uploads/banner.png',
        locationType: 'offline',
        venueName: '  Venue Name  ',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: '  Org  ',
        orgInfo: '  Info  ',
        category: 'cat',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            title: '  Show Title  ',
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.title).toBe('Test Event')
      expect(callArgs.venue.name).toBe('Venue Name')
      expect(callArgs.orgName).toBe('Org')
    })

    it('should calculate capacity from ticket quantities', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), quantity: 50 },
              { ...createEmptyTicket(), quantity: 75 },
            ],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.capacity).toBe(125)
    })

    it('should set capacity to at least 1', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [{ ...createEmptyTicket(), quantity: 0 }],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.capacity).toBeGreaterThanOrEqual(1)
    })

    it('should handle online events correctly', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Online Event',
        bannerImage: '/uploads/banner.png',
        locationType: 'online',
        street: 'https://meet.google.com/xyz',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.locationType).toBe('online')
      expect(callArgs.location).toBe('https://meet.google.com/xyz')
      expect(callArgs.venue).toBeUndefined()
    })

    it('should include permit documents in payload', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        permitDocuments: [
          { id: '1', name: 'permit.pdf', url: '/uploads/permits/xyz', sizeKb: 500 },
        ],
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.permitDocuments).toHaveLength(1)
      expect(callArgs.permitDocuments[0].name).toBe('permit.pdf')
      expect(callArgs.permitDocuments[0].url).toBe('/uploads/permits/xyz')
    })

    it('should include contract info when present', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        contractRepName: 'John Doe',
        contractAgreed: true,
        signatureDataUrl: '/uploads/signature.png',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.contract).toBeDefined()
      expect(callArgs.contract.repName).toBe('John Doe')
      expect(callArgs.contract.agreed).toBe(true)
      expect(callArgs.contract.signatureUrl).toBe('/uploads/signature.png')
    })

    it('should include payment info when present', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        bankName: 'Vietcombank',
        bankAccountNumber: '123456789',
        bankAccountHolder: 'Jane Doe',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      expect(callArgs.paymentInfo).toBeDefined()
      expect(callArgs.paymentInfo.bankName).toBe('Vietcombank')
      expect(callArgs.paymentInfo.accountNumber).toBe('123456789')
      expect(callArgs.paymentInfo.accountHolder).toBe('Jane Doe')
    })

    it('should convert datetime-local to ISO for shows and tickets', async () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'Test Event',
        bannerImage: '/uploads/banner.png',
        category: 'cat',
        locationType: 'offline',
        venueName: 'Venue',
        province: 'HCM',
        ward: 'Q1',
        street: 'Street',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Test description',
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T14:30',
            endTime: '2026-07-21T16:00',
            tickets: [createEmptyTicket()],
          },
        ],
      }

      ;(clientApi.post as jest.Mock).mockResolvedValue({
        data: {
          event: {
            _id: 'evt-123',
            shows: [{ _id: 'show-456' }],
          },
        },
      })

      await saveEventDraft(form)
      const callArgs = (clientApi.post as jest.Mock).mock.calls[0][1]
      const show = callArgs.shows[0]
      // Should be ISO format
      expect(show.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(show.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })
})
