import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser } from '../../setup/auth-test-helpers';
import { Banner } from '../../../modules/banner/banner.model';
import * as dbModule from '../../../config/database';

describe('Banner Routes', () => {
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

  describe('GET /api/banners (public active banners)', () => {
    it('should return empty list when no active banners exist', async () => {
      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return only active banners', async () => {
      await Banner.create([
        {
          title: 'Active Banner 1',
          imageUrl: 'http://image1.jpg',
          isActive: true,
          order: 1,
        },
        {
          title: 'Active Banner 2',
          imageUrl: 'http://image2.jpg',
          isActive: true,
          order: 2,
        },
        {
          title: 'Inactive Banner',
          imageUrl: 'http://image3.jpg',
          isActive: false,
          order: 3,
        },
      ]);

      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data.every((b: any) => b.isActive === true)).toBe(true);
    });

    it('should sort active banners by order', async () => {
      await Banner.create([
        { title: 'Last', imageUrl: 'http://x', isActive: true, order: 99 },
        { title: 'First', imageUrl: 'http://x', isActive: true, order: 1 },
        { title: 'Middle', imageUrl: 'http://x', isActive: true, order: 50 },
      ]);

      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('First');
      expect(res.body.data[1].title).toBe('Middle');
      expect(res.body.data[2].title).toBe('Last');
    });

    it('should not require authentication', async () => {
      await Banner.create({
        title: 'Public Banner',
        imageUrl: 'http://image.jpg',
        isActive: true,
      });

      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should return complete banner object', async () => {
      await Banner.create({
        title: 'Complete Banner',
        subtitle: 'A subtitle',
        imageUrl: 'http://image.jpg',
        ctaLabel: 'Learn More',
        linkUrl: 'https://example.com',
        isActive: true,
        order: 5,
      });

      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      const banner = res.body.data[0];
      expect(banner).toHaveProperty('_id');
      expect(banner).toHaveProperty('title');
      expect(banner).toHaveProperty('subtitle');
      expect(banner).toHaveProperty('imageUrl');
      expect(banner).toHaveProperty('ctaLabel');
      expect(banner).toHaveProperty('linkUrl');
      expect(banner).toHaveProperty('isActive');
      expect(banner).toHaveProperty('order');
      expect(banner).toHaveProperty('createdAt');
      expect(banner).toHaveProperty('updatedAt');
    });

    it('should not expose inactive banners to public', async () => {
      await Banner.create({
        title: 'Hidden Banner',
        imageUrl: 'http://image.jpg',
        isActive: false,
      });

      const res = await request(app).get('/api/banners');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('GET /api/banners/admin (admin all banners)', () => {
    it('should return all banners for admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      await Banner.create([
        { title: 'Active', imageUrl: 'http://x', isActive: true },
        { title: 'Inactive', imageUrl: 'http://y', isActive: false },
      ]);

      const res = await request(app)
        .get('/api/banners/admin')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });

    it('should reject non-admin access', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/banners/admin')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject unauthenticated access', async () => {
      const res = await request(app).get('/api/banners/admin');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return both active and inactive banners', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      await Banner.create([
        { title: 'Active', imageUrl: 'http://x', isActive: true },
        { title: 'Inactive', imageUrl: 'http://y', isActive: false },
        { title: 'Active 2', imageUrl: 'http://z', isActive: true },
      ]);

      const res = await request(app)
        .get('/api/banners/admin')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
    });
  });

  describe('POST /api/banners', () => {
    it('should create banner as admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'New Banner',
          subtitle: 'A new banner',
          imageUrl: 'http://new-banner.jpg',
          ctaLabel: 'Click Me',
          linkUrl: 'https://example.com',
          isActive: true,
          order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('New Banner');
      expect(res.body.data.isActive).toBe(true);

      // Verify in DB
      const dbBanner = await Banner.findOne({ title: 'New Banner' });
      expect(dbBanner).toBeDefined();
    });

    it('should reject creation by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'New Banner',
          imageUrl: 'http://image.jpg',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject creation without authentication', async () => {
      const res = await request(app)
        .post('/api/banners')
        .send({
          title: 'New Banner',
          imageUrl: 'http://image.jpg',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject missing required fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'Missing Image', // Missing imageUrl
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should default isActive to true', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'Active by Default',
          imageUrl: 'http://image.jpg',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.isActive).toBe(true);
    });

    it('should accept optional subtitle', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'Banner with Subtitle',
          imageUrl: 'http://image.jpg',
          subtitle: 'This is a subtitle',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.subtitle).toBe('This is a subtitle');
    });

    it('should accept optional CTA fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'Banner with CTA',
          imageUrl: 'http://image.jpg',
          ctaLabel: 'Shop Now',
          linkUrl: 'https://shop.example.com',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.ctaLabel).toBe('Shop Now');
      expect(res.body.data.linkUrl).toBe('https://shop.example.com');
    });

    it('should accept order parameter', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/banners')
        .set('Cookie', cookie)
        .send({
          title: 'Ordered Banner',
          imageUrl: 'http://image.jpg',
          order: 42,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order).toBe(42);
    });
  });

  describe('PUT /api/banners/:id', () => {
    it('should update banner by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'Original Title',
        imageUrl: 'http://original.jpg',
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', cookie)
        .send({
          title: 'Updated Title',
          imageUrl: 'http://updated.jpg',
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated Title');
      expect(res.body.data.imageUrl).toBe('http://updated.jpg');
      expect(res.body.data.isActive).toBe(false);

      // Verify in DB
      const dbBanner = await Banner.findById(banner._id);
      expect(dbBanner?.title).toBe('Updated Title');
    });

    it('should toggle isActive status', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'Toggle Banner',
        imageUrl: 'http://image.jpg',
        isActive: true,
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', cookie)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
    });

    it('should reject update by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const banner = await Banner.create({
        title: 'Protected',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', cookie)
        .send({ title: 'New Title' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject update without authentication', async () => {
      const banner = await Banner.create({
        title: 'Protected',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject update of non-existent banner', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .put('/api/banners/000000000000000000000000')
        .set('Cookie', cookie)
        .send({ title: 'New Title' });

      expect(res.status).toBe(404);
    });

    it('should allow partial update', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'Original',
        subtitle: 'Original Subtitle',
        imageUrl: 'http://image.jpg',
        isActive: true,
        order: 1,
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', cookie)
        .send({ title: 'New Title Only' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('New Title Only');
      expect(res.body.data.subtitle).toBe('Original Subtitle'); // Unchanged
      expect(res.body.data.imageUrl).toBe('http://image.jpg'); // Unchanged
      expect(res.body.data.isActive).toBe(true); // Unchanged
    });

    it('should update CTA fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'CTA Banner',
        imageUrl: 'http://image.jpg',
        ctaLabel: 'Old Label',
        linkUrl: 'http://old.com',
      });

      const res = await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', cookie)
        .send({
          ctaLabel: 'New Label',
          linkUrl: 'http://new.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.ctaLabel).toBe('New Label');
      expect(res.body.data.linkUrl).toBe('http://new.com');
    });
  });

  describe('DELETE /api/banners/:id', () => {
    it('should delete banner by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'To Delete',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .delete(`/api/banners/${banner._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted in DB
      const dbBanner = await Banner.findById(banner._id);
      expect(dbBanner).toBeNull();
    });

    it('should reject deletion by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const banner = await Banner.create({
        title: 'Protected',
        imageUrl: 'http://x',
      });

      const res = await request(app)
        .delete(`/api/banners/${banner._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion without authentication', async () => {
      const banner = await Banner.create({
        title: 'Protected',
        imageUrl: 'http://x',
      });

      const res = await request(app).delete(`/api/banners/${banner._id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion of non-existent banner', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .delete('/api/banners/000000000000000000000000')
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should allow multiple deletions', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const banner1 = await Banner.create({
        title: 'Banner 1',
        imageUrl: 'http://x',
      });
      const banner2 = await Banner.create({
        title: 'Banner 2',
        imageUrl: 'http://y',
      });

      // Delete first
      const res1 = await request(app)
        .delete(`/api/banners/${banner1._id}`)
        .set('Cookie', cookie);

      expect(res1.status).toBe(200);

      // Delete second
      const res2 = await request(app)
        .delete(`/api/banners/${banner2._id}`)
        .set('Cookie', cookie);

      expect(res2.status).toBe(200);

      // Verify both deleted
      const remaining = await Banner.find();
      expect(remaining.length).toBe(0);
    });
  });

  describe('Integration: public vs admin views', () => {
    it('should show only active banners to public, all to admin', async () => {
      const { cookie: adminCookie } = await createAuthedUser('ADMIN');

      // Create mixed banners
      await Banner.create([
        { title: 'Active 1', imageUrl: 'http://a1', isActive: true, order: 1 },
        { title: 'Inactive 1', imageUrl: 'http://i1', isActive: false, order: 2 },
        { title: 'Active 2', imageUrl: 'http://a2', isActive: true, order: 3 },
      ]);

      // Public view
      const publicRes = await request(app).get('/api/banners');
      expect(publicRes.status).toBe(200);
      expect(publicRes.body.data.length).toBe(2);
      expect(publicRes.body.data.every((b: any) => b.isActive === true)).toBe(true);

      // Admin view
      const adminRes = await request(app)
        .get('/api/banners/admin')
        .set('Cookie', adminCookie);

      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBe(3);
    });

    it('should not expose deactivated banner to public after update', async () => {
      const { cookie: adminCookie } = await createAuthedUser('ADMIN');
      const banner = await Banner.create({
        title: 'Was Active',
        imageUrl: 'http://image.jpg',
        isActive: true,
      });

      // Public can see it
      const publicBefore = await request(app).get('/api/banners');
      expect(publicBefore.body.data.length).toBe(1);

      // Admin deactivates it
      await request(app)
        .put(`/api/banners/${banner._id}`)
        .set('Cookie', adminCookie)
        .send({ isActive: false });

      // Public should not see it anymore
      const publicAfter = await request(app).get('/api/banners');
      expect(publicAfter.body.data.length).toBe(0);

      // Admin should still see it
      const adminAfter = await request(app)
        .get('/api/banners/admin')
        .set('Cookie', adminCookie);

      expect(adminAfter.body.data.length).toBe(1);
    });
  });
});
