import request from 'supertest';
import app from '../../../app';
import {
  connectInMemoryDatabase,
  clearDatabase,
  closeInMemoryDatabase,
} from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Event } from '../../../modules/event/event.model';
import mongoose from 'mongoose';

describe('Admin Event Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('GET /api/admin/events', () => {
    it('should list events for ADMIN', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Pending Event',
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
        reviewStatus: 'PENDING_REVIEW',
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

      const res = await request(app).get('/api/admin/events').set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).get('/api/admin/events');

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const res = await request(app).get('/api/admin/events').set('Cookie', organizer.cookie);

      expect(res.status).toBe(403);
    });

    it('should filter by reviewStatus', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId1 = new mongoose.Types.ObjectId();
      const eventId2 = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId1,
        title: 'Pending Event',
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
        reviewStatus: 'PENDING_REVIEW',
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
        title: 'Approved Event',
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

      const res = await request(app)
        .get('/api/admin/events')
        .query({ reviewStatus: 'PENDING_REVIEW' })
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].reviewStatus).toBe('PENDING_REVIEW');
    });
  });

  describe('GET /api/admin/events/:id', () => {
    it('should return event detail for ADMIN', async () => {
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
        reviewStatus: 'PENDING_REVIEW',
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

      const res = await request(app)
        .get(`/api/admin/events/${eventId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('data');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/admin/events/${eventId}`);

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent event', async () => {
      const admin = await createAuthedUser('ADMIN');
      const unknownId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .get(`/api/admin/events/${unknownId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/admin/events/:id/approve', () => {
    it('should approve a PENDING_REVIEW event', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Pending Event',
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
        reviewStatus: 'PENDING_REVIEW',
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

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/approve`)
        .set('Cookie', admin.cookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('PUBLISHED');
    });

    it('should accept serviceCost parameter', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Pending Event',
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
        reviewStatus: 'PENDING_REVIEW',
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

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/approve`)
        .set('Cookie', admin.cookie)
        .send({ serviceCost: 500000 });

      expect(res.status).toBe(200);
      expect(res.body.data.serviceCost).toBe(500000);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/admin/events/${eventId}/approve`)
        .send({});

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/approve`)
        .set('Cookie', organizer.cookie)
        .send({});

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/events/:id/reject', () => {
    it('should reject a PENDING_REVIEW event with reason', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Pending Event',
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
        reviewStatus: 'PENDING_REVIEW',
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

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/reject`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Không phù hợp chính sách' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reviewStatus).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe('Không phù hợp chính sách');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/admin/events/${eventId}/reject`)
        .send({ reason: 'Test' });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/reject`)
        .set('Cookie', organizer.cookie)
        .send({ reason: 'Test' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/events/:id/cancel', () => {
    it('should cancel a published event', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Published Event',
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

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/cancel`)
        .set('Cookie', admin.cookie)
        .send({ reason: 'Lý do hủy sự kiện' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/admin/events/${eventId}/cancel`)
        .send({ reason: 'Test' });

      expect(res.status).toBe(401);
    });
  });

  describe('DELETE /api/admin/events/:id', () => {
    it('should delete an event', async () => {
      const admin = await createAuthedUser('ADMIN');
      const eventId = new mongoose.Types.ObjectId();

      await Event.create({
        _id: eventId,
        title: 'Event to Delete',
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

      const beforeCount = await Event.countDocuments({ _id: eventId });
      expect(beforeCount).toBe(1);

      const res = await request(app)
        .delete(`/api/admin/events/${eventId}`)
        .set('Cookie', admin.cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const afterCount = await Event.countDocuments({ _id: eventId });
      expect(afterCount).toBe(0);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app).delete(`/api/admin/events/${eventId}`);

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .delete(`/api/admin/events/${eventId}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/events/:id/additional-cost', () => {
    it('should set additional cost for an event', async () => {
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
        serviceCost: 500000,
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

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/additional-cost`)
        .set('Cookie', admin.cookie)
        .send({ additionalCost: 250000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.additionalCost).toBe(250000);
    });

    it('should return 401 if unauthenticated', async () => {
      const eventId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/admin/events/${eventId}/additional-cost`)
        .send({ additionalCost: 100000 });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not ADMIN', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const eventId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post(`/api/admin/events/${eventId}/additional-cost`)
        .set('Cookie', organizer.cookie)
        .send({ additionalCost: 100000 });

      expect(res.status).toBe(403);
    });
  });
});
