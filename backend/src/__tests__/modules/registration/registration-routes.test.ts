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
import mongoose from 'mongoose';

describe('Registration Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('POST /api/registrations', () => {
    it('should create a registration for a published event', async () => {
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

      const res = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 2,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('_id');
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.quantity).toBe(2);
      expect(res.body.data.totalAmount).toBe(200000);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).post('/api/registrations').send({
        eventId: '507f1f77bcf86cd799439011',
        ticketId: '507f1f77bcf86cd799439012',
        quantity: 1,
      });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not a PARTICIPANT', async () => {
      const admin = await createAuthedUser('ADMIN');
      const res = await request(app)
        .post('/api/registrations')
        .set('Cookie', admin.cookie)
        .send({
          eventId: '507f1f77bcf86cd799439011',
          ticketId: '507f1f77bcf86cd799439012',
          quantity: 1,
        });

      expect(res.status).toBe(403);
    });

    it('should reject registration for an unpublished event', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Draft Event',
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
        status: 'draft',
        isFree: false,
        isFeatured: false,
        isTrending: false,
        priceFrom: 0,
        reviewStatus: 'DRAFT',
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

      const res = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      expect(res.status).toBe(404);
    });

    it('should reject quantity exceeding maxPerOrder', async () => {
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
        maxPerOrder: 5,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 10,
        });

      expect(res.status).toBe(400);
    });

    it('should reject quantity exceeding remaining stock', async () => {
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
        soldQuantity: 45,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 10,
        });

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/registrations/me', () => {
    it('should return only the caller\'s registrations', async () => {
      const participant1 = await createAuthedUser('PARTICIPANT');
      const participant2 = await createAuthedUser('PARTICIPANT');
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

      await request(app)
        .post('/api/registrations')
        .set('Cookie', participant1.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      await request(app)
        .post('/api/registrations')
        .set('Cookie', participant2.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 2,
        });

      const res = await request(app).get('/api/registrations/me').set('Cookie', participant1.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].quantity).toBe(1);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/registrations/me');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not a PARTICIPANT', async () => {
      const admin = await createAuthedUser('ADMIN');
      const res = await request(app).get('/api/registrations/me').set('Cookie', admin.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/registrations/:id', () => {
    it('should return registration detail with joined event/ticket', async () => {
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 2,
        });

      const regId = createRes.body.data._id;

      const res = await request(app)
        .get(`/api/registrations/${regId}`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(regId);
      expect(res.body.data.quantity).toBe(2);
    });

    it('should return 404 for unknown registration', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const unknownId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/registrations/${unknownId}`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(404);
    });

    it('should return 404 for foreign registration (privacy)', async () => {
      const participant1 = await createAuthedUser('PARTICIPANT');
      const participant2 = await createAuthedUser('PARTICIPANT');
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant1.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      const regId = createRes.body.data._id;

      const res = await request(app)
        .get(`/api/registrations/${regId}`)
        .set('Cookie', participant2.cookie);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/registrations/:id/cancel', () => {
    it('should cancel a PENDING registration', async () => {
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

      const ticket = await Ticket.create({
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 5,
        });

      const regId = createRes.body.data._id;

      const beforeTicket = await Ticket.findById(ticketId);
      expect(beforeTicket?.soldQuantity).toBe(5);

      const res = await request(app)
        .post(`/api/registrations/${regId}/cancel`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('CANCELLED');

      const afterTicket = await Ticket.findById(ticketId);
      expect(afterTicket?.soldQuantity).toBe(0);
    });

    it('should return 401 if unauthenticated', async () => {
      const regId = new mongoose.Types.ObjectId();
      const res = await request(app).post(`/api/registrations/${regId}/cancel`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for foreign registration', async () => {
      const participant1 = await createAuthedUser('PARTICIPANT');
      const participant2 = await createAuthedUser('PARTICIPANT');
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant1.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      const regId = createRes.body.data._id;

      const res = await request(app)
        .post(`/api/registrations/${regId}/cancel`)
        .set('Cookie', participant2.cookie);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/registrations/:id/confirm-payment', () => {
    it('should confirm payment for a PENDING registration', async () => {
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      const regId = createRes.body.data._id;

      const res = await request(app)
        .post(`/api/registrations/${regId}/confirm-payment`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.registration.status).toBe('PAID');
      expect(res.body.data.registration.ticketCode).toMatch(/^EVB-[A-F0-9]{6}-[A-Z0-9]{4}$/);
      expect(res.body.data.payment).toBeDefined();
    });

    it('should return 401 if unauthenticated', async () => {
      const regId = new mongoose.Types.ObjectId();
      const res = await request(app).post(`/api/registrations/${regId}/confirm-payment`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for foreign registration', async () => {
      const participant1 = await createAuthedUser('PARTICIPANT');
      const participant2 = await createAuthedUser('PARTICIPANT');
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

      const createRes = await request(app)
        .post('/api/registrations')
        .set('Cookie', participant1.cookie)
        .send({
          eventId: eventId.toString(),
          ticketId: ticketId.toString(),
          quantity: 1,
        });

      const regId = createRes.body.data._id;

      const res = await request(app)
        .post(`/api/registrations/${regId}/confirm-payment`)
        .set('Cookie', participant2.cookie);

      expect(res.status).toBe(404);
    });
  });
});
