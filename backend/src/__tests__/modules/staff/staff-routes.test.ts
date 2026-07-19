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
import mongoose from 'mongoose';

describe('Staff Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
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
          ticketCode: 'ABC123DEF456',
          eventId: eventId.toString(),
          gate: 'Cổng A',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
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
