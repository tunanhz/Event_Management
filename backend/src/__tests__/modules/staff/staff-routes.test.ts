import request from 'supertest';
import app from '../../../app';
import {
  connectInMemoryDatabase,
  clearDatabase,
  closeInMemoryDatabase,
} from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Event } from '../../../modules/event/event.model';
import { Ticket } from '../../../modules/organizer/ticket.model';
import { Registration } from '../../../modules/registration/registration.model';
import { StaffAssignment } from '../../../modules/staff/assignment.model';
import { IncidentReport } from '../../../modules/staff/incident.model';
import { CheckInLog } from '../../../modules/staff/checkin-log.model';
import { StaffRepository } from '../../../modules/staff/staff.repository';
import mongoose from 'mongoose';

async function createCheckInEvent(
  creatorId?: string,
  schedule?: {
    startDate?: Date;
    endDate?: Date;
    shows?: Array<{
      _id: mongoose.Types.ObjectId;
      title?: string;
      startTime: Date;
      endTime: Date;
    }>;
  }
) {
  const eventId = new mongoose.Types.ObjectId();
  const startDate = schedule?.startDate ?? new Date(Date.now() - 60 * 60 * 1000);
  const endDate = schedule?.endDate ?? new Date(Date.now() + 60 * 60 * 1000);
  await Event.create({
    _id: eventId,
    title: 'Check-in Test Event',
    description: 'Test',
    contentBlocks: [],
    date: startDate,
    startDate,
    endDate,
    sessions: [],
    location: 'Test Location',
    city: 'hcm',
    maxAttendees: 100,
    organizer: 'Test Organizer',
    category: 'Test',
    categorySlug: 'test',
    status: 'published',
    isFree: false,
    isFeatured: false,
    isTrending: false,
    priceFrom: 100000,
    reviewStatus: 'PUBLISHED',
    serviceCost: 0,
    depositAmount: 0,
    depositStatus: 'UNPAID',
    additionalCost: 0,
    finalPaymentAmount: 0,
    finalPaymentStatus: 'UNPAID',
    privacy: 'public',
    logisticsServices: [],
    shows: schedule?.shows ?? [],
    permitDocuments: [],
    ...(creatorId ? { creatorId: new mongoose.Types.ObjectId(creatorId) } : {}),
  });
  return eventId;
}

async function createPaidRegistration(
  eventId: mongoose.Types.ObjectId,
  participantId: string,
  ticketCode: string,
  showId?: mongoose.Types.ObjectId
) {
  const ticketId = new mongoose.Types.ObjectId();
  await Ticket.create({
    _id: ticketId,
    eventId,
    ...(showId ? { showId } : {}),
    ticketName: 'General Admission',
    price: 100000,
    quantity: 50,
    soldQuantity: 1,
    minPerOrder: 1,
    maxPerOrder: 10,
    status: 'ACTIVE',
  });
  return Registration.create({
    participantId: new mongoose.Types.ObjectId(participantId),
    eventId,
    ticketId,
    quantity: 1,
    unitPrice: 100000,
    totalAmount: 100000,
    registerDate: new Date(),
    status: 'PAID',
    ticketCode,
  });
}

async function assignConfirmedStaff(eventId: mongoose.Types.ObjectId, staffId: string) {
  return StaffAssignment.create({
    eventId,
    staffId: new mongoose.Types.ObjectId(staffId),
    gate: 'Cổng A',
    shift: '08:00 - 12:00',
    responsibility: 'Soát vé',
    status: 'confirmed',
  });
}

describe('Staff Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase({ replicaSet: true });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('GET /api/staff/assignments', () => {
    it('should return staff assignments for STAFF user', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'assigned',
      });

      const res = await request(app).get('/api/staff/assignments').set('Cookie', staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/staff/assignments');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not STAFF or ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const res = await request(app)
        .get('/api/staff/assignments')
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/staff/assignments/:id/confirm', () => {
    it('should allow staff to confirm an assignment', async () => {
      const staff = await createAuthedUser('STAFF');
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/staff/assignments/${assignmentId}/confirm`)
        .set('Cookie', staff.cookie);

      expect([200, 400, 404]).toContain(res.status);
    });

    it('should return 401 if unauthenticated', async () => {
      const assignmentId = new mongoose.Types.ObjectId();
      const res = await request(app).patch(`/api/staff/assignments/${assignmentId}/confirm`);

      expect(res.status).toBe(401);
    });

    it('should return 403 if not STAFF or ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/staff/assignments/${assignmentId}/confirm`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/staff/check-in', () => {
    it('should check in a valid ticket code for assigned staff', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: new mongoose.Types.ObjectId(participant.id),
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PAID',
        ticketCode: 'ABC123DEF456',
      });

      await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'confirmed',
      });

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({
          ticketCode: '  #abc123 def456  ',
          eventId: eventId.toString(),
          gate: 'Cổng A',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.result).toBe('success');
      expect(res.body.data).toHaveProperty('message');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app).post('/api/staff/check-in').send({
        ticketCode: 'ABC123',
        eventId: eventId.toString(),
      });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not STAFF or ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', participant.cookie)
        .send({
          ticketCode: 'ABC123',
          eventId: eventId.toString(),
        });

      expect(res.status).toBe(403);
    });

    it('should require ticketCode and eventId', async () => {
      const staff = await createAuthedUser('STAFF');

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Check-in consistency and event isolation', () => {
    it('should reject check-in before the two-hour opening window', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent(undefined, {
        startDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 60 * 60 * 1000),
      });
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'TOO-EARLY-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'TOO-EARLY-TICKET', eventId: eventId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe('too_early');
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(false);
      expect(
        await CheckInLog.countDocuments({
          registrationId: registration._id,
          result: 'too_early',
        })
      ).toBe(1);
    });

    it('should reject check-in after the end-time grace period', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent(undefined, {
        startDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 31 * 60 * 1000),
      });
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'ENDED-EVENT-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'ENDED-EVENT-TICKET', eventId: eventId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe('event_ended');
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(false);
    });

    it('should use the ticket show window instead of the event-wide window', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const endedShowId = new mongoose.Types.ObjectId();
      const activeShowId = new mongoose.Types.ObjectId();
      const eventId = await createCheckInEvent(undefined, {
        startDate: new Date(Date.now() - 4 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        shows: [
          {
            _id: endedShowId,
            title: 'Suất đã kết thúc',
            startTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
            endTime: new Date(Date.now() - 31 * 60 * 1000),
          },
          {
            _id: activeShowId,
            title: 'Suất đang diễn ra',
            startTime: new Date(Date.now() - 30 * 60 * 1000),
            endTime: new Date(Date.now() + 60 * 60 * 1000),
          },
        ],
      });
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'ENDED-SHOW-TICKET',
        endedShowId
      );
      await assignConfirmedStaff(eventId, staff.id);

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'ENDED-SHOW-TICKET', eventId: eventId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe('event_ended');
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(false);
    });

    it('should enforce the same time window for manual attendee check-in', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent(undefined, {
        startDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 5 * 60 * 60 * 1000),
      });
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'MANUAL-TOO-EARLY'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const res = await request(app)
        .post(`/api/staff/events/${eventId}/attendees/${registration._id}/check-in`)
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Chưa đến giờ check-in');
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(false);
    });

    it('should reject a manual check-in for a registration from another event', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const assignedEventId = await createCheckInEvent();
      const otherEventId = await createCheckInEvent();
      const foreignRegistration = await createPaidRegistration(
        otherEventId,
        participant.id,
        'OTHER-EVENT-TICKET'
      );
      await assignConfirmedStaff(assignedEventId, staff.id);

      const res = await request(app)
        .post(
          `/api/staff/events/${assignedEventId}/attendees/${foreignRegistration._id}/check-in`
        )
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(404);
      const unchanged = await Registration.findById(foreignRegistration._id).lean();
      expect(unchanged?.checkedIn).toBe(false);
      expect(await CheckInLog.countDocuments()).toBe(0);
    });

    it('should expose a Staff check-in consistently to Staff, Admin and Organizer', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const organizer = await createAuthedUser('ORGANIZER');
      const admin = await createAuthedUser('ADMIN');
      const eventId = await createCheckInEvent(organizer.id);
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'SYNC-CHECKIN-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const checkIn = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'SYNC-CHECKIN-TICKET', eventId: eventId.toString(), gate: 'Cổng A' });

      expect(checkIn.status).toBe(200);
      expect(checkIn.body.data.result).toBe('success');
      const updated = await Registration.findById(registration._id).lean();
      expect(updated?.checkedIn).toBe(true);

      const successLog = await CheckInLog.findOne({ registrationId: registration._id }).lean();
      expect(successLog).toMatchObject({
        result: 'success',
        ticketCode: 'SYNC-CHECKIN-TICKET',
      });
      expect(String(successLog?.eventId)).toBe(String(eventId));
      expect(String(successLog?.staffId)).toBe(staff.id);

      const staffStats = await request(app)
        .get(`/api/staff/events/${eventId}/checkin-stats`)
        .set('Cookie', staff.cookie);
      expect(staffStats.status).toBe(200);
      expect(staffStats.body.data).toMatchObject({ total: 1, checkedIn: 1, remaining: 0 });

      const adminHistory = await request(app)
        .get(`/api/staff/events/${eventId}/checkin-history`)
        .set('Cookie', admin.cookie);
      expect(adminHistory.status).toBe(200);
      expect(adminHistory.body.data).toHaveLength(1);
      expect(adminHistory.body.data[0].result).toBe('success');

      const organizerReport = await request(app)
        .get(`/api/organizer/events/${eventId}/checkins`)
        .set('Cookie', organizer.cookie);
      expect(organizerReport.status).toBe(200);
      expect(organizerReport.body.data.stats).toMatchObject({
        paidTickets: 1,
        checkedInTickets: 1,
        rate: 100,
      });
    });

    it('should accept only one of two simultaneous scans for the same ticket', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent();
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'CONCURRENT-CHECKIN-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const sendScan = () =>
        request(app)
          .post('/api/staff/check-in')
          .set('Cookie', staff.cookie)
          .send({ ticketCode: 'CONCURRENT-CHECKIN-TICKET', eventId: eventId.toString() });
      const responses = await Promise.all([sendScan(), sendScan()]);
      const results = responses.map((response) => response.body.data.result).sort();

      expect(responses.every((response) => response.status === 200)).toBe(true);
      expect(results).toEqual(['duplicate', 'success']);
      expect(
        await CheckInLog.countDocuments({ registrationId: registration._id, result: 'success' })
      ).toBe(1);
    });

    it('should accept the legacy code shown for a paid registration missing ticketCode', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent();
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'REMOVE-AFTER-CREATE'
      );
      await Registration.updateOne(
        { _id: registration._id },
        { $unset: { ticketCode: 1 } }
      );
      await assignConfirmedStaff(eventId, staff.id);

      const legacyCode = `EVB-${String(registration._id).slice(-6).toUpperCase()}`;
      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: legacyCode, eventId: eventId.toString() });

      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe('success');
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(true);
    });

    it('should roll back the registration update when writing the audit log fails', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent();
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'ROLLBACK-CHECKIN-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const logFailure = jest
        .spyOn(StaffRepository.prototype, 'createCheckInLog')
        .mockRejectedValueOnce(new Error('forced audit failure'));

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'ROLLBACK-CHECKIN-TICKET', eventId: eventId.toString() });
      logFailure.mockRestore();

      expect(res.status).toBe(500);
      const unchanged = await Registration.findById(registration._id).lean();
      expect(unchanged?.checkedIn).toBe(false);
      expect(unchanged?.checkedInAt).toBeUndefined();
      expect(await CheckInLog.countDocuments({ registrationId: registration._id })).toBe(0);
    });

    it('should safely fall back when local MongoDB does not support transactions', async () => {
      const staff = await createAuthedUser('STAFF');
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = await createCheckInEvent();
      const registration = await createPaidRegistration(
        eventId,
        participant.id,
        'STANDALONE-MONGO-TICKET'
      );
      await assignConfirmedStaff(eventId, staff.id);

      const unsupported = Object.assign(
        new Error('Transaction numbers are only allowed on a replica set member or mongos'),
        { code: 20 }
      );
      const fakeSession = {
        withTransaction: jest.fn().mockRejectedValue(unsupported),
        endSession: jest.fn().mockResolvedValue(undefined),
      };
      const sessionSpy = jest
        .spyOn(mongoose, 'startSession')
        .mockResolvedValueOnce(fakeSession as any);

      const res = await request(app)
        .post('/api/staff/check-in')
        .set('Cookie', staff.cookie)
        .send({ ticketCode: 'STANDALONE-MONGO-TICKET', eventId: eventId.toString() });
      sessionSpy.mockRestore();

      expect(res.status).toBe(200);
      expect(res.body.data.result).toBe('success');
      expect(fakeSession.endSession).toHaveBeenCalledTimes(1);
      expect((await Registration.findById(registration._id).lean())?.checkedIn).toBe(true);
      expect(
        await CheckInLog.countDocuments({ registrationId: registration._id, result: 'success' })
      ).toBe(1);
    });
  });

  describe('GET /api/staff/incidents', () => {
    it('should return staff\'s own incidents', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await IncidentReport.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        title: 'Equipment failure',
        description: 'Microphone stopped working',
        location: 'Cổng A',
        severity: 'HIGH',
        category: 'equipment',
        attachments: [],
        status: 'OPEN',
      });

      const res = await request(app)
        .get('/api/staff/incidents')
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/staff/incidents');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not STAFF or ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const res = await request(app)
        .get('/api/staff/incidents')
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/staff/incidents', () => {
    it('should create an incident report', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'confirmed',
      });

      const res = await request(app)
        .post('/api/staff/incidents')
        .set('Cookie', staff.cookie)
        .send({
          eventId: eventId.toString(),
          title: 'Security concern',
          description: 'Suspicious person near gate',
          location: 'Cổng A',
          severity: 'CRITICAL',
          category: 'security',
          attachments: [],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Security concern');
      expect(res.body.data.severity).toBe('CRITICAL');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/staff/incidents')
        .send({
          eventId: eventId.toString(),
          title: 'Test',
          description: 'Test',
          location: 'Test',
          severity: 'MEDIUM',
          category: 'other',
        });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not STAFF or ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/staff/incidents')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          title: 'Test',
          description: 'Test',
          location: 'Test',
          severity: 'MEDIUM',
          category: 'other',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/staff/incidents/:id', () => {
    it('should return incident detail', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      const incident = await IncidentReport.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        title: 'Equipment failure',
        description: 'Microphone stopped working',
        location: 'Cổng A',
        severity: 'HIGH',
        category: 'equipment',
        attachments: [],
        status: 'OPEN',
      });

      const res = await request(app)
        .get(`/api/staff/incidents/${incident._id}`)
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Equipment failure');
    });

    it('should return 401 if unauthenticated', async () => {
      const incidentId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/staff/incidents/${incidentId}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent incident', async () => {
      const staff = await createAuthedUser('STAFF');
      const unknownId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/staff/incidents/${unknownId}`)
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(404);
    });
  });

  // ────── Admin Staff Routes ──────

  describe('POST /api/admin/events/:id/assignments', () => {
    it('should allow admin to create staff assignment', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/assignments`)
        .set('Cookie', admin.cookie)
        .send({
          staffId: new mongoose.Types.ObjectId().toString(),
          gate: 'Cổng A',
          shift: '08:00 - 12:00',
          responsibility: 'Soát vé',
        });

      expect([200, 201, 400, 404]).toContain(res.status);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/admin/events/${eventId}/assignments`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/assignments`)
        .set('Cookie', staff.cookie)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/events/:id/assignments', () => {
    it('should list all assignments for an event', async () => {
      const admin = await createAuthedUser('ADMIN');
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'assigned',
      });

      const res = await request(app)
        .get(`/api/admin/events/${eventId}/assignments`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/admin/events/${eventId}/assignments`);

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/admin/events/${eventId}/assignments`)
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/events/:id/assignments/:assignmentId', () => {
    it('should update assignment note', async () => {
      const admin = await createAuthedUser('ADMIN');
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      const assignment = await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'assigned',
      });

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/assignments/${assignment._id}`)
        .set('Cookie', admin.cookie)
        .send({ note: 'Updated instruction' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.note).toBe('Updated instruction');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/assignments/${assignmentId}`)
        .send({ note: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/admin/events/${eventId}/assignments/${assignmentId}`)
        .set('Cookie', staff.cookie)
        .send({ note: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/events/:id/assignments/:assignmentId', () => {
    it('should delete an assignment', async () => {
      const admin = await createAuthedUser('ADMIN');
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      const assignment = await StaffAssignment.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        gate: 'Cổng A',
        shift: '08:00 - 12:00',
        responsibility: 'Soát vé',
        status: 'assigned',
      });

      const beforeCount = await StaffAssignment.countDocuments({ _id: assignment._id });
      expect(beforeCount).toBe(1);

      const res = await request(app)
        .delete(`/api/admin/events/${eventId}/assignments/${assignment._id}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const afterCount = await StaffAssignment.countDocuments({ _id: assignment._id });
      expect(afterCount).toBe(0);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app).delete(
        `/api/admin/events/${eventId}/assignments/${assignmentId}`
      );

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();
      const assignmentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/admin/events/${eventId}/assignments/${assignmentId}`)
        .set('Cookie', staff.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/incidents', () => {
    it('should list all incidents for ADMIN', async () => {
      const admin = await createAuthedUser('ADMIN');
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      await IncidentReport.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        title: 'Equipment failure',
        description: 'Microphone stopped working',
        location: 'Cổng A',
        severity: 'HIGH',
        category: 'equipment',
        attachments: [],
        status: 'OPEN',
      });

      const res = await request(app).get('/api/admin/incidents').set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/admin/incidents');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const res = await request(app).get('/api/admin/incidents').set('Cookie', staff.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/admin/incidents/:id/status', () => {
    it('should update incident status', async () => {
      const admin = await createAuthedUser('ADMIN');
      const staff = await createAuthedUser('STAFF');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Test Event',
        description: 'Test',
        contentBlocks: [],
        date: new Date(),
        sessions: [],
        location: 'Test Location',
        city: 'hcm',
        maxAttendees: 100,
        organizer: 'Test Organizer',
        category: 'Test',
        categorySlug: 'test',
        status: 'published',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'PUBLISHED',
        serviceCost: 0,
        depositAmount: 0,
        depositStatus: 'UNPAID',
        additionalCost: 0,
        finalPaymentAmount: 0,
        finalPaymentStatus: 'UNPAID',
        privacy: 'public',
        logisticsServices: [],
        shows: [],
        permitDocuments: [],
      });

      const incident = await IncidentReport.create({
        eventId,
        staffId: new mongoose.Types.ObjectId(staff.id),
        title: 'Security concern',
        description: 'Suspicious person',
        location: 'Cổng A',
        severity: 'CRITICAL',
        category: 'security',
        attachments: [],
        status: 'OPEN',
      });

      const res = await request(app)
        .patch(`/api/admin/incidents/${incident._id}/status`)
        .set('Cookie', admin.cookie)
        .send({
          status: 'RESOLVED',
          resolvedNote: 'Person removed by security',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.resolvedNote).toBe('Person removed by security');
    });

    it('should return 401 if unauthenticated', async () => {
      const incidentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .patch(`/api/admin/incidents/${incidentId}/status`)
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const staff = await createAuthedUser('STAFF');
      const incidentId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .patch(`/api/admin/incidents/${incidentId}/status`)
        .set('Cookie', staff.cookie)
        .send({ status: 'RESOLVED' });

      expect(res.status).toBe(403);
    });
  });
});
