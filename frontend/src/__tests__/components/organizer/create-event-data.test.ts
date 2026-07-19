/**
 * Tests for src/components/organizer/create-event/create-event-data.ts
 *
 * Verifies constants, data structures, and helper functions:
 * - LIMITS, SETTINGS_LIMITS, TICKET_LIMITS structure and values
 * - Event categories, wizard steps, VN banks completeness
 * - slugify() for Vietnamese diacritics + special chars
 * - createEmptyTicket() and createEmptyShow() ID generation
 * - INITIAL_FORM structure
 */

import {
  LIMITS,
  SETTINGS_LIMITS,
  TICKET_LIMITS,
  PERMIT_FILE_RULES,
  LOGISTICS_SERVICES,
  EVENT_CATEGORIES,
  WIZARD_STEPS,
  VN_BANKS,
  slugify,
  createEmptyTicket,
  createEmptyShow,
  INITIAL_FORM,
  EVENT_URL_PATH,
  DESCRIPTION_TEMPLATE,
  PAYMENT_LIMITS,
} from '@/components/organizer/create-event/create-event-data'

describe('create-event-data', () => {
  describe('LIMITS constants', () => {
    it('should define name limit', () => {
      expect(LIMITS.name).toBe(100)
    })

    it('should define venueName limit', () => {
      expect(LIMITS.venueName).toBe(80)
    })

    it('should define street limit', () => {
      expect(LIMITS.street).toBe(80)
    })

    it('should define orgName limit', () => {
      expect(LIMITS.orgName).toBe(80)
    })

    it('should define orgInfo limit', () => {
      expect(LIMITS.orgInfo).toBe(500)
    })

    it('should have all limits as positive integers', () => {
      Object.values(LIMITS).forEach((limit) => {
        expect(typeof limit).toBe('number')
        expect(limit).toBeGreaterThan(0)
      })
    })
  })

  describe('SETTINGS_LIMITS constants', () => {
    it('should define slug limit', () => {
      expect(SETTINGS_LIMITS.slug).toBe(80)
    })

    it('should define confirmationMessage limit', () => {
      expect(SETTINGS_LIMITS.confirmationMessage).toBe(500)
    })
  })

  describe('TICKET_LIMITS constants', () => {
    it('should define name limit', () => {
      expect(TICKET_LIMITS.name).toBe(50)
    })

    it('should define description limit', () => {
      expect(TICKET_LIMITS.description).toBe(1000)
    })
  })

  describe('PERMIT_FILE_RULES', () => {
    it('should accept pdf, docx, png files', () => {
      expect(PERMIT_FILE_RULES.accept).toBe('.pdf,.docx,.png')
    })

    it('should list allowed extensions', () => {
      expect(PERMIT_FILE_RULES.allowedExtensions).toContain('pdf')
      expect(PERMIT_FILE_RULES.allowedExtensions).toContain('docx')
      expect(PERMIT_FILE_RULES.allowedExtensions).toContain('png')
    })

    it('should set max size to 15MB', () => {
      expect(PERMIT_FILE_RULES.maxSizeMb).toBe(15)
    })
  })

  describe('LOGISTICS_SERVICES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(LOGISTICS_SERVICES)).toBe(true)
      expect(LOGISTICS_SERVICES.length).toBeGreaterThan(0)
    })

    it('should have required service properties', () => {
      LOGISTICS_SERVICES.forEach((service) => {
        expect(service.id).toBeDefined()
        expect(service.label).toBeDefined()
        expect(service.description).toBeDefined()
        expect(typeof service.id).toBe('string')
        expect(typeof service.label).toBe('string')
        expect(typeof service.description).toBe('string')
      })
    })

    it('should have unique service ids', () => {
      const ids = LOGISTICS_SERVICES.map((s) => s.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should include tron-goi service', () => {
      expect(LOGISTICS_SERVICES.some((s) => s.id === 'tron-goi')).toBe(true)
    })

    it('should include san-khau service', () => {
      expect(LOGISTICS_SERVICES.some((s) => s.id === 'san-khau')).toBe(true)
    })

    it('should include am-thanh service', () => {
      expect(LOGISTICS_SERVICES.some((s) => s.id === 'am-thanh')).toBe(true)
    })

    it('should include khac service', () => {
      expect(LOGISTICS_SERVICES.some((s) => s.id === 'khac')).toBe(true)
    })
  })

  describe('EVENT_CATEGORIES', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(EVENT_CATEGORIES)).toBe(true)
      expect(EVENT_CATEGORIES.length).toBeGreaterThan(0)
    })

    it('should include Nhạc sống', () => {
      expect(EVENT_CATEGORIES).toContain('Nhạc sống')
    })

    it('should include Sân khấu & Nghệ thuật', () => {
      expect(EVENT_CATEGORIES).toContain('Sân khấu & Nghệ thuật')
    })

    it('should include Thể thao', () => {
      expect(EVENT_CATEGORIES).toContain('Thể thao')
    })

    it('should include Hội thảo & Workshop', () => {
      expect(EVENT_CATEGORIES).toContain('Hội thảo & Workshop')
    })

    it('should include Triển lãm', () => {
      expect(EVENT_CATEGORIES).toContain('Triển lãm')
    })

    it('should include Khác', () => {
      expect(EVENT_CATEGORIES).toContain('Khác')
    })

    it('should have unique categories', () => {
      const uniqueCategories = new Set(EVENT_CATEGORIES)
      expect(uniqueCategories.size).toBe(EVENT_CATEGORIES.length)
    })
  })

  describe('WIZARD_STEPS', () => {
    it('should define 6 steps', () => {
      expect(WIZARD_STEPS).toHaveLength(6)
    })

    it('should have sequential step ids', () => {
      WIZARD_STEPS.forEach((step, index) => {
        expect(step.id).toBe((index + 1) as 1 | 2 | 3 | 4 | 5 | 6)
      })
    })

    it('should have Vietnamese labels', () => {
      expect(WIZARD_STEPS[0].label).toBe('Thông tin sự kiện')
      expect(WIZARD_STEPS[1].label).toBe('Thời gian & Loại vé')
      expect(WIZARD_STEPS[2].label).toBe('Cài đặt')
      expect(WIZARD_STEPS[3].label).toBe('Logistics & Giấy phép')
      expect(WIZARD_STEPS[4].label).toBe('Hợp đồng')
      expect(WIZARD_STEPS[5].label).toBe('Thông tin thanh toán')
    })
  })

  describe('VN_BANKS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(VN_BANKS)).toBe(true)
      expect(VN_BANKS.length).toBeGreaterThan(0)
    })

    it('should include major banks', () => {
      expect(VN_BANKS).toContain('Vietcombank (VCB)')
      expect(VN_BANKS).toContain('BIDV')
      expect(VN_BANKS).toContain('MB Bank (MBB)')
      expect(VN_BANKS).toContain('Techcombank (TCB)')
    })

    it('should have unique bank names', () => {
      const uniqueBanks = new Set(VN_BANKS)
      expect(uniqueBanks.size).toBe(VN_BANKS.length)
    })

    it('should be all strings', () => {
      VN_BANKS.forEach((bank) => {
        expect(typeof bank).toBe('string')
        expect(bank.length).toBeGreaterThan(0)
      })
    })
  })

  describe('PAYMENT_LIMITS', () => {
    it('should define accountNumber limit', () => {
      expect(PAYMENT_LIMITS.accountNumber).toBe(30)
    })

    it('should define accountHolder limit', () => {
      expect(PAYMENT_LIMITS.accountHolder).toBe(100)
    })
  })

  describe('EVENT_URL_PATH', () => {
    it('should be set to /su-kien', () => {
      expect(EVENT_URL_PATH).toBe('/su-kien')
    })
  })

  describe('DESCRIPTION_TEMPLATE', () => {
    it('should be a non-empty string', () => {
      expect(typeof DESCRIPTION_TEMPLATE).toBe('string')
      expect(DESCRIPTION_TEMPLATE.length).toBeGreaterThan(0)
    })

    it('should contain HTML tags', () => {
      expect(DESCRIPTION_TEMPLATE).toContain('<h3>')
      expect(DESCRIPTION_TEMPLATE).toContain('<p>')
      expect(DESCRIPTION_TEMPLATE).toContain('<ul>')
      expect(DESCRIPTION_TEMPLATE).toContain('<li>')
    })

    it('should contain Vietnamese headings', () => {
      expect(DESCRIPTION_TEMPLATE).toContain('Giới thiệu sự kiện')
      expect(DESCRIPTION_TEMPLATE).toContain('Điểm nhấn nổi bật')
      expect(DESCRIPTION_TEMPLATE).toContain('Chương trình chính')
    })

    it('should contain bracketed placeholders', () => {
      expect(DESCRIPTION_TEMPLATE).toContain('[')
      expect(DESCRIPTION_TEMPLATE).toContain(']')
    })
  })

  describe('INITIAL_FORM', () => {
    it('should have all required properties', () => {
      expect(INITIAL_FORM.posterImage).toBeNull()
      expect(INITIAL_FORM.bannerImage).toBeNull()
      expect(INITIAL_FORM.name).toBe('')
      expect(INITIAL_FORM.locationType).toBe('offline')
      expect(INITIAL_FORM.venueName).toBe('')
      expect(INITIAL_FORM.province).toBe('')
      expect(INITIAL_FORM.ward).toBe('')
      expect(INITIAL_FORM.street).toBe('')
      expect(INITIAL_FORM.category).toBe('')
      expect(INITIAL_FORM.description).toBe(DESCRIPTION_TEMPLATE)
      expect(INITIAL_FORM.orgLogo).toBeNull()
      expect(INITIAL_FORM.orgName).toBe('')
      expect(INITIAL_FORM.orgInfo).toBe('')
      expect(INITIAL_FORM.slug).toBe('')
      expect(INITIAL_FORM.privacy).toBe('public')
      expect(INITIAL_FORM.confirmationMessage).toBe('')
      expect(INITIAL_FORM.logisticsServices).toEqual([])
      expect(INITIAL_FORM.permitDocuments).toEqual([])
      expect(INITIAL_FORM.contractRepName).toBe('')
      expect(INITIAL_FORM.contractAgreed).toBe(false)
      expect(INITIAL_FORM.signatureDataUrl).toBeNull()
      expect(INITIAL_FORM.bankName).toBe('')
      expect(INITIAL_FORM.bankAccountNumber).toBe('')
      expect(INITIAL_FORM.bankAccountHolder).toBe('')
    })

    it('should seed with one show', () => {
      expect(INITIAL_FORM.shows).toHaveLength(1)
      expect(INITIAL_FORM.shows[0].title).toBe('')
      expect(INITIAL_FORM.shows[0].startTime).toBe('')
      expect(INITIAL_FORM.shows[0].endTime).toBe('')
      expect(INITIAL_FORM.shows[0].tickets).toEqual([])
    })

    it('should have description template pre-filled', () => {
      expect(INITIAL_FORM.description).toBe(DESCRIPTION_TEMPLATE)
    })
  })

  describe('slugify()', () => {
    it('should convert to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world')
    })

    it('should replace spaces with hyphens', () => {
      expect(slugify('Hello World Test')).toBe('hello-world-test')
    })

    it('should handle multiple spaces', () => {
      expect(slugify('Hello   World')).toBe('hello-world')
    })

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('  hello world  ')).toBe('hello-world')
    })

    it('should collapse multiple hyphens', () => {
      expect(slugify('hello--world')).toBe('hello-world')
    })

    it('should handle Vietnamese characters with diacritics', () => {
      expect(slugify('Sự kiện âm nhạc')).toBe('su-kien-am-nhac')
    })

    it('should handle đ character', () => {
      expect(slugify('Đôi dạo Đà Nẵng')).toBe('doi-dao-da-nang')
    })

    it('should remove special characters', () => {
      expect(slugify('Hello@World#2026!')).toBe('helloworld2026')
    })

    it('should keep numbers', () => {
      expect(slugify('Concert 2026')).toBe('concert-2026')
    })

    it('should handle empty string', () => {
      expect(slugify('')).toBe('')
    })

    it('should handle whitespace-only string', () => {
      expect(slugify('   ')).toBe('')
    })

    it('should handle special characters only', () => {
      expect(slugify('!!!@@@###')).toBe('')
    })

    it('should handle mixed Vietnamese and English', () => {
      expect(slugify('Nhạc Rock 2026')).toBe('nhac-rock-2026')
    })

    it('should not allow leading/trailing hyphens', () => {
      expect(slugify('-hello-world-')).toBe('hello-world')
    })

    it('should handle tones and accents comprehensively', () => {
      expect(slugify('Cà Phê')).toBe('ca-phe')
      expect(slugify('Chúa Nhật')).toBe('chua-nhat')
    })
  })

  describe('createEmptyTicket()', () => {
    it('should generate a ticket with unique id', () => {
      const ticket1 = createEmptyTicket()
      const ticket2 = createEmptyTicket()
      expect(ticket1.id).not.toBe(ticket2.id)
    })

    it('should generate id with ticket prefix', () => {
      const ticket = createEmptyTicket()
      expect(ticket.id.startsWith('ticket-')).toBe(true)
    })

    it('should have empty name', () => {
      expect(createEmptyTicket().name).toBe('')
    })

    it('should have price 0', () => {
      expect(createEmptyTicket().price).toBe(0)
    })

    it('should set isFree to false', () => {
      expect(createEmptyTicket().isFree).toBe(false)
    })

    it('should have default quantity 10', () => {
      expect(createEmptyTicket().quantity).toBe(10)
    })

    it('should have minPerOrder 1', () => {
      expect(createEmptyTicket().minPerOrder).toBe(1)
    })

    it('should have maxPerOrder 10', () => {
      expect(createEmptyTicket().maxPerOrder).toBe(10)
    })

    it('should have empty sale window', () => {
      expect(createEmptyTicket().saleStart).toBe('')
      expect(createEmptyTicket().saleEnd).toBe('')
    })

    it('should have empty description', () => {
      expect(createEmptyTicket().description).toBe('')
    })

    it('should have null image', () => {
      expect(createEmptyTicket().image).toBeNull()
    })
  })

  describe('createEmptyShow()', () => {
    it('should generate a show with unique id', () => {
      const show1 = createEmptyShow()
      const show2 = createEmptyShow()
      expect(show1.id).not.toBe(show2.id)
    })

    it('should generate id with show prefix', () => {
      const show = createEmptyShow()
      expect(show.id.startsWith('show-')).toBe(true)
    })

    it('should have empty title', () => {
      expect(createEmptyShow().title).toBe('')
    })

    it('should have empty start time', () => {
      expect(createEmptyShow().startTime).toBe('')
    })

    it('should have empty end time', () => {
      expect(createEmptyShow().endTime).toBe('')
    })

    it('should have empty tickets array', () => {
      expect(createEmptyShow().tickets).toEqual([])
    })

    it('should generate incrementing ids (when crypto available)', () => {
      // This test verifies that IDs are unique when generated sequentially
      const ids = new Set()
      for (let i = 0; i < 10; i++) {
        const show = createEmptyShow()
        expect(ids.has(show.id)).toBe(false)
        ids.add(show.id)
      }
    })
  })
})
