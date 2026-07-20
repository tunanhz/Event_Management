import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Star } from '../../../modules/star/star.model';
import * as dbModule from '../../../config/database';

describe('Star Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
    // Flag that DB is connected so code paths use real MongoDB instead of mock store
    dbModule.isDbConnected = true;
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('GET /api/stars', () => {
    it('should return empty list when no stars exist', async () => {
      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return all public stars', async () => {
      await Star.create([
        {
          name: 'Tom Cruise',
          slug: 'tom-cruise',
          imageUrl: 'https://example.com/tom.jpg',
          verified: true,
          order: 1,
        },
        {
          name: 'Angelina Jolie',
          slug: 'angelina-jolie',
          imageUrl: 'https://example.com/angelina.jpg',
          verified: true,
          order: 2,
        },
        {
          name: 'New Star',
          slug: 'new-star',
          imageUrl: 'https://example.com/new.jpg',
          verified: false,
          order: 3,
        },
      ]);

      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].name).toBe('Tom Cruise');
    });

    it('should sort stars by order', async () => {
      await Star.create([
        { name: 'Last', slug: 'last', imageUrl: 'http://x', order: 99 },
        { name: 'First', slug: 'first', imageUrl: 'http://x', order: 1 },
        { name: 'Middle', slug: 'middle', imageUrl: 'http://x', order: 50 },
      ]);

      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('First');
      expect(res.body.data[1].name).toBe('Middle');
      expect(res.body.data[2].name).toBe('Last');
    });

    it('should not require authentication', async () => {
      await Star.create({
        name: 'Public Star',
        slug: 'public-star',
        imageUrl: 'https://example.com/star.jpg',
        verified: true,
      });

      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should return complete star object', async () => {
      await Star.create({
        name: 'Brad Pitt',
        slug: 'brad-pitt',
        imageUrl: 'https://example.com/brad.jpg',
        verified: true,
        order: 5,
      });

      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      const star = res.body.data[0];
      expect(star).toHaveProperty('_id');
      expect(star).toHaveProperty('name');
      expect(star).toHaveProperty('slug');
      expect(star).toHaveProperty('imageUrl');
      expect(star).toHaveProperty('verified');
      expect(star).toHaveProperty('order');
      expect(star).toHaveProperty('createdAt');
      expect(star).toHaveProperty('updatedAt');
    });

    it('should include verified status', async () => {
      await Star.create([
        {
          name: 'Verified Star',
          slug: 'verified',
          imageUrl: 'http://x',
          verified: true,
        },
        {
          name: 'Unverified Star',
          slug: 'unverified',
          imageUrl: 'http://x',
          verified: false,
        },
      ]);

      const res = await request(app).get('/api/stars');

      expect(res.status).toBe(200);
      expect(res.body.data.some((s: any) => s.verified === true)).toBe(true);
      expect(res.body.data.some((s: any) => s.verified === false)).toBe(true);
    });
  });

  describe('POST /api/stars', () => {
    it('should create star as admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Leonardo DiCaprio',
          slug: 'leonardo-dicaprio',
          imageUrl: 'https://example.com/leo.jpg',
          verified: true,
          order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Leonardo DiCaprio');
      expect(res.body.data.verified).toBe(true);

      // Verify in DB
      const dbStar = await Star.findOne({ slug: 'leonardo-dicaprio' });
      expect(dbStar).toBeDefined();
    });

    it('should reject creation by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Leonardo DiCaprio',
          slug: 'leonardo-dicaprio',
          imageUrl: 'https://example.com/leo.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject creation without authentication', async () => {
      const res = await request(app)
        .post('/api/stars')
        .send({
          name: 'Leonardo DiCaprio',
          slug: 'leonardo-dicaprio',
          imageUrl: 'https://example.com/leo.jpg',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate slug', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const slug = 'unique-star';

      // Create first
      await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'First',
          slug,
          imageUrl: 'http://x',
        });

      // Try to create duplicate
      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Second',
          slug,
          imageUrl: 'http://y',
        });

      expect(res.status).toBe(409); // Conflict: duplicate key
    });

    it('should reject missing required fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Incomplete', // Missing slug and imageUrl
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should trim and lowercase slug', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Test',
          slug: '  UPPERCASE_SLUG  ',
          imageUrl: 'http://x',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('uppercase_slug');
    });

    it('should default verified to false', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Unverified Star',
          slug: 'unverified-star',
          imageUrl: 'http://x',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.verified).toBe(false);
    });

    it('should accept order parameter', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/stars')
        .set('Cookie', cookie)
        .send({
          name: 'Ordered Star',
          slug: 'ordered-star',
          imageUrl: 'http://x',
          order: 42,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order).toBe(42);
    });
  });

  describe('PUT /api/stars/:id', () => {
    it('should update star by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const star = await Star.create({
        name: 'Original Name',
        slug: 'original-slug',
        imageUrl: 'http://original.jpg',
        verified: false,
      });

      const res = await request(app)
        .put(`/api/stars/${star._id}`)
        .set('Cookie', cookie)
        .send({
          name: 'Updated Name',
          imageUrl: 'http://updated.jpg',
          verified: true,
          order: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
      expect(res.body.data.imageUrl).toBe('http://updated.jpg');
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.order).toBe(10);

      // Verify in DB
      const dbStar = await Star.findById(star._id);
      expect(dbStar?.name).toBe('Updated Name');
    });

    it('should reject update by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const star = await Star.create({
        name: 'Protected Star',
        slug: 'protected',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .put(`/api/stars/${star._id}`)
        .set('Cookie', cookie)
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject update without authentication', async () => {
      const star = await Star.create({
        name: 'Test',
        slug: 'test',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .put(`/api/stars/${star._id}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject update of non-existent star', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .put('/api/stars/000000000000000000000000')
        .set('Cookie', cookie)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
    });

    it('should allow partial update', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const star = await Star.create({
        name: 'Original',
        slug: 'original',
        imageUrl: 'http://original.jpg',
        verified: false,
        order: 1,
      });

      const res = await request(app)
        .put(`/api/stars/${star._id}`)
        .set('Cookie', cookie)
        .send({ verified: true });

      expect(res.status).toBe(200);
      expect(res.body.data.verified).toBe(true);
      expect(res.body.data.name).toBe('Original'); // Unchanged
      expect(res.body.data.slug).toBe('original'); // Unchanged
    });

    it('should toggle verified status', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const star = await Star.create({
        name: 'Toggle Star',
        slug: 'toggle-star',
        imageUrl: 'http://x',
        verified: false,
      });

      // Toggle to true
      const res1 = await request(app)
        .put(`/api/stars/${star._id}`)
        .set('Cookie', cookie)
        .send({ verified: true });

      expect(res1.status).toBe(200);
      expect(res1.body.data.verified).toBe(true);

      // Toggle to false
      const res2 = await request(app)
        .put(`/api/stars/${star._id}`)
        .set('Cookie', cookie)
        .send({ verified: false });

      expect(res2.status).toBe(200);
      expect(res2.body.data.verified).toBe(false);
    });
  });

  describe('DELETE /api/stars/:id', () => {
    it('should delete star by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const star = await Star.create({
        name: 'To Delete',
        slug: 'to-delete',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .delete(`/api/stars/${star._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted in DB
      const dbStar = await Star.findById(star._id);
      expect(dbStar).toBeNull();
    });

    it('should reject deletion by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const star = await Star.create({
        name: 'Protected',
        slug: 'protected',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .delete(`/api/stars/${star._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion without authentication', async () => {
      const star = await Star.create({
        name: 'Protected',
        slug: 'protected',
        imageUrl: 'http://x',
      });

      const res = await request(app).delete(`/api/stars/${star._id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion of non-existent star', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .delete('/api/stars/000000000000000000000000')
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow multiple deletions', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const star1 = await Star.create({
        name: 'Star 1',
        slug: 'star-1',
        imageUrl: 'http://x',
      });
      const star2 = await Star.create({
        name: 'Star 2',
        slug: 'star-2',
        imageUrl: 'http://y',
      });

      // Delete first
      const res1 = await request(app)
        .delete(`/api/stars/${star1._id}`)
        .set('Cookie', cookie);

      expect(res1.status).toBe(200);

      // Delete second
      const res2 = await request(app)
        .delete(`/api/stars/${star2._id}`)
        .set('Cookie', cookie);

      expect(res2.status).toBe(200);

      // Verify both deleted
      const remaining = await Star.find();
      expect(remaining.length).toBe(0);
    });
  });
});
