import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Ticket } from '../../../modules/organizer/ticket.model';

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

describe('Organizer Ticket Routes - /api/organizer/events/:id/tickets', () => {
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

  // Helper to create a test event
  async function createTestEvent(organizerCookie: string) {
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
        shows: [
          {
            startTime: futureStart,
            endTime: futureEnd,
            tickets: [
              { ticketName: 'Initial Ticket', price: 100, quantity: 50 },
            ],
          },
        ],
      });

    expect(res.status).toBe(201);
    return res.body.data.event;
  }

  // ────────────────────────────────────────────────────────────────
  // GET /api/organizer/events/:id/tickets - List Tickets
  // ────────────────────────────────────────────────────────────────
  describe('GET /api/organizer/events/:id/tickets', () => {
    it('should list all tickets for an event', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should reject access from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer1.cookie);

      const res = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer2.cookie);

      expect(res.status).toBe(403);
    });

    it('should reject unauthenticated access', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`);

      expect(res.status).toBe(401);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // POST /api/organizer/events/:id/tickets - Add Ticket
  // ────────────────────────────────────────────────────────────────
  describe('POST /api/organizer/events/:id/tickets', () => {
    it('should add a new ticket to an event', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'New Ticket Type',
          price: 250,
          quantity: 100,
          minPerOrder: 1,
          maxPerOrder: 5,
          showId: event.shows[0]._id,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.ticketName).toBe('New Ticket Type');
      expect(res.body.data.price).toBe(250);
    });

    it('should reject a ticket that does not target a show', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      // The event was created with shows[], so every tier must name one.
      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({ ticketName: 'Orphan Tier', price: 100, quantity: 10 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Cần chỉ định showId (suất diễn) cho loại vé');
    });

    it('should reject a ticket targeting a show from another event', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);
      const otherEvent = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'Wrong Show',
          price: 100,
          quantity: 10,
          showId: otherEvent.shows[0]._id,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('không tồn tại trong sự kiện này');
    });

    it('should reject ticket with missing required fields', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          price: 250,
          quantity: 100,
          // missing ticketName
        });

      expect(res.status).toBe(400);
    });

    it('should reject ticket with negative price', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'Bad Ticket',
          price: -50,
          quantity: 100,
        });

      expect(res.status).toBe(400);
    });

    it('should reject ticket with invalid quantity', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'Bad Ticket',
          price: 100,
          quantity: 0,
        });

      expect(res.status).toBe(400);
    });

    it('should reject access from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer1.cookie);

      const res = await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer2.cookie)
        .send({
          ticketName: 'New Ticket',
          price: 100,
          quantity: 50,
        });

      expect(res.status).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // PUT /api/organizer/events/:id/tickets/:ticketId - Update Ticket
  // ────────────────────────────────────────────────────────────────
  describe('PUT /api/organizer/events/:id/tickets/:ticketId', () => {
    it('should update a ticket', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      // Get the first ticket
      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);

      const ticketId = listRes.body.data[0]._id;

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}/tickets/${ticketId}`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'Updated Ticket Name',
          price: 200,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.ticketName).toBe('Updated Ticket Name');
      expect(res.body.data.price).toBe(200);
    });

    it('should reject invalid price update', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);

      const ticketId = listRes.body.data[0]._id;

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}/tickets/${ticketId}`)
        .set('Cookie', organizer.cookie)
        .send({
          price: -100,
        });

      expect(res.status).toBe(400);
    });

    it('should reject update from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer1.cookie);

      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer1.cookie);

      const ticketId = listRes.body.data[0]._id;

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}/tickets/${ticketId}`)
        .set('Cookie', organizer2.cookie)
        .send({ ticketName: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // DELETE /api/organizer/events/:id/tickets/:ticketId - Delete Ticket
  // ────────────────────────────────────────────────────────────────
  describe('DELETE /api/organizer/events/:id/tickets/:ticketId', () => {
    it('should delete a ticket', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      // An event must keep at least one tier, so add a second before deleting.
      await request(app)
        .post(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          ticketName: 'Spare Tier',
          price: 150,
          quantity: 20,
          showId: event.shows[0]._id,
        });

      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);

      const ticketId = listRes.body.data[0]._id;
      const initialCount = listRes.body.data.length;
      expect(initialCount).toBe(2);

      const res = await request(app)
        .delete(`/api/organizer/events/${event._id}/tickets/${ticketId}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(200);

      // Verify deletion
      const listRes2 = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);

      expect(listRes2.body.data.length).toBe(initialCount - 1);
    });

    it('should refuse to delete the only remaining ticket type', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie);
      expect(listRes.body.data).toHaveLength(1);

      const res = await request(app)
        .delete(`/api/organizer/events/${event._id}/tickets/${listRes.body.data[0]._id}`)
        .set('Cookie', organizer.cookie);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Sự kiện cần giữ lại ít nhất 1 loại vé');
    });

    it('should reject deletion from different organizer', async () => {
      const organizer1 = await createAuthedUser('ORGANIZER');
      const organizer2 = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer1.cookie);

      const listRes = await request(app)
        .get(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer1.cookie);

      const ticketId = listRes.body.data[0]._id;

      const res = await request(app)
        .delete(`/api/organizer/events/${event._id}/tickets/${ticketId}`)
        .set('Cookie', organizer2.cookie);

      expect(res.status).toBe(403);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // PUT /api/organizer/events/:id/tickets - Configure Tickets (Bulk)
  // ────────────────────────────────────────────────────────────────
  describe('PUT /api/organizer/events/:id/tickets (bulk configure)', () => {
    it('should bulk configure tickets', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          tickets: [
            {
              ticketName: 'VIP Ticket',
              price: 500,
              quantity: 50,
              minPerOrder: 1,
              maxPerOrder: 3,
              showId: event.shows[0]._id,
            },
            {
              ticketName: 'Standard Ticket',
              price: 200,
              quantity: 200,
              minPerOrder: 1,
              maxPerOrder: 10,
              showId: event.shows[0]._id,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });

    it('should reject bulk configure with invalid tickets', async () => {
      const organizer = await createAuthedUser('ORGANIZER');
      const event = await createTestEvent(organizer.cookie);

      const res = await request(app)
        .put(`/api/organizer/events/${event._id}/tickets`)
        .set('Cookie', organizer.cookie)
        .send({
          tickets: [
            {
              ticketName: 'Bad Ticket',
              price: -100, // invalid
              quantity: 50,
            },
          ],
        });

      expect(res.status).toBe(400);
    });
  });
});
