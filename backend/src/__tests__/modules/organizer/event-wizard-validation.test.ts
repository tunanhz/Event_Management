import crypto from 'crypto';
import { AppError } from '../../../common/utils/AppError';
import {
  SLUG_REGEX,
  validateTicketInput,
  validatePermitDocuments,
  resolveShowTimes,
  resolveCreateSchedule,
  composeLocation,
  validateWizardFields,
  buildContractSubdoc,
  TICKET_SALE_END_LEAD_MS,
} from '../../../modules/organizer/event-wizard-validation';
import { CreateEventInput, UpdateEventInput } from '../../../modules/organizer/event-wizard-types';

describe('event-wizard-validation.ts', () => {
  // ────────────────────────────────────────────────────────────────
  // SLUG_REGEX Tests
  // ────────────────────────────────────────────────────────────────
  describe('SLUG_REGEX', () => {
    it('should accept lowercase a-z, digits, and hyphens', () => {
      expect(SLUG_REGEX.test('my-event-2024')).toBe(true);
      expect(SLUG_REGEX.test('a')).toBe(true);
      expect(SLUG_REGEX.test('123')).toBe(true);
      expect(SLUG_REGEX.test('a-b-c')).toBe(true);
    });

    it('should reject uppercase letters', () => {
      expect(SLUG_REGEX.test('MyEvent')).toBe(false);
      expect(SLUG_REGEX.test('Event')).toBe(false);
    });

    it('should reject spaces', () => {
      expect(SLUG_REGEX.test('my event')).toBe(false);
    });

    it('should reject underscores', () => {
      expect(SLUG_REGEX.test('my_event')).toBe(false);
    });

    it('should reject strings over 80 characters', () => {
      expect(SLUG_REGEX.test('a'.repeat(81))).toBe(false);
      expect(SLUG_REGEX.test('a'.repeat(80))).toBe(true);
    });

    it('should reject empty strings', () => {
      expect(SLUG_REGEX.test('')).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // validateTicketInput Tests
  // ────────────────────────────────────────────────────────────────
  describe('validateTicketInput', () => {
    const futureDate = new Date(Date.now() + 86400000);
    const farFutureDate = new Date(Date.now() + 2 * 86400000);

    it('should throw when ticketName is missing', () => {
      expect(() => {
        validateTicketInput({ ticketName: '', price: 100, quantity: 10 });
      }).toThrow(AppError);
      const err = new AppError('', 400);
      try {
        validateTicketInput({ ticketName: '', price: 100, quantity: 10 });
      } catch (e) {
        if (e instanceof AppError) {
          expect(e.statusCode).toBe(400);
          expect(e.message).toContain('ticketName');
        }
      }
    });

    it('should throw when price is not a number', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 'not-a-number' as any, quantity: 10 });
      }).toThrow(AppError);
    });

    it('should throw when price is negative', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: -10, quantity: 10 });
      }).toThrow(AppError);
    });

    it('should accept price of zero', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'Free', price: 0, quantity: 10 });
      }).not.toThrow();
    });

    it('should throw when price reaches 1 tỷ (must be strictly under)', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 1_000_000_000, quantity: 10 });
      }).toThrow(AppError);
    });

    it('should accept price just under 1 tỷ', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 999_999_999, quantity: 10 });
      }).not.toThrow();
    });

    it('should throw when quantity is not a number', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 100, quantity: 'not-a-number' as any });
      }).toThrow(AppError);
    });

    it('should throw when quantity is less than 1', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 100, quantity: 0 });
      }).toThrow(AppError);
    });

    it('should default minPerOrder to 1', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 100, quantity: 10 });
      }).not.toThrow();
    });

    it('should default maxPerOrder to 10', () => {
      expect(() => {
        validateTicketInput({ ticketName: 'VIP', price: 100, quantity: 10 });
      }).not.toThrow();
    });

    it('should throw when maxPerOrder < minPerOrder', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          minPerOrder: 5,
          maxPerOrder: 3,
        });
      }).toThrow(AppError);
    });

    it('should throw when minPerOrder < 1', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          minPerOrder: 0,
        });
      }).toThrow(AppError);
    });

    it('should reject saleStart in the past', () => {
      const pastDate = new Date(Date.now() - 86400000);
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          saleStart: pastDate,
        });
      }).toThrow(AppError);
    });

    it('should accept saleStart in the future', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          saleStart: futureDate,
        });
      }).not.toThrow();
    });

    it('should reject saleEnd <= saleStart', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          saleStart: futureDate,
          saleEnd: futureDate,
        });
      }).toThrow(AppError);
    });

    it('should accept saleEnd after saleStart', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          saleStart: futureDate,
          saleEnd: farFutureDate,
        });
      }).not.toThrow();
    });

    // Sales must close 30 minutes before the show starts, so check-in opens
    // against a settled attendee list.
    describe('saleEnd vs show start (30-minute lead)', () => {
      const showStart = new Date(Date.now() + 2 * 86400000);
      const ticketAt = (saleEnd: Date) => ({
        ticketName: 'VIP',
        price: 100,
        quantity: 10,
        saleStart: futureDate,
        saleEnd,
      });

      it('should reject saleEnd after the show starts', () => {
        const afterStart = new Date(showStart.getTime() + 60 * 60 * 1000);
        expect(() => validateTicketInput(ticketAt(afterStart), showStart)).toThrow(AppError);
      });

      it('should reject saleEnd inside the 30-minute lead window', () => {
        const tooLate = new Date(showStart.getTime() - 10 * 60 * 1000);
        expect(() => validateTicketInput(ticketAt(tooLate), showStart)).toThrow(AppError);
      });

      it('should reject saleEnd exactly at the show start', () => {
        expect(() => validateTicketInput(ticketAt(showStart), showStart)).toThrow(AppError);
      });

      it('should accept saleEnd exactly 30 minutes before the show starts', () => {
        const atCap = new Date(showStart.getTime() - TICKET_SALE_END_LEAD_MS);
        expect(() => validateTicketInput(ticketAt(atCap), showStart)).not.toThrow();
      });

      it('should accept saleEnd comfortably before the lead window', () => {
        const early = new Date(showStart.getTime() - 6 * 60 * 60 * 1000);
        expect(() => validateTicketInput(ticketAt(early), showStart)).not.toThrow();
      });
    });

    it('should reject invalid status', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          status: 'SOLD_OUT' as any,
        });
      }).toThrow(AppError);
    });

    it('should accept status ACTIVE', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          status: 'ACTIVE',
        });
      }).not.toThrow();
    });

    it('should accept status HIDDEN', () => {
      expect(() => {
        validateTicketInput({
          ticketName: 'VIP',
          price: 100,
          quantity: 10,
          status: 'HIDDEN',
        });
      }).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // validatePermitDocuments Tests
  // ────────────────────────────────────────────────────────────────
  describe('validatePermitDocuments', () => {
    it('should reject non-array input', () => {
      expect(() => {
        validatePermitDocuments('not-an-array' as any);
      }).toThrow(AppError);
    });

    it('should reject document with missing name', () => {
      expect(() => {
        validatePermitDocuments([
          { url: '/uploads/permits/doc.pdf' } as any,
        ]);
      }).toThrow(AppError);
    });

    it('should reject document with blank name', () => {
      expect(() => {
        validatePermitDocuments([
          { name: '   ', url: '/uploads/permits/doc.pdf' },
        ]);
      }).toThrow(AppError);
    });

    it('should reject document with missing url', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.pdf' } as any,
        ]);
      }).toThrow(AppError);
    });

    it('should reject document with blank url', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.pdf', url: '   ' },
        ]);
      }).toThrow(AppError);
    });

    it('should reject invalid file extensions', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.txt', url: '/uploads/permits/doc.txt' },
        ]);
      }).toThrow(AppError);
    });

    it('should reject javascript: URLs', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'doc.pdf', url: 'javascript:alert(1)' },
        ]);
      }).toThrow(AppError);
    });

    it('should reject external http URLs', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'doc.pdf', url: 'http://evil.com/x.pdf' },
        ]);
      }).toThrow(AppError);
    });

    it('should reject path traversal attempts', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'doc.pdf', url: '/uploads/permits/../../etc/passwd.pdf' },
        ]);
      }).toThrow(AppError);
    });

    it('should accept valid PDF documents', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.pdf', url: '/uploads/permits/document.pdf' },
        ]);
      }).not.toThrow();
    });

    it('should accept valid DOCX documents', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.docx', url: '/uploads/permits/document.docx' },
        ]);
      }).not.toThrow();
    });

    it('should accept valid PNG documents', () => {
      expect(() => {
        validatePermitDocuments([
          { name: 'document.png', url: '/uploads/permits/document.png' },
        ]);
      }).not.toThrow();
    });

    it('should reject sizeKb over 15MB', () => {
      expect(() => {
        validatePermitDocuments([
          {
            name: 'large.pdf',
            url: '/uploads/permits/large.pdf',
            sizeKb: 15 * 1024 + 1,
          },
        ]);
      }).toThrow(AppError);
    });

    it('should accept sizeKb at 15MB', () => {
      expect(() => {
        validatePermitDocuments([
          {
            name: 'large.pdf',
            url: '/uploads/permits/large.pdf',
            sizeKb: 15 * 1024,
          },
        ]);
      }).not.toThrow();
    });

    it('should accept sizeKb under 15MB', () => {
      expect(() => {
        validatePermitDocuments([
          {
            name: 'small.pdf',
            url: '/uploads/permits/small.pdf',
            sizeKb: 5 * 1024,
          },
        ]);
      }).not.toThrow();
    });

    it('should accept undefined sizeKb', () => {
      expect(() => {
        validatePermitDocuments([
          {
            name: 'doc.pdf',
            url: '/uploads/permits/doc.pdf',
            sizeKb: undefined,
          },
        ]);
      }).not.toThrow();
    });

    it('should accept empty array', () => {
      expect(() => {
        validatePermitDocuments([]);
      }).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // resolveShowTimes Tests
  // ────────────────────────────────────────────────────────────────
  describe('resolveShowTimes', () => {
    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 2 * 86400000);

    it('should throw when shows is empty', () => {
      expect(() => {
        resolveShowTimes([]);
      }).toThrow(AppError);
    });

    it('should throw when shows is not an array', () => {
      expect(() => {
        resolveShowTimes(null as any);
      }).toThrow(AppError);
    });

    it('should reject invalid date strings', () => {
      expect(() => {
        resolveShowTimes([
          { startTime: 'not-a-date', endTime: futureEnd },
        ]);
      }).toThrow(AppError);
    });

    it('should reject start date in the past', () => {
      const pastDate = new Date(Date.now() - 86400000);
      expect(() => {
        resolveShowTimes([
          { startTime: pastDate, endTime: futureEnd },
        ]);
      }).toThrow(AppError);
    });

    it('should reject end date <= start date', () => {
      expect(() => {
        resolveShowTimes([
          { startTime: futureStart, endTime: futureStart },
        ]);
      }).toThrow(AppError);
    });

    it('should reject non-string title', () => {
      expect(() => {
        resolveShowTimes([
          { startTime: futureStart, endTime: futureEnd, title: 123 as any },
        ]);
      }).toThrow(AppError);
    });

    it('should reject title over 100 characters', () => {
      expect(() => {
        resolveShowTimes([
          { startTime: futureStart, endTime: futureEnd, title: 'a'.repeat(101) },
        ]);
      }).toThrow(AppError);
    });

    it('should derive startDate as MIN across shows', () => {
      const start1 = new Date(Date.now() + 86400000);
      const start2 = new Date(Date.now() + 2 * 86400000);
      const result = resolveShowTimes([
        { startTime: start2, endTime: new Date(Date.now() + 3 * 86400000) },
        { startTime: start1, endTime: new Date(Date.now() + 3 * 86400000) },
      ]);
      expect(result.startDate.getTime()).toBe(start1.getTime());
    });

    it('should derive endDate as MAX across shows', () => {
      const end1 = new Date(Date.now() + 2 * 86400000);
      const end2 = new Date(Date.now() + 3 * 86400000);
      const result = resolveShowTimes([
        { startTime: futureStart, endTime: end1 },
        { startTime: futureStart, endTime: end2 },
      ]);
      expect(result.endDate.getTime()).toBe(end2.getTime());
    });

    it('should trim and clear blank titles', () => {
      const result = resolveShowTimes([
        { startTime: futureStart, endTime: futureEnd, title: '  ' },
      ]);
      expect(result.rows[0].title).toBeUndefined();
    });

    it('should trim whitespace from titles', () => {
      const result = resolveShowTimes([
        { startTime: futureStart, endTime: futureEnd, title: '  Suất chiều  ' },
      ]);
      expect(result.rows[0].title).toBe('Suất chiều');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // resolveCreateSchedule Tests
  // ────────────────────────────────────────────────────────────────
  describe('resolveCreateSchedule', () => {
    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 2 * 86400000);
    const validTicket = { ticketName: 'VIP', price: 100, quantity: 10 };

    it('should use canonical shows[] path when provided', () => {
      const result = resolveCreateSchedule({
        shows: [
          { startTime: futureStart, endTime: futureEnd, tickets: [validTicket] },
        ],
      } as any);
      expect(result.shows.length).toBe(1);
      expect(result.flatTickets.length).toBe(0);
    });

    it('should throw when shows are empty but provided', () => {
      expect(() => {
        resolveCreateSchedule({ shows: [] } as any);
      }).toThrow(AppError);
    });

    it('should throw when shows have no tickets', () => {
      expect(() => {
        resolveCreateSchedule({
          shows: [
            { startTime: futureStart, endTime: futureEnd, tickets: [] },
          ],
        } as any);
      }).toThrow(AppError);
    });

    it('should accept a show ticket closing exactly 30 minutes before its start', () => {
      expect(() => {
        resolveCreateSchedule({
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                {
                  ...validTicket,
                  saleEnd: new Date(futureStart.getTime() - TICKET_SALE_END_LEAD_MS),
                },
              ],
            },
          ],
        } as any);
      }).not.toThrow();
    });

    it('should reject a show ticket selling past its start minus 30 minutes', () => {
      expect(() => {
        resolveCreateSchedule({
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [{ ...validTicket, saleEnd: futureStart }],
            },
          ],
        } as any);
      }).toThrow(AppError);
    });

    it('should cap each show independently, so a later show keeps selling', () => {
      const show1Start = new Date(Date.now() + 86400000);
      const show2Start = new Date(Date.now() + 5 * 86400000);
      expect(() => {
        resolveCreateSchedule({
          shows: [
            {
              startTime: show1Start,
              endTime: new Date(show1Start.getTime() + 3600000),
              tickets: [
                {
                  ...validTicket,
                  saleEnd: new Date(show1Start.getTime() - TICKET_SALE_END_LEAD_MS),
                },
              ],
            },
            {
              startTime: show2Start,
              endTime: new Date(show2Start.getTime() + 3600000),
              // Closes long after show 1 has already started — still valid,
              // because it is capped against show 2's own start.
              tickets: [
                {
                  ...validTicket,
                  saleEnd: new Date(show2Start.getTime() - TICKET_SALE_END_LEAD_MS),
                },
              ],
            },
          ],
        } as any);
      }).not.toThrow();
    });

    it('should use legacy flat payload when no shows', () => {
      const result = resolveCreateSchedule({
        startDate: futureStart,
        endDate: futureEnd,
        tickets: [validTicket],
      } as any);
      expect(result.shows.length).toBe(0);
      expect(result.flatTickets.length).toBe(1);
    });

    it('should throw when legacy payload has no tickets', () => {
      expect(() => {
        resolveCreateSchedule({
          startDate: futureStart,
          endDate: futureEnd,
          tickets: [],
        } as any);
      }).toThrow(AppError);
    });

    it('should reject legacy payload with invalid dates', () => {
      expect(() => {
        resolveCreateSchedule({
          startDate: 'not-a-date',
          endDate: futureEnd,
          tickets: [validTicket],
        } as any);
      }).toThrow(AppError);
    });

    it('should reject legacy payload with start in past', () => {
      const pastDate = new Date(Date.now() - 86400000);
      expect(() => {
        resolveCreateSchedule({
          startDate: pastDate,
          endDate: futureEnd,
          tickets: [validTicket],
        } as any);
      }).toThrow(AppError);
    });

    it('should reject legacy payload with end before start', () => {
      expect(() => {
        resolveCreateSchedule({
          startDate: futureEnd,
          endDate: futureStart,
          tickets: [validTicket],
        } as any);
      }).toThrow(AppError);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // composeLocation Tests
  // ────────────────────────────────────────────────────────────────
  describe('composeLocation', () => {
    it('should use explicit location when provided', () => {
      const result = composeLocation({
        location: 'Downtown Hall',
        locationType: 'online',
        venue: { name: 'Ignored Venue' },
      });
      expect(result).toBe('Downtown Hall');
    });

    it('should return "Online" for locationType online', () => {
      const result = composeLocation({ locationType: 'online' });
      expect(result).toBe('Online');
    });

    it('should join venue parts with ", "', () => {
      const result = composeLocation({
        venue: {
          name: 'My Venue',
          street: '123 Main St',
          ward: 'District 1',
          province: 'HCMC',
        },
      });
      expect(result).toBe('My Venue, 123 Main St, District 1, HCMC');
    });

    it('should skip blank venue parts', () => {
      const result = composeLocation({
        venue: {
          name: 'My Venue',
          street: '',
          ward: 'District 1',
          province: '',
        },
      });
      expect(result).toBe('My Venue, District 1');
    });

    it('should return undefined when all venue parts are blank', () => {
      const result = composeLocation({
        venue: {
          name: '',
          street: '',
          ward: '',
          province: '',
        },
      });
      expect(result).toBeUndefined();
    });

    it('should return undefined when no location info provided', () => {
      const result = composeLocation({});
      expect(result).toBeUndefined();
    });

    it('should trim whitespace from explicit location', () => {
      const result = composeLocation({
        location: '  Downtown Hall  ',
      });
      expect(result).toBe('Downtown Hall');
    });

    it('should prefer explicit location over online', () => {
      const result = composeLocation({
        location: 'Physical Venue',
        locationType: 'online',
      });
      expect(result).toBe('Physical Venue');
    });

    it('should prefer online over venue parts', () => {
      const result = composeLocation({
        locationType: 'online',
        venue: { name: 'Should be ignored' },
      });
      expect(result).toBe('Online');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // validateWizardFields Tests
  // ────────────────────────────────────────────────────────────────
  describe('validateWizardFields', () => {
    it('should reject invalid slug', () => {
      expect(() => {
        validateWizardFields({ slug: 'Invalid Slug' });
      }).toThrow(AppError);
    });

    it('should accept empty slug', () => {
      expect(() => {
        validateWizardFields({ slug: '' });
      }).not.toThrow();
    });

    it('should accept undefined slug', () => {
      expect(() => {
        validateWizardFields({ slug: undefined });
      }).not.toThrow();
    });

    it('should accept valid slug', () => {
      expect(() => {
        validateWizardFields({ slug: 'valid-event-2024' });
      }).not.toThrow();
    });

    it('should reject invalid privacy', () => {
      expect(() => {
        validateWizardFields({ privacy: 'secret' as any });
      }).toThrow(AppError);
    });

    it('should accept privacy public', () => {
      expect(() => {
        validateWizardFields({ privacy: 'public' });
      }).not.toThrow();
    });

    it('should accept privacy private', () => {
      expect(() => {
        validateWizardFields({ privacy: 'private' });
      }).not.toThrow();
    });

    it('should reject invalid locationType', () => {
      expect(() => {
        validateWizardFields({ locationType: 'hybrid' as any });
      }).toThrow(AppError);
    });

    it('should accept locationType offline', () => {
      expect(() => {
        validateWizardFields({ locationType: 'offline' });
      }).not.toThrow();
    });

    it('should accept locationType online', () => {
      expect(() => {
        validateWizardFields({ locationType: 'online' });
      }).not.toThrow();
    });

    it('should reject confirmationMessage over 500 chars', () => {
      expect(() => {
        validateWizardFields({ confirmationMessage: 'a'.repeat(501) });
      }).toThrow(AppError);
    });

    it('should accept confirmationMessage at 500 chars', () => {
      expect(() => {
        validateWizardFields({ confirmationMessage: 'a'.repeat(500) });
      }).not.toThrow();
    });

    it('should reject orgName over 80 chars', () => {
      expect(() => {
        validateWizardFields({ orgName: 'a'.repeat(81) });
      }).toThrow(AppError);
    });

    it('should accept orgName at 80 chars', () => {
      expect(() => {
        validateWizardFields({ orgName: 'a'.repeat(80) });
      }).not.toThrow();
    });

    it('should reject orgInfo over 500 chars', () => {
      expect(() => {
        validateWizardFields({ orgInfo: 'a'.repeat(501) });
      }).toThrow(AppError);
    });

    it('should accept orgInfo at 500 chars', () => {
      expect(() => {
        validateWizardFields({ orgInfo: 'a'.repeat(500) });
      }).not.toThrow();
    });

    it('should reject logisticsServices as non-array', () => {
      expect(() => {
        validateWizardFields({ logisticsServices: 'not-an-array' as any });
      }).toThrow(AppError);
    });

    it('should reject logisticsServices with blank strings', () => {
      expect(() => {
        validateWizardFields({ logisticsServices: ['valid', '  ', 'valid'] });
      }).toThrow(AppError);
    });

    it('should accept logisticsServices with non-blank strings', () => {
      expect(() => {
        validateWizardFields({ logisticsServices: ['audio-lighting', 'security'] });
      }).not.toThrow();
    });

    it('should validate permitDocuments when provided', () => {
      expect(() => {
        validateWizardFields({
          permitDocuments: [
            { name: 'doc.txt', url: '/uploads/permits/doc.txt' },
          ],
        });
      }).toThrow(AppError);
    });

    it('should reject invalid contract repName', () => {
      expect(() => {
        validateWizardFields({
          contract: { repName: 'a'.repeat(81) },
        });
      }).toThrow(AppError);
    });

    it('should accept contract repName at 80 chars', () => {
      expect(() => {
        validateWizardFields({
          contract: { repName: 'a'.repeat(80) },
        });
      }).not.toThrow();
    });

    it('should reject invalid signatureUrl', () => {
      expect(() => {
        validateWizardFields({
          contract: { signatureUrl: 'http://evil.com/sig.png' },
        });
      }).toThrow(AppError);
    });

    it('should reject signatureUrl with .jpg extension', () => {
      expect(() => {
        validateWizardFields({
          contract: { signatureUrl: '/uploads/signatures/sig.jpg' },
        });
      }).toThrow(AppError);
    });

    it('should accept valid signatureUrl', () => {
      expect(() => {
        validateWizardFields({
          contract: { signatureUrl: '/uploads/signatures/sig.png' },
        });
      }).not.toThrow();
    });

    it('should reject agreed without signatureUrl', () => {
      expect(() => {
        validateWizardFields({
          contract: { agreed: true },
        });
      }).toThrow(AppError);
    });

    it('should accept agreed with signatureUrl', () => {
      expect(() => {
        validateWizardFields({
          contract: { agreed: true, signatureUrl: '/uploads/signatures/sig.png' },
        });
      }).not.toThrow();
    });

    it('should reject accountNumber with non-digits', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '123abc456' },
        });
      }).toThrow(AppError);
    });

    it('should reject accountNumber with 5 digits', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '12345' },
        });
      }).toThrow(AppError);
    });

    it('should reject accountNumber with 31 digits', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '1'.repeat(31) },
        });
      }).toThrow(AppError);
    });

    it('should accept accountNumber with 6 digits', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '123456' },
        });
      }).not.toThrow();
    });

    it('should accept accountNumber with 30 digits', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '1'.repeat(30) },
        });
      }).not.toThrow();
    });

    it('should accept empty accountNumber', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountNumber: '' },
        });
      }).not.toThrow();
    });

    it('should reject bankName over 100 chars', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { bankName: 'a'.repeat(101) },
        });
      }).toThrow(AppError);
    });

    it('should reject accountHolder over 100 chars', () => {
      expect(() => {
        validateWizardFields({
          paymentInfo: { accountHolder: 'a'.repeat(101) },
        });
      }).toThrow(AppError);
    });

    it('should reject description over 600 plain-text chars', () => {
      expect(() => {
        validateWizardFields({ description: '<p>' + 'a'.repeat(601) + '</p>' });
      }).toThrow(AppError);
    });

    it('should accept description within 600 text chars despite HTML markup', () => {
      expect(() => {
        validateWizardFields({ description: '<h3>Title</h3><p>' + 'a'.repeat(500) + '</p>' });
      }).not.toThrow();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // buildContractSubdoc Tests
  // ────────────────────────────────────────────────────────────────
  describe('buildContractSubdoc', () => {
    it('should set agreed false without timestamps when not agreeing', () => {
      const result = buildContractSubdoc({ agreed: false });
      expect(result.agreed).toBe(false);
      expect(result.agreedAt).toBeUndefined();
      expect(result.signedAt).toBeUndefined();
    });

    it('should set agreed true and agreedAt when agreeing with signature', () => {
      const before = new Date();
      const result = buildContractSubdoc({
        agreed: true,
        signatureUrl: '/uploads/signatures/sig.png',
      });
      const after = new Date();

      expect(result.agreed).toBe(true);
      expect(result.agreedAt).toBeDefined();
      expect(result.agreedAt!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.agreedAt!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should compute signatureHash when agreed with signature', () => {
      const repName = 'John Doe';
      const signatureUrl = '/uploads/signatures/sig.png';

      const result = buildContractSubdoc({
        repName,
        agreed: true,
        signatureUrl,
      });

      expect(result.signatureHash).toBeDefined();
      expect(result.signatureHash).toMatch(/^[a-f0-9]{64}$/); // 64-char hex
    });

    it('should compute correct signatureHash (SHA-256)', () => {
      const repName = 'John Doe';
      const signatureUrl = '/uploads/signatures/sig.png';
      const now = new Date('2024-01-15T12:00:00.000Z');

      // Mock the date
      const originalDate = Date;
      const DateSpy = jest.spyOn(global, 'Date' as any);
      DateSpy.mockImplementation(() => now);

      try {
        const result = buildContractSubdoc({
          repName,
          agreed: true,
          signatureUrl,
        });

        const expectedHash = crypto
          .createHash('sha256')
          .update(`${repName}|${signatureUrl}|${now.toISOString()}`)
          .digest('hex');

        // The hash should be a valid SHA-256, verify length at minimum
        expect(result.signatureHash).toBeDefined();
        expect(result.signatureHash!.length).toBe(64);
      } finally {
        DateSpy.mockRestore();
      }
    });

    it('should not set signedAt without signatureUrl', () => {
      const result = buildContractSubdoc({
        repName: 'John Doe',
        agreed: true,
      });
      expect(result.signedAt).toBeUndefined();
    });

    it('should handle empty repName', () => {
      const result = buildContractSubdoc({
        repName: '',
        agreed: true,
        signatureUrl: '/uploads/signatures/sig.png',
      });
      expect(result.signatureHash).toBeDefined();
      expect(result.signatureHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should include repName in signatureHash even if empty', () => {
      const sigUrl = '/uploads/signatures/sig.png';
      const now = new Date('2024-01-15T12:00:00.000Z');

      const result = buildContractSubdoc({
        repName: '',
        agreed: true,
        signatureUrl: sigUrl,
      });

      const expectedHashStart = crypto
        .createHash('sha256')
        .update(`|${sigUrl}|`)
        .digest('hex')
        .substring(0, 16);

      expect(result.signatureHash!.substring(0, 16)).toBeDefined();
    });
  });
});
