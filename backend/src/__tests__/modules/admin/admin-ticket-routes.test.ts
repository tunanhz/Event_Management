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

describe('Admin Ticket Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('GET /api/admin/tickets', () => {
    it('should list all tickets for ADMIN', async () => {
      const admin = await createAuthedUser('ADMIN');
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
        soldQuantity: 10,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const res = await request(app).get('/api/admin/tickets').set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/admin/tickets');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const res = await request(app)
        .get('/api/admin/tickets')
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(403);
    });

    it('should filter by eventId', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId1 = new mongoose.Types.ObjectId();
      const eventId2 = new mongoose.Types.ObjectId();
      const ticketId1 = new mongoose.Types.ObjectId();
      const ticketId2 = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId1,
        title: 'Event 1',
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

      await Event.create({
        _id: eventId2,
        title: 'Event 2',
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
        _id: ticketId1,
        eventId: eventId1,
        ticketName: 'Ticket 1',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      await Ticket.create({
        _id: ticketId2,
        eventId: eventId2,
        ticketName: 'Ticket 2',
        price: 200000,
        quantity: 100,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .get('/api/admin/tickets')
        .query({ eventId: eventId1.toString() })
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].ticketName).toBe('Ticket 1');
    });

    it('should filter by status', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId1 = new mongoose.Types.ObjectId();
      const ticketId2 = new mongoose.Types.ObjectId();

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
        _id: ticketId1,
        eventId,
        ticketName: 'Active Ticket',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      await Ticket.create({
        _id: ticketId2,
        eventId,
        ticketName: 'Sold Out Ticket',
        price: 100000,
        quantity: 50,
        soldQuantity: 50,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'SOLD_OUT',
      });

      const res = await request(app)
        .get('/api/admin/tickets')
        .query({ status: 'ACTIVE' })
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].status).toBe('ACTIVE');
    });

    it('should support pagination', async () => {
      const admin = await createAuthedUser('ADMIN');
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

      for (let i = 0; i < 15; i++) {
        await Ticket.create({
          eventId,
          ticketName: `Ticket ${i}`,
          price: 100000,
          quantity: 50,
          soldQuantity: 0,
          minPerOrder: 1,
          maxPerOrder: 10,
          status: 'ACTIVE',
        });
      }

      const res = await request(app)
        .get('/api/admin/tickets')
        .query({ page: 1, limit: 10 })
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe('GET /api/admin/tickets/:id', () => {
    it('should return ticket detail for ADMIN', async () => {
      const admin = await createAuthedUser('ADMIN');
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
        description: 'Access to main venue',
        price: 100000,
        quantity: 50,
        soldQuantity: 10,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const res = await request(app)
        .get(`/api/admin/tickets/${ticketId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketName).toBe('General Admission');
      expect(res.body.data.price).toBe(100000);
      expect(res.body.data.soldQuantity).toBe(10);
    });

    it('should return 401 if unauthenticated', async () => {
      const ticketId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/admin/tickets/${ticketId}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const ticketId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/admin/tickets/${ticketId}`)
        .set('Cookie', participant.cookie);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent ticket', async () => {
      const admin = await createAuthedUser('ADMIN');
      const unknownId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/admin/tickets/${unknownId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(404);
    });
  });
});
