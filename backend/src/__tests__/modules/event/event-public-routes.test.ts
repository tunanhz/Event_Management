import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Event } from '../../../modules/event/event.model';

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

describe('Event Public Routes - /api/events', () => {
  let categoryId: string;

  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  beforeEach(async () => {
    categoryId = await createTestCategory();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  /**
   * Create an event through the real organizer wizard endpoint, then flip it to
   * published the way admin approval would.
   *
   * `venue` is required (the service derives `location` from it via
   * `composeLocation`, and rejects the payload when neither is present) and it
   * is also what the derived discovery fields — `city`, `sessions`, `priceFrom`
   * — are computed from, so the shape matters to the assertions below.
   */
  async function createPublishedEvent(
    title: string,
    organizerCookie?: string,
    overrides: Record<string, unknown> = {}
  ) {
    if (!organizerCookie) {
      const organizer = await createAuthedUser('ORGANIZER');
      organizerCookie = organizer.cookie;
    }

    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 2 * 86400000);

    const createRes = await request(app)
      .post('/api/organizer/events')
      .set('Cookie', organizerCookie)
      .send({
        title,
        description: 'A public event',
        categoryId,
        capacity: 1000,
        banner: '/uploads/banner.png',
        locationType: 'offline',
        venue: {
          name: 'Nhà hát Thành phố',
          street: '7 Công Trường Lam Sơn',
          ward: 'Bến Nghé',
          province: 'Hồ Chí Minh',
        },
        shows: [
          {
            startTime: futureStart,
            endTime: futureEnd,
            tickets: [{ ticketName: 'Regular', price: 100, quantity: 500 }],
          },
        ],
        ...overrides,
      });

    // Assert here so a bad payload surfaces as a clear failure instead of a
    // downstream "cannot read properties of undefined".
    expect(createRes.status).toBe(201);

    const eventId = createRes.body.data.event._id;

    await request(app)
      .post(`/api/organizer/events/${eventId}/submit`)
      .set('Cookie', organizerCookie);

    // Stand in for admin approval.
    await Event.findByIdAndUpdate(eventId, {
      reviewStatus: 'PUBLISHED',
      status: 'published',
    });

    return eventId;
  }

  /** Same wizard payload, left in its initial DRAFT state (never published). */
  async function createDraftEvent(title: string) {
    const organizer = await createAuthedUser('ORGANIZER');
    const futureStart = new Date(Date.now() + 86400000);
    const futureEnd = new Date(Date.now() + 2 * 86400000);

    const createRes = await request(app)
      .post('/api/organizer/events')
      .set('Cookie', organizer.cookie)
      .send({
        title,
        description: 'This should not be public',
        categoryId,
        capacity: 500,
        banner: '/uploads/banner.png',
        locationType: 'offline',
        venue: { name: 'Sân khấu nhỏ', province: 'Hà Nội' },
        shows: [
          {
            startTime: futureStart,
            endTime: futureEnd,
            tickets: [{ ticketName: 'VIP', price: 100, quantity: 50 }],
          },
        ],
      });

    expect(createRes.status).toBe(201);
    return createRes.body.data.event._id as string;
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/events - List Events (Public)
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/events', () => {
    it('should return published events', async () => {
      await createPublishedEvent('Published Event 1');
      await createPublishedEvent('Published Event 2');

      const res = await request(app)
        .get('/api/events');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should NOT return DRAFT events', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const futureStart = new Date(Date.now() + 86400000);
      const futureEnd = new Date(Date.now() + 2 * 86400000);

      // Create a DRAFT event
      await request(app)
        .post('/api/organizer/events')
        .set('Cookie', organizer.cookie)
        .send({
          title: 'Draft Event',
          description: 'This is a draft',
          categoryId,
          capacity: 500,
          banner: '/uploads/banner.png',
          venue: { name: 'Test Venue', province: 'Hồ Chí Minh' },
          shows: [
            {
              startTime: futureStart,
              endTime: futureEnd,
              tickets: [{ ticketName: 'VIP', price: 100, quantity: 50 }],
            },
          ],
        });

      // Create a published event
      await createPublishedEvent('Published Event');

      const res = await request(app)
        .get('/api/events');

      expect(res.status).toBe(200);
      const titles = res.body.data.map((e: any) => e.title);
      expect(titles).toContain('Published Event');
      expect(titles).not.toContain('Draft Event');
    });

    it('should support pagination', async () => {
      // Create multiple events
      for (let i = 0; i < 3; i++) {
        await createPublishedEvent(`Event ${i + 1}`);
      }

      const res = await request(app)
        .get('/api/events?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should support sorting by date', async () => {
      for (let i = 0; i < 2; i++) {
        await createPublishedEvent(`Event ${i + 1}`);
      }

      const res = await request(app)
        .get('/api/events?sort=date&order=asc');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support city filter', async () => {
      await createPublishedEvent('HCM Event');

      const res = await request(app)
        .get('/api/events?city=hcm');

      expect(res.status).toBe(200);
      // Should either have events or empty array
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support free event filter', async () => {
      const res = await request(app)
        .get('/api/events?isFree=true');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should support date range filter', async () => {
      await createPublishedEvent('Event with date');

      const dateFrom = new Date(Date.now() + 86400000).toISOString();
      const dateTo = new Date(Date.now() + 3 * 86400000).toISOString();

      const res = await request(app)
        .get(`/api/events?dateFrom=${dateFrom}&dateTo=${dateTo}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/events/search - Free-text Search
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/events/search', () => {
    it('should search events by query', async () => {
      await createPublishedEvent('Amazing Concert Event');
      await createPublishedEvent('Sports Festival');

      const res = await request(app)
        .get('/api/events/search?q=concert');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return empty array for non-matching query', async () => {
      await createPublishedEvent('Amazing Concert Event');

      const res = await request(app)
        .get('/api/events/search?q=nonexistentquery123xyz');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });

    it('should support pagination in search results', async () => {
      for (let i = 0; i < 3; i++) {
        await createPublishedEvent(`Concert Event ${i + 1}`);
      }

      const res = await request(app)
        .get('/api/events/search?q=concert&page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
    });

    it('should support sorting in search results', async () => {
      for (let i = 0; i < 2; i++) {
        await createPublishedEvent(`Concert ${i + 1}`);
      }

      const res = await request(app)
        .get('/api/events/search?q=concert&sort=date&order=asc');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/events/:id - Get Event by ID (Public)
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/events/:id', () => {
    it('should return a published event', async () => {
      const eventId = await createPublishedEvent('My Published Event');

      const res = await request(app)
        .get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.title).toBe('My Published Event');
    });

    it('should NOT return DRAFT event', async () => {
      const eventId = await createDraftEvent('Draft Event');

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for unknown event ID', async () => {
      const res = await request(app)
        .get('/api/events/000000000000000000000000');

      expect(res.status).toBe(404);
    });

    it('should return 400 for malformed ObjectId', async () => {
      const res = await request(app)
        .get('/api/events/invalid-id');

      // Either 400 or 404 is acceptable per source
      expect([400, 404]).toContain(res.status);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // GET /api/events/:id/detail - Get Event Detail (Public)
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/events/:id/detail', () => {
    it('should return event detail with ticket tiers', async () => {
      const eventId = await createPublishedEvent('Event with Detail');

      const res = await request(app).get(`/api/events/${eventId}/detail`);

      expect(res.status).toBe(200);
      // The detail endpoint returns { event, tickets, related }, not a bare event.
      expect(res.body.data.event.title).toBe('Event with Detail');
      expect(Array.isArray(res.body.data.tickets)).toBe(true);
      expect(res.body.data.tickets.length).toBeGreaterThan(0);
      expect(res.body.data.tickets[0].ticketName).toBe('Regular');
      expect(Array.isArray(res.body.data.related)).toBe(true);
    });

    it('should NOT return DRAFT event detail', async () => {
      const eventId = await createDraftEvent('Draft Event Detail');

      const res = await request(app).get(`/api/events/${eventId}/detail`);

      expect(res.status).toBe(404);
    });

    it('should return 404 for unknown event detail', async () => {
      const res = await request(app)
        .get('/api/events/000000000000000000000000/detail');

      expect(res.status).toBe(404);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // Test Discovery Fields Derivation
  // ────────────────────────────────────────────────────────────────
  describe('Discovery fields (derived from wizard data)', () => {
    it('should derive city from the venue province', async () => {
      const eventId = await createPublishedEvent('HCM Event', undefined, {
        venue: { name: 'My Venue', province: 'Hồ Chí Minh' },
      });

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('hcm');
    });

    it('should derive city as other for an unmapped province', async () => {
      const eventId = await createPublishedEvent('Hue Event', undefined, {
        venue: { name: 'Huế Arena', province: 'Thừa Thiên Huế' },
      });

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.city).toBe('other');
    });

    it('should derive one session per show', async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(Date.now() + 86400000 + 3600000);
      const secondStart = new Date(Date.now() + 3 * 86400000);
      const secondEnd = new Date(Date.now() + 3 * 86400000 + 3600000);

      const eventId = await createPublishedEvent('Two Show Event', undefined, {
        shows: [
          {
            startTime: start,
            endTime: end,
            tickets: [{ ticketName: 'Regular', price: 100, quantity: 10 }],
          },
          {
            startTime: secondStart,
            endTime: secondEnd,
            tickets: [{ ticketName: 'Regular', price: 100, quantity: 10 }],
          },
        ],
      });

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toHaveLength(2);
      // 2+ sessions get a disambiguating label; a single session gets none.
      expect(res.body.data.sessions[0].label).toBe('Suất 1');
      expect(res.body.data.sessions[1].label).toBe('Suất 2');
    });

    it('should leave a single session unlabelled', async () => {
      const eventId = await createPublishedEvent('Single Show Event');

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.sessions).toHaveLength(1);
      expect(res.body.data.sessions[0].label).toBeUndefined();
    });

    it('should derive priceFrom as the cheapest tier', async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(Date.now() + 2 * 86400000);

      const eventId = await createPublishedEvent('Multi-tier Event', undefined, {
        shows: [
          {
            startTime: start,
            endTime: end,
            tickets: [
              { ticketName: 'VIP', price: 500, quantity: 50 },
              { ticketName: 'Standard', price: 200, quantity: 300 },
              { ticketName: 'Economy', price: 100, quantity: 500 },
            ],
          },
        ],
      });

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.priceFrom).toBe(100);
      expect(res.body.data.isFree).toBe(false);
    });

    it('should mark the event free when every tier is zero price', async () => {
      const start = new Date(Date.now() + 86400000);
      const end = new Date(Date.now() + 2 * 86400000);

      const eventId = await createPublishedEvent('Free Event', undefined, {
        shows: [
          {
            startTime: start,
            endTime: end,
            tickets: [
              { ticketName: 'Standard', price: 0, quantity: 200 },
              { ticketName: 'Extra', price: 0, quantity: 50 },
            ],
          },
        ],
      });

      const res = await request(app).get(`/api/events/${eventId}`);

      expect(res.status).toBe(200);
      expect(res.body.data.priceFrom).toBe(0);
      expect(res.body.data.isFree).toBe(true);
    });
  });
});
