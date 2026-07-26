/**
 * Tests for src/components/organizer/create-event/wizard-validation.ts
 *
 * Comprehensive coverage of all validation rules per step, including:
 * - Required field errors
 * - Length boundary tests (at limit, under, over)
 * - Format rules (slug, URL, date/time ordering)
 * - Complex interdependent rules (show overlap, ticket constraints)
 */

import {
  fieldErrors,
  showFieldErrors,
  step3FieldErrors,
  step4FieldErrors,
  step5FieldErrors,
  step6FieldErrors,
  validateStep,
  firstInvalidStep,
} from '@/components/organizer/create-event/wizard-validation'
import {
  LIMITS,
  SETTINGS_LIMITS,
  DESCRIPTION_TEMPLATE,
  INITIAL_FORM,
  createEmptyShow,
  createEmptyTicket,
  type CreateEventForm,
} from '@/components/organizer/create-event/create-event-data'

describe('wizard-validation', () => {
  // Freeze the clock before the hardcoded show dates used across the Step-2
  // tests (2026-07-21). Those dates were written to be in the future; once the
  // real clock passes them they'd read as "past" and trip the "must start in
  // the future" rule, failing tests that expect no error. Pinning "now" keeps
  // them valid regardless of when the suite runs. Tests that need a specific
  // "now" still override it inline (jest.setSystemTime).
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-07-20T00:00:00Z'))
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  describe('fieldErrors (Step 1)', () => {
    it('should require event name', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, name: '' }
      expect(fieldErrors(form).name).toBe('Vui lòng nhập tên sự kiện.')
    })

    it('should reject name exceeding limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'a'.repeat(LIMITS.name + 1),
      }
      expect(fieldErrors(form).name).toBe(
        `Tên sự kiện tối đa ${LIMITS.name} ký tự.`
      )
    })

    it('should accept name at limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        name: 'a'.repeat(LIMITS.name),
      }
      expect(fieldErrors(form).name).toBeUndefined()
    })

    it('should require venue name for offline events', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'offline',
        venueName: '',
      }
      expect(fieldErrors(form).venueName).toBe(
        'Vui lòng nhập tên địa điểm.'
      )
    })

    it('should require province for offline events', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'offline',
        province: '',
      }
      expect(fieldErrors(form).province).toBe('Vui lòng chọn Tỉnh/Thành.')
    })

    it('should require ward for offline events', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'offline',
        ward: '',
      }
      expect(fieldErrors(form).ward).toBe('Vui lòng chọn Phường/Xã.')
    })

    it('should require street address for offline events', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'offline',
        street: '',
      }
      expect(fieldErrors(form).street).toBe(
        'Vui lòng nhập số nhà, đường.'
      )
    })

    it('should not require venue fields for online events', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'online',
        venueName: '',
        province: '',
        ward: '',
        street: 'https://meet.google.com/xyz',
      }
      const errors = fieldErrors(form)
      expect(errors.venueName).toBeUndefined()
      expect(errors.province).toBeUndefined()
      expect(errors.ward).toBeUndefined()
      expect(errors.street).toBeUndefined()
    })

    it('should require valid HTTP/HTTPS URL for online location', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'online',
        street: 'not-a-url',
      }
      expect(fieldErrors(form).street).toBe(
        'Link tham gia phải là URL hợp lệ (bắt đầu http/https).'
      )
    })

    it('should accept http and https URLs', () => {
      const formHttp: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'online',
        street: 'http://example.com',
      }
      const formHttps: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'online',
        street: 'https://example.com',
      }
      expect(fieldErrors(formHttp).street).toBeUndefined()
      expect(fieldErrors(formHttps).street).toBeUndefined()
    })

    it('should require category', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, category: '' }
      expect(fieldErrors(form).category).toBe(
        'Vui lòng chọn thể loại sự kiện.'
      )
    })

    it('should require organizer name', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, orgName: '' }
      expect(fieldErrors(form).orgName).toBe(
        'Vui lòng nhập tên ban tổ chức.'
      )
    })

    it('should reject organizer name exceeding limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        orgName: 'a'.repeat(LIMITS.orgName + 1),
      }
      expect(fieldErrors(form).orgName).toBe(
        `Tên ban tổ chức tối đa ${LIMITS.orgName} ký tự.`
      )
    })

    it('should require organizer info', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, orgInfo: '' }
      expect(fieldErrors(form).orgInfo).toBe(
        'Vui lòng nhập thông tin ban tổ chức.'
      )
    })

    it('should reject organizer info exceeding limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        orgInfo: 'a'.repeat(LIMITS.orgInfo + 1),
      }
      expect(fieldErrors(form).orgInfo).toBe(
        `Thông tin ban tổ chức tối đa ${LIMITS.orgInfo} ký tự.`
      )
    })

    it('should pass all fields when valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        locationType: 'offline',
        name: 'Test Event',
        venueName: 'Test Venue',
        province: 'HCM',
        ward: 'Q1',
        street: '123 Main St',
        category: 'Nhạc sống',
        orgName: 'Test Org',
        orgInfo: 'Test Info',
      }
      expect(fieldErrors(form)).toEqual({})
    })
  })

  describe('validateStep1', () => {
    it('should require banner image', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: null,
        posterImage: 'data:image/png;base64,abc',
        name: 'Event',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Long enough description here',
      }
      const errors = validateStep(1, form)
      expect(errors).toContain('Vui lòng tải ảnh nền sự kiện (1280x720).')
    })

    it('should require poster image', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: 'data:image/png;base64,abc',
        posterImage: null,
        name: 'Event',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'Long enough description here',
      }
      const errors = validateStep(1, form)
      expect(errors).toContain('Vui lòng tải ảnh sự kiện hiển thị (720x958).')
    })

    it('should require description minimum 10 chars', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: 'data:image/png;base64,abc',
        posterImage: 'data:image/png;base64,abc',
        name: 'Event',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        description: 'short',
      }
      const errors = validateStep(1, form)
      expect(errors).toContain(
        'Vui lòng nhập mô tả sự kiện (tối thiểu 10 ký tự).'
      )
    })

    it('should reject untouched description template', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: 'data:image/png;base64,abc',
        posterImage: 'data:image/png;base64,abc',
        name: 'Event',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        description: DESCRIPTION_TEMPLATE,
      }
      const errors = validateStep(1, form)
      expect(errors).toContain(
        'Vui lòng thay nội dung mẫu bằng mô tả thực tế cho sự kiện của bạn.'
      )
    })

    it('should reject description over 2000 plain-text chars', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: 'data:image/png;base64,abc',
        posterImage: 'data:image/png;base64,abc',
        name: 'Event',
        category: 'cat',
        orgName: 'Org',
        orgInfo: 'Info',
        // HTML tags must not count toward the 2000 cap — only the text does.
        description: '<p>' + 'a'.repeat(2001) + '</p>',
      }
      const errors = validateStep(1, form)
      expect(errors).toContain('Mô tả sự kiện tối đa 2000 ký tự.')
    })

    it('should pass step 1 when all fields valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bannerImage: 'data:image/png;base64,abc',
        posterImage: 'data:image/png;base64,abc',
        name: 'Test Event',
        venueName: 'Test Venue',
        province: 'HCM',
        ward: 'Q1',
        street: '123 Main St',
        category: 'Nhạc sống',
        orgName: 'Test Org',
        orgInfo: 'Test Info',
        description: 'This is a real description that is long enough',
      }
      expect(validateStep(1, form)).toEqual([])
    })
  })

  describe('showFieldErrors (Step 2)', () => {
    it('should require start time', () => {
      const show = { ...createEmptyShow(), startTime: '', endTime: '2026-07-20T10:00' }
      expect(showFieldErrors(show).startTime).toBe(
        'Vui lòng nhập thời gian bắt đầu.'
      )
    })

    it('should reject invalid start time format', () => {
      const show = { ...createEmptyShow(), startTime: 'invalid', endTime: '2026-07-20T10:00' }
      expect(showFieldErrors(show).startTime).toBe(
        'Thời gian bắt đầu không hợp lệ.'
      )
    })

    it('should reject start time in the past', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-07-20T12:00:00Z'))
      const show = { ...createEmptyShow(), startTime: '2026-07-20T10:00' }
      expect(showFieldErrors(show).startTime).toBe(
        'Thời gian bắt đầu phải ở tương lai.'
      )
      jest.useRealTimers()
    })

    it('should require end time', () => {
      const show = { ...createEmptyShow(), startTime: '2026-07-21T10:00', endTime: '' }
      expect(showFieldErrors(show).endTime).toBe(
        'Vui lòng nhập thời gian kết thúc.'
      )
    })

    it('should reject invalid end time format', () => {
      const show = { ...createEmptyShow(), startTime: '2026-07-21T10:00', endTime: 'invalid' }
      expect(showFieldErrors(show).endTime).toBe(
        'Thời gian kết thúc không hợp lệ.'
      )
    })

    it('should reject end time before or equal to start time', () => {
      const show = {
        ...createEmptyShow(),
        startTime: '2026-07-21T10:00',
        endTime: '2026-07-21T10:00',
      }
      expect(showFieldErrors(show).endTime).toBe(
        'Thời gian kết thúc phải sau thời gian bắt đầu.'
      )
    })

    it('should reject overlapping shows (current starts before previous ends)', () => {
      const prevShow = {
        ...createEmptyShow(),
        startTime: '2026-07-21T10:00',
        endTime: '2026-07-21T12:00',
      }
      const currentShow = {
        ...createEmptyShow(),
        startTime: '2026-07-21T11:00',
        endTime: '2026-07-21T13:00',
      }
      expect(showFieldErrors(currentShow, prevShow).startTime).toBe(
        'Phải bắt đầu sau khi suất diễn trước kết thúc — các suất không được trùng giờ.'
      )
    })

    it('should allow back-to-back shows (current starts exactly when previous ends)', () => {
      const prevShow = {
        ...createEmptyShow(),
        startTime: '2026-07-21T10:00',
        endTime: '2026-07-21T12:00',
      }
      const currentShow = {
        ...createEmptyShow(),
        startTime: '2026-07-21T12:00',
        endTime: '2026-07-21T14:00',
      }
      expect(showFieldErrors(currentShow, prevShow).startTime).toBeUndefined()
    })

    it('should require at least one ticket type', () => {
      const show = {
        ...createEmptyShow(),
        startTime: '2026-07-21T10:00',
        endTime: '2026-07-21T12:00',
        tickets: [],
      }
      expect(showFieldErrors(show).tickets).toBe(
        'Vui lòng tạo ít nhất 1 loại vé.'
      )
    })

    it('should pass when all fields valid', () => {
      const show = {
        ...createEmptyShow(),
        startTime: '2026-07-21T10:00',
        endTime: '2026-07-21T12:00',
        tickets: [createEmptyTicket()],
      }
      expect(showFieldErrors(show)).toEqual({})
    })
  })

  describe('validateStep2', () => {
    it('should require at least one show', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, shows: [] }
      expect(validateStep(2, form)).toContain(
        'Vui lòng tạo ít nhất 1 suất diễn.'
      )
    })

    it('should validate ticket constraints', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), name: 'VIP', isFree: false, price: -10 },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('giá vé phải lớn hơn 0'))).toBe(true)
    })

    it('should require ticket quantity >= 1', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), name: 'Standard', quantity: 0 },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('số lượng phải ≥ 1'))).toBe(true)
    })

    it('should require minPerOrder >= 1', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), minPerOrder: 0 },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('số vé tối thiểu/đơn phải ≥ 1'))).toBe(true)
    })

    it('should require maxPerOrder >= minPerOrder', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), minPerOrder: 5, maxPerOrder: 3 },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('số vé tối đa/đơn phải ≥ tối thiểu'))).toBe(true)
    })

    it('should require maxPerOrder <= quantity', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), quantity: 10, maxPerOrder: 20 },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('số vé tối đa/đơn không được vượt tổng số vé'))).toBe(true)
    })

    it('should reject sale start in the past', () => {
      jest.useFakeTimers()
      jest.setSystemTime(new Date('2026-07-20T12:00:00Z'))
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), saleStart: '2026-07-20T10:00' },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('thời gian bắt đầu bán vé phải ở tương lai'))).toBe(true)
      jest.useRealTimers()
    })

    // Sales must close 30 minutes before the show starts (show starts 10:00 ⇒
    // the latest allowed saleEnd is 09:30).
    const showWithSaleEnd = (saleEnd: string): CreateEventForm => ({
      ...INITIAL_FORM,
      shows: [
        {
          ...createEmptyShow(),
          startTime: '2026-07-21T10:00',
          endTime: '2026-07-21T12:00',
          tickets: [{ ...createEmptyTicket(), saleEnd }],
        },
      ],
    })
    const saleEndError = (form: CreateEventForm) =>
      validateStep(2, form).some((e) =>
        e.includes('thời gian kết thúc bán vé phải trước giờ bắt đầu suất diễn ít nhất 30 phút')
      )

    it('should reject sale end after the show starts', () => {
      expect(saleEndError(showWithSaleEnd('2026-07-21T11:00'))).toBe(true)
    })

    it('should reject sale end inside the 30-minute lead window', () => {
      expect(saleEndError(showWithSaleEnd('2026-07-21T09:50'))).toBe(true)
    })

    it('should accept sale end exactly 30 minutes before the show starts', () => {
      expect(saleEndError(showWithSaleEnd('2026-07-21T09:30'))).toBe(false)
    })

    it('should require ticket name', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              { ...createEmptyTicket(), name: '' },
            ],
          },
        ],
      }
      const errors = validateStep(2, form)
      expect(errors.some((e) => e.includes('có loại vé chưa đặt tên'))).toBe(true)
    })

    it('should pass when all tickets valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        shows: [
          {
            ...createEmptyShow(),
            startTime: '2026-07-21T10:00',
            endTime: '2026-07-21T12:00',
            tickets: [
              {
                ...createEmptyTicket(),
                name: 'Standard',
                price: 100000,
                quantity: 100,
                minPerOrder: 1,
                maxPerOrder: 10,
              },
            ],
          },
        ],
      }
      expect(validateStep(2, form)).toEqual([])
    })
  })

  describe('step3FieldErrors (Step 3)', () => {
    it('should require slug', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, slug: '' }
      expect(step3FieldErrors(form).slug).toBe(
        'Vui lòng nhập đường dẫn tuỳ chỉnh (slug) cho sự kiện.'
      )
    })

    it('should reject slug exceeding limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        slug: 'a'.repeat(SETTINGS_LIMITS.slug + 1),
      }
      expect(step3FieldErrors(form).slug).toBe(
        `Đường dẫn tối đa ${SETTINGS_LIMITS.slug} ký tự.`
      )
    })

    it('should reject confirmation message exceeding limit', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        confirmationMessage: 'a'.repeat(SETTINGS_LIMITS.confirmationMessage + 1),
      }
      expect(step3FieldErrors(form).confirmationMessage).toBe(
        `Tin nhắn xác nhận tối đa ${SETTINGS_LIMITS.confirmationMessage} ký tự.`
      )
    })

    it('should pass when valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        slug: 'my-event',
        confirmationMessage: 'Thank you',
      }
      expect(step3FieldErrors(form)).toEqual({})
    })
  })

  describe('step4FieldErrors (Step 4)', () => {
    it('should require at least one permit document', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, permitDocuments: [] }
      expect(step4FieldErrors(form).permitDocuments).toBe(
        'Vui lòng đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý.'
      )
    })

    it('should pass when documents present', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        permitDocuments: [
          { id: '1', name: 'permit.pdf', url: '/uploads/permits/xyz', sizeKb: 100 },
        ],
      }
      expect(step4FieldErrors(form)).toEqual({})
    })
  })

  describe('step5FieldErrors (Step 5)', () => {
    it('should require representative name', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, contractRepName: '' }
      expect(step5FieldErrors(form).contractRepName).toBe(
        'Vui lòng nhập người đại diện ký hợp đồng.'
      )
    })

    it('should require signature', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, signatureDataUrl: null }
      expect(step5FieldErrors(form).signature).toBe(
        'Vui lòng ký tên vào hợp đồng.'
      )
    })

    it('should require agreement checkbox', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, contractAgreed: false }
      expect(step5FieldErrors(form).agreed).toBe(
        'Vui lòng tích đồng ý điều khoản hợp đồng.'
      )
    })

    it('should pass when all fields valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        contractRepName: 'John Doe',
        signatureDataUrl: 'data:image/png;base64,abc',
        contractAgreed: true,
      }
      expect(step5FieldErrors(form)).toEqual({})
    })
  })

  describe('step6FieldErrors (Step 6)', () => {
    it('should require bank name', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, bankName: '' }
      expect(step6FieldErrors(form).bankName).toBe(
        'Vui lòng chọn ngân hàng nhận tiền.'
      )
    })

    it('should require bank account number', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '',
      }
      expect(step6FieldErrors(form).bankAccountNumber).toBe(
        'Vui lòng nhập số tài khoản.'
      )
    })

    it('should reject account number with non-digits', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '123456abc',
      }
      expect(step6FieldErrors(form).bankAccountNumber).toBe(
        'Số tài khoản chỉ gồm 6–30 chữ số.'
      )
    })

    it('should reject account number shorter than 6 digits', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '12345',
      }
      expect(step6FieldErrors(form).bankAccountNumber).toBe(
        'Số tài khoản chỉ gồm 6–30 chữ số.'
      )
    })

    it('should reject account number longer than 30 digits', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '1'.repeat(31),
      }
      expect(step6FieldErrors(form).bankAccountNumber).toBe(
        'Số tài khoản chỉ gồm 6–30 chữ số.'
      )
    })

    it('should accept account number with 6-30 digits', () => {
      const form6: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '123456',
      }
      const form30: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountNumber: '1'.repeat(30),
      }
      expect(step6FieldErrors(form6).bankAccountNumber).toBeUndefined()
      expect(step6FieldErrors(form30).bankAccountNumber).toBeUndefined()
    })

    it('should require bank account holder', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankAccountHolder: '',
      }
      expect(step6FieldErrors(form).bankAccountHolder).toBe(
        'Vui lòng nhập tên chủ tài khoản.'
      )
    })

    it('should pass when all fields valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankName: 'Vietcombank',
        bankAccountNumber: '123456789',
        bankAccountHolder: 'John Doe',
      }
      expect(step6FieldErrors(form)).toEqual({})
    })
  })

  describe('validateStep (integration)', () => {
    it('should return errors for step 1', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, name: '' }
      const errors = validateStep(1, form)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return errors for step 2', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, shows: [] }
      const errors = validateStep(2, form)
      expect(errors.length).toBeGreaterThan(0)
    })

    it('should return empty array when step is valid', () => {
      const form: CreateEventForm = {
        ...INITIAL_FORM,
        bankName: 'Vietcombank',
        bankAccountNumber: '123456789',
        bankAccountHolder: 'John Doe',
      }
      expect(validateStep(6, form)).toEqual([])
    })
  })

  describe('firstInvalidStep', () => {
    it('should return 1 when first step has errors', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, name: '' }
      expect(firstInvalidStep(form)).toBe(1)
    })

    it('should return earliest invalid step', () => {
      const form: CreateEventForm = { ...INITIAL_FORM, name: '', slug: '' }
      expect(firstInvalidStep(form)).toBe(1)
    })
  })
})
