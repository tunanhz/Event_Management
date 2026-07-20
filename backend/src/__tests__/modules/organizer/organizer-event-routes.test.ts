import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser, uniqueEmail } from '../../setup/auth-test-helpers';
import { Event } from '../../../modules/event/event.model';
import { Ticket } from '../../../modules/organizer/ticket.model';
import mongoose from 'mongoose';

// Helper to create a test Category
async function createTestCategory(name = 'Test Category') {
  // Create admin user for category creation (categories require auth)
  const admin = await createAuthedUser('ADMIN');

  const categoryData = {
    name: `${name}-${Date.now()}`,
    slug: `${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
    icon: 'music',
    description: `${name} description`,
  };
  const response = await request(app)
    .post('/api/categories')
    .set('Cookie', admin.cookie)
    .send(categoryData);
  if (response.status !== 201) {
    throw new Error(`Failed to create category: ${response.body.message} - Response: ${JSON.stringify(response.body)}`);
  }
  return response.body.data._id;
}

describe('Organizer Event Routes - /api/organizer/events', () => {
  let categoryId: string;

  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  beforeEach(async () => {
    // Create a test category for each test
    categoryId = await createTestCategory();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  // Helper to create event and assert success
  async function createTestEvent(organizerCookie: string, overrides?: any) {
    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 2 * 86400000);

    const res = await request(app)
      .post('/api/organizer/events')
      .set('Cookie', organizerCookie)
      .send({
        title: 'Test Event',
        description: 'Test event description',
        categoryId,
        capacity: 1000,
        banner: '/uploads/banner.png',
        locationType: 'offline',
        venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
        venue: {
          name: 'Test Venue',
          province: 'Hồ Chí Minh',
        },
        shows: [
          {
            startTime: futureStart,
            endTime: futureEnd,
            tickets: [
              { ticketName: 'VIP', price: 500, quantity: 100 },
            ],
          },
        ],
        ...overrides,
      });

    expect(res.status).toBe(201);
    return res.body.data.event;
  }

  // ────────────────────────────────────────────────────────────────
  // POST /api/organizer/events - Create Event
  // ────────────────────────────────────────────────────────────────
  describe('POST /api/organizer/events', () => {
    it('should create a DRAFT event with canonical shows payload', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', organizer.cookie)
        .send({
          title: 'Amazing Concert',
          description: 'A great concert event',
          categoryId,
          capacity: 1000,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: {
            name: 'Concert Hall',
            province: 'Hồ Chí Minh',
          },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                { ticketName: 'VIP', price: 500, quantity: 100 },
                { ticketName: 'Regular', price: 200, quantity: 500 },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.event).toBeDefined();
      expect(res.body.data.event.title).toBe('Amazing Concert');
      expect(res.body.data.event.reviewStatus).toBe('DRAFT');
      expect(res.body.data.event.creatorId).toBeDefined();
    });

    it('should create a DRAFT event with legacy flat payload', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', organizer.cookie)
        .send({
          title: 'Legacy Event',
          description: 'Using flat payload',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: {
            name: 'Legacy Venue',
            province: 'Hà Nội',
          },
          startDate: futureStart,
          endDate: futureEnd,
          tickets: [
            { ticketName: 'Standard', price: 100, quantity: 200 },
          ],
        });

      if (res.status !== 201) {
        console.error('Legacy event creation failed:', res.body);
      }
      expect(res.status).toBe(201);
      expect(res.body.data.event.reviewStatus).toBe('DRAFT');
      expect(res.body.data.event.shows.length).toBe(0); // Legacy uses flat tickets
    });

    it('should reject event with no tickets', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', organizer.cookie)
        .send({
          title: 'No Tickets Event',
          description: 'This event has no tickets',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: { name: 'Test Venue', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [],
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject event with ticket price in the past', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);
      const pastDate = new Date(Date.now() - 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', organizer.cookie)
        .send({
          title: 'Past Ticket Event',
          description: 'Ticket sales in past',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: { name: 'Test Venue', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                { ticketName: 'VIP', price: 100, quantity: 50, saleStart: pastDate },
              ],
            },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('should reject unauthenticated request', async () => {
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .send({
          title: 'Unauth Event',
          description: 'No auth',
          categoryId: '507f1f77bcf86cd799439011',
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                { ticketName: 'VIP', price: 100, quantity: 50 },
              ],
            },
          ],
        });

      expect(res.status).toBe(401);
    });

    it('should reject PARTICIPANT user', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', participant.cookie)
        .send({
          title: 'Participant Event',
          description: 'Participant trying to create',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: { name: 'Test Venue', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                { ticketName: 'VIP', price: 100, quantity: 50 },
              ],
            },
          ],
        });

      expect(res.status).toBe(403);
    });

    it('should allow ADMIN user', async () => {
      const admin = await createAuthedUser('ADMIN');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      const res = await request(app)
        .post('/api/organizer/events')
        .set('Cookie', admin.cookie)
        .send({
          title: 'Admin Event',
          description: 'Admin creating event',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          locationType: 'offline',
          venue: { name: 'Nhà văn hóa Thanh Niên', province: 'Hồ Chí Minh' },
          venue: { name: 'Test Venue', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [
                { ticketName: 'VIP', price: 100, quantity: 50 },
              ],
            },
          ],
        });

      expect(res.status).toBe(201);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/organizer/events - List My Events
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/organizer/events', () => {
    it('should return only caller\'s events', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');

      // Create event for organizer1 using helper
      const event1 = await createTestEvent(organizer1.cookie, { title: 'Organizer 1 Event' });
      expect(event1).toBeDefined();

      // Create event for organizer2 using helper
      const event2 = await createTestEvent(organizer2.cookie, { title: 'Organizer 2 Event' });
      expect(event2).toBeDefined();

      // Organizer1 should see only their event
      const res = await request(app)
        .get('/api/organizer/events')
        .set('Cookie', organizer1.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].title).toBe('Organizer 1 Event');
    });

    it('should support pagination', async () => {
      const organizer = await createAuthedUser('ORGANIZER');

      // Create multiple events
      for (let i = 0; i < 3; i++) {
        const event = await createTestEvent(organizer.cookie, { title: `Event ${i + 1}` });
        expect(event).toBeDefined();
      }

      const res = await request(app)
        .get('/api/organizer/events?page=1&limit=2')
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/organizer/events/:id - Get Event Detail
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/organizer/events/:id', () => {
    it('should retrieve a DRAFT event owned by caller', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie, { title: 'My Draft Event' });

      const res = await request(app)
        .get(`/api/organizer/events/${event._id}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
      // The organizer detail endpoint returns { event, tickets }.
      expect(res.body.data.event.title).toBe('My Draft Event');
      expect(Array.isArray(res.body.data.tickets)).toBe(true);
    });

    it('should reject access to another organizer\'s DRAFT event', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');

      const event = await createTestEvent(organizer1.cookie, { title: 'Private Draft' });

      const res = await request(app)
        .get(`/api/organizer/events/${event._id}`)
        .set('Cookie', organizer2.cookie);

      expect(res.status).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // PUT /api/organizer/events/:id - Update Event
  // ────────────────────────────────────────────────────────────────
  describe('PUT /api/organizer/events/:id', () => {
    it('should update a DRAFT event', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie, { title: 'Original Title', description: 'Original description' });

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}`)
        .set('Cookie', organizer.cookie)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Title');
    });

    it('should reject update from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');

      const event = await createTestEvent(organizer1.cookie, { title: 'Organizer 1 Event', description: 'Only organizer 1 can edit' });

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}`)
        .set('Cookie', organizer2.cookie)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // POST /api/organizer/events/:id/submit - Submit For Review
  // ────────────────────────────────────────────────────────────────
  describe('POST /api/organizer/events/:id/submit', () => {
    it('should transition event to PENDING_REVIEW', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie, {
        title: 'Event for Review',
        description: 'Ready to submit',
        // Submission is gated on at least one legal permit being attached.
        permitDocuments: [
          { name: 'giay-phep.pdf', url: '/uploads/permits/giay-phep.pdf', sizeKb: 120 },
        ],
      });

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/submit`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.reviewStatus).toBe('PENDING_REVIEW');
    });

    it('should refuse submission when no permit document is attached', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie, { title: 'No Permit Event' });

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/submit`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        'Cần đính kèm ít nhất 1 giấy phép / hồ sơ pháp lý trước khi gửi duyệt'
      );
    });

    it('should reject submission from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');

      const event = await createTestEvent(organizer1.cookie, { title: 'Event for Review', description: 'Ready to submit' });

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/submit`)
        .set('Cookie', organizer2.cookie);

      expect(res.status).toBe(403);
    });
  });
});
