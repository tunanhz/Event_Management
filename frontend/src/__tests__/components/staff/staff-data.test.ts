import {
  STAFF_EVENTS,
  getStaffEventById,
  normalizeCode,
  nowHHmm,
  summarizeTickets,
  breakdownByType,
  type StaffTicket,
  type CheckInStatus,
  type StaffEvent,
} from '@/components/staff/staff-checkin-data';
import { getCheckinHistory, LOG_STATUS_LABELS } from '@/components/staff/staff-history-data';
import {
  incidentTypeLabel,
  INCIDENT_TYPES,
  INCIDENT_STATUS_LABELS,
  STAFF_INCIDENTS
} from '@/components/staff/staff-incidents-data';
import {
  getAssignmentByEventId,
  STAFF_ASSIGNMENTS,
  TIMING_LABELS
} from '@/components/staff/staff-assignments-data';

describe('Staff Check-in Data', () => {
  describe('STAFF_EVENTS', () => {
    it('should have at least one event', () => {
      expect(STAFF_EVENTS.length).toBeGreaterThan(0);
    });

    it('should have three events in the seed data', () => {
      expect(STAFF_EVENTS.length).toBe(3);
    });

    it('should have unique event IDs', () => {
      const ids = STAFF_EVENTS.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(STAFF_EVENTS.length);
    });

    it('should have all required event properties', () => {
      STAFF_EVENTS.forEach((event) => {
        expect(event).toHaveProperty('id');
        expect(event).toHaveProperty('title');
        expect(event).toHaveProperty('dateTime');
        expect(event).toHaveProperty('venueName');
        expect(event).toHaveProperty('tickets');
        expect(Array.isArray(event.tickets)).toBe(true);
      });
    });

    it('should have tickets for each event', () => {
      STAFF_EVENTS.forEach((event) => {
        expect(event.tickets.length).toBeGreaterThan(0);
      });
    });

    it('should have valid ticket structure', () => {
      STAFF_EVENTS.forEach((event) => {
        event.tickets.forEach((ticket) => {
          expect(ticket).toHaveProperty('code');
          expect(ticket).toHaveProperty('attendeeName');
          expect(ticket).toHaveProperty('email');
          expect(ticket).toHaveProperty('orderCode');
          expect(ticket).toHaveProperty('ticketType');
          expect(ticket).toHaveProperty('checkedInAt');
        });
      });
    });

    it('should have non-empty ticket codes', () => {
      STAFF_EVENTS.forEach((event) => {
        event.tickets.forEach((ticket) => {
          expect(ticket.code.length).toBeGreaterThan(0);
          expect(ticket.code).toMatch(/^EVB-/);
        });
      });
    });

    it('should have checkedInAt as null or time string', () => {
      STAFF_EVENTS.forEach((event) => {
        event.tickets.forEach((ticket) => {
          if (ticket.checkedInAt !== null) {
            expect(ticket.checkedInAt).toMatch(/^\d{2}:\d{2}$/);
          }
        });
      });
    });
  });

  describe('getStaffEventById', () => {
    it('should return the correct event for valid ID', () => {
      const event = getStaffEventById('evt-acoustic');
      expect(event).toBeDefined();
      expect(event?.title).toContain('Acoustic');
    });

    it('should return undefined for non-existent ID', () => {
      const event = getStaffEventById('non-existent');
      expect(event).toBeUndefined();
    });

    it('should return full event data with tickets', () => {
      const event = getStaffEventById('evt-acoustic');
      expect(event?.tickets.length).toBeGreaterThan(0);
    });

    it('should have distinct events for each ID', () => {
      const evt1 = getStaffEventById('evt-acoustic');
      const evt2 = getStaffEventById('evt-tech');
      expect(evt1?.id).not.toBe(evt2?.id);
      expect(evt1?.title).not.toBe(evt2?.title);
    });
  });

  describe('normalizeCode', () => {
    it('should trim whitespace', () => {
      expect(normalizeCode('  EVB-3F7K-0192  ')).toBe('EVB-3F7K-0192');
    });

    it('should uppercase the code', () => {
      expect(normalizeCode('evb-3f7k-0192')).toBe('EVB-3F7K-0192');
    });

    it('should collapse multiple spaces', () => {
      expect(normalizeCode('EVB-3F7K  0192')).toBe('EVB-3F7K0192');
    });

    it('should handle mixed case and spaces', () => {
      expect(normalizeCode('  evb - 3f7k - 0192  ')).toBe('EVB-3F7K-0192');
    });

    it('should return uppercase with no spaces for scanner input', () => {
      const input = 'evB - 3F7k - 0192';
      const result = normalizeCode(input);
      expect(result).toBe('EVB-3F7K-0192');
      expect(/\s/.test(result)).toBe(false);
    });

    it('should handle tab characters', () => {
      expect(normalizeCode('EVB-3F7K\t0192')).toBe('EVB-3F7K0192');
    });

    it('should handle newline characters', () => {
      expect(normalizeCode('EVB-3F7K\n0192')).toBe('EVB-3F7K0192');
    });

    it('should remove the display prefix when staff paste a ticket code', () => {
      expect(normalizeCode('  #evb-3f7k-0192  ')).toBe('EVB-3F7K-0192');
    });
  });

  describe('nowHHmm', () => {
    it('should return current time in HH:mm format', () => {
      const result = nowHHmm();
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('should pad hours with leading zero', () => {
      // We can't easily test specific times, but we can check format
      const result = nowHHmm();
      const [hh, mm] = result.split(':');
      expect(hh.length).toBe(2);
      expect(mm.length).toBe(2);
    });

    it('should have valid hour range (00-23)', () => {
      const result = nowHHmm();
      const hours = parseInt(result.split(':')[0], 10);
      expect(hours).toBeGreaterThanOrEqual(0);
      expect(hours).toBeLessThanOrEqual(23);
    });

    it('should have valid minute range (00-59)', () => {
      const result = nowHHmm();
      const minutes = parseInt(result.split(':')[1], 10);
      expect(minutes).toBeGreaterThanOrEqual(0);
      expect(minutes).toBeLessThanOrEqual(59);
    });
  });

  describe('summarizeTickets', () => {
    it('should return object with required properties', () => {
      const summary = summarizeTickets(STAFF_EVENTS[0].tickets);
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('checkedIn');
      expect(summary).toHaveProperty('remaining');
      expect(summary).toHaveProperty('percent');
    });

    it('should count total tickets correctly', () => {
      const tickets = STAFF_EVENTS[0].tickets;
      const summary = summarizeTickets(tickets);
      expect(summary.total).toBe(tickets.length);
    });

    it('should count checked-in tickets correctly', () => {
      const tickets = STAFF_EVENTS[0].tickets;
      const checkedInCount = tickets.filter((t) => t.checkedInAt !== null).length;
      const summary = summarizeTickets(tickets);
      expect(summary.checkedIn).toBe(checkedInCount);
    });

    it('should calculate remaining correctly', () => {
      const tickets = STAFF_EVENTS[0].tickets;
      const summary = summarizeTickets(tickets);
      expect(summary.remaining).toBe(summary.total - summary.checkedIn);
    });

    it('should calculate percentage correctly', () => {
      const tickets = STAFF_EVENTS[0].tickets;
      const summary = summarizeTickets(tickets);
      const expectedPercent = Math.round((summary.checkedIn / summary.total) * 100);
      expect(summary.percent).toBe(expectedPercent);
    });

    it('should return 0% for empty array', () => {
      const summary = summarizeTickets([]);
      expect(summary.total).toBe(0);
      expect(summary.checkedIn).toBe(0);
      expect(summary.remaining).toBe(0);
      expect(summary.percent).toBe(0);
    });

    it('should return 100% when all tickets checked in', () => {
      const checkedInTickets: StaffTicket[] = [
        {
          code: 'TEST-001',
          attendeeName: 'Test',
          email: 'test@example.com',
          orderCode: 'ORD-001',
          ticketType: 'Standard',
          checkedInAt: '10:00',
        },
        {
          code: 'TEST-002',
          attendeeName: 'Test 2',
          email: 'test2@example.com',
          orderCode: 'ORD-001',
          ticketType: 'Standard',
          checkedInAt: '10:05',
        },
      ];
      const summary = summarizeTickets(checkedInTickets);
      expect(summary.percent).toBe(100);
    });

    it('should return 0% when no tickets checked in', () => {
      const uncheckedTickets: StaffTicket[] = [
        {
          code: 'TEST-001',
          attendeeName: 'Test',
          email: 'test@example.com',
          orderCode: 'ORD-001',
          ticketType: 'Standard',
          checkedInAt: null,
        },
        {
          code: 'TEST-002',
          attendeeName: 'Test 2',
          email: 'test2@example.com',
          orderCode: 'ORD-001',
          ticketType: 'Standard',
          checkedInAt: null,
        },
      ];
      const summary = summarizeTickets(uncheckedTickets);
      expect(summary.percent).toBe(0);
    });
  });

  describe('breakdownByType', () => {
    it('should return array of breakdowns', () => {
      const breakdown = breakdownByType(STAFF_EVENTS[0].tickets);
      expect(Array.isArray(breakdown)).toBe(true);
    });

    it('should have required properties for each type', () => {
      const breakdown = breakdownByType(STAFF_EVENTS[0].tickets);
      breakdown.forEach((row) => {
        expect(row).toHaveProperty('type');
        expect(row).toHaveProperty('total');
        expect(row).toHaveProperty('checkedIn');
      });
    });

    it('should group tickets by type', () => {
      const tickets: StaffTicket[] = [
        {
          code: 'T-001',
          attendeeName: 'Test 1',
          email: 'test1@example.com',
          orderCode: 'ORD-001',
          ticketType: 'VIP',
          checkedInAt: null,
        },
        {
          code: 'T-002',
          attendeeName: 'Test 2',
          email: 'test2@example.com',
          orderCode: 'ORD-001',
          ticketType: 'VIP',
          checkedInAt: '10:00',
        },
        {
          code: 'T-003',
          attendeeName: 'Test 3',
          email: 'test3@example.com',
          orderCode: 'ORD-002',
          ticketType: 'Standard',
          checkedInAt: null,
        },
      ];
      const breakdown = breakdownByType(tickets);
      expect(breakdown.length).toBe(2);
      const vip = breakdown.find((r) => r.type === 'VIP');
      const standard = breakdown.find((r) => r.type === 'Standard');
      expect(vip?.total).toBe(2);
      expect(standard?.total).toBe(1);
    });

    it('should count checked-in tickets per type', () => {
      const tickets: StaffTicket[] = [
        {
          code: 'T-001',
          attendeeName: 'Test 1',
          email: 'test1@example.com',
          orderCode: 'ORD-001',
          ticketType: 'VIP',
          checkedInAt: '10:00',
        },
        {
          code: 'T-002',
          attendeeName: 'Test 2',
          email: 'test2@example.com',
          orderCode: 'ORD-001',
          ticketType: 'VIP',
          checkedInAt: null,
        },
      ];
      const breakdown = breakdownByType(tickets);
      const vip = breakdown[0];
      expect(vip.checkedIn).toBe(1);
    });

    it('should return empty array for empty ticket list', () => {
      const breakdown = breakdownByType([]);
      expect(breakdown).toEqual([]);
    });

    it('should preserve insertion order of ticket types', () => {
      const tickets: StaffTicket[] = [
        {
          code: 'T-001',
          attendeeName: 'A',
          email: 'a@example.com',
          orderCode: 'O-001',
          ticketType: 'TypeA',
          checkedInAt: null,
        },
        {
          code: 'T-002',
          attendeeName: 'B',
          email: 'b@example.com',
          orderCode: 'O-002',
          ticketType: 'TypeB',
          checkedInAt: null,
        },
        {
          code: 'T-003',
          attendeeName: 'C',
          email: 'c@example.com',
          orderCode: 'O-003',
          ticketType: 'TypeA',
          checkedInAt: null,
        },
      ];
      const breakdown = breakdownByType(tickets);
      expect(breakdown[0].type).toBe('TypeA');
      expect(breakdown[1].type).toBe('TypeB');
    });
  });

  describe('Checkin History Data', () => {
    it('should have history for known events', () => {
      const history = getCheckinHistory('evt-acoustic');
      expect(Array.isArray(history)).toBe(true);
    });

    it('should return empty array for unknown events', () => {
      const history = getCheckinHistory('non-existent');
      expect(history).toEqual([]);
    });

    it('should have log entries with required properties', () => {
      const history = getCheckinHistory('evt-acoustic');
      history.forEach((entry) => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('time');
        expect(entry).toHaveProperty('code');
        expect(entry).toHaveProperty('status');
        expect(entry).toHaveProperty('staffName');
      });
    });

    it('should have valid LOG_STATUS_LABELS', () => {
      expect(Object.keys(LOG_STATUS_LABELS)).toContain('SUCCESS');
      expect(Object.keys(LOG_STATUS_LABELS)).toContain('FAILED');
      expect(Object.keys(LOG_STATUS_LABELS)).toContain('INVALID');
    });
  });

  describe('Incident Data', () => {
    it('should have incident types defined', () => {
      expect(INCIDENT_TYPES.length).toBeGreaterThan(0);
    });

    it('should have value and label for each incident type', () => {
      INCIDENT_TYPES.forEach((type) => {
        expect(type).toHaveProperty('value');
        expect(type).toHaveProperty('label');
        expect(typeof type.value).toBe('string');
        expect(typeof type.label).toBe('string');
      });
    });

    it('should have incident status labels', () => {
      expect(INCIDENT_STATUS_LABELS).toHaveProperty('PENDING');
      expect(INCIDENT_STATUS_LABELS).toHaveProperty('IN_REVIEW');
      expect(INCIDENT_STATUS_LABELS).toHaveProperty('RESOLVED');
    });

    it('should have staff incidents array', () => {
      expect(Array.isArray(STAFF_INCIDENTS)).toBe(true);
    });

    it('should have unique incident IDs', () => {
      const ids = STAFF_INCIDENTS.map((i) => i.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(STAFF_INCIDENTS.length);
    });

    it('should have valid incident status values', () => {
      STAFF_INCIDENTS.forEach((incident) => {
        expect(['PENDING', 'IN_REVIEW', 'RESOLVED']).toContain(incident.status);
      });
    });

    it('should have incident type label function', () => {
      const label = incidentTypeLabel('fake-ticket');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should return value if type not found', () => {
      const label = incidentTypeLabel('unknown-type' as any);
      expect(label).toBe('unknown-type');
    });
  });

  describe('Staff Assignment Data', () => {
    it('should have assignments array', () => {
      expect(Array.isArray(STAFF_ASSIGNMENTS)).toBe(true);
    });

    it('should have all required assignment properties', () => {
      STAFF_ASSIGNMENTS.forEach((assignment) => {
        expect(assignment).toHaveProperty('eventId');
        expect(assignment).toHaveProperty('responsibility');
        expect(assignment).toHaveProperty('gate');
        expect(assignment).toHaveProperty('shift');
        expect(assignment).toHaveProperty('timing');
      });
    });

    it('should have valid timing values', () => {
      STAFF_ASSIGNMENTS.forEach((assignment) => {
        expect(['today', 'upcoming']).toContain(assignment.timing);
      });
    });

    it('should have TIMING_LABELS map', () => {
      expect(TIMING_LABELS.today).toBe('Hôm nay');
      expect(TIMING_LABELS.upcoming).toBe('Sắp diễn ra');
    });

    it('should retrieve assignment by event ID', () => {
      const assignment = getAssignmentByEventId('evt-acoustic');
      expect(assignment).toBeDefined();
      expect(assignment?.eventId).toBe('evt-acoustic');
    });

    it('should return undefined for non-existent event', () => {
      const assignment = getAssignmentByEventId('non-existent');
      expect(assignment).toBeUndefined();
    });

    it('should have assignments in soonest-first order', () => {
      // Today should come before upcoming
      const todayAssignments = STAFF_ASSIGNMENTS.filter((a) => a.timing === 'today');
      const upcomingAssignments = STAFF_ASSIGNMENTS.filter((a) => a.timing === 'upcoming');
      const lastTodayIndex = Math.max(
        ...todayAssignments.map((a) => STAFF_ASSIGNMENTS.indexOf(a))
      );
      const firstUpcomingIndex = Math.min(
        ...upcomingAssignments.map((a) => STAFF_ASSIGNMENTS.indexOf(a))
      );
      expect(lastTodayIndex).toBeLessThan(firstUpcomingIndex);
    });
  });

  describe('Data consistency', () => {
    it('should have assignments for events that have tickets', () => {
      STAFF_EVENTS.forEach((event) => {
        const assignment = getAssignmentByEventId(event.id);
        expect(assignment).toBeDefined();
      });
    });

    it('should reference valid events in incidents', () => {
      const eventIds = STAFF_EVENTS.map((e) => e.id);
      STAFF_INCIDENTS.forEach((incident) => {
        expect(eventIds).toContain(incident.eventId);
      });
    });

    it('should reference valid events in assignments', () => {
      const eventIds = STAFF_EVENTS.map((e) => e.id);
      STAFF_ASSIGNMENTS.forEach((assignment) => {
        expect(eventIds).toContain(assignment.eventId);
      });
    });
  });

  describe('Data validation', () => {
    it('should have non-empty strings for all event properties', () => {
      STAFF_EVENTS.forEach((event) => {
        expect(event.id.length).toBeGreaterThan(0);
        expect(event.title.length).toBeGreaterThan(0);
        expect(event.dateTime.length).toBeGreaterThan(0);
        expect(event.venueName.length).toBeGreaterThan(0);
      });
    });

    it('should have Vietnamese labels', () => {
      expect(TIMING_LABELS.today).toMatch(/[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i);
      expect(INCIDENT_STATUS_LABELS.PENDING).toMatch(
        /[a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
      );
    });
  });
});
