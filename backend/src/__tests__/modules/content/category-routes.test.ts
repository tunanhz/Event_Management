import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser, uniqueEmail } from '../../setup/auth-test-helpers';
import { Category } from '../../../modules/category/category.model';
import * as dbModule from '../../../config/database';

describe('Category Routes', () => {
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

  describe('GET /api/categories', () => {
    it('should return empty list when no categories exist', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return all public categories', async () => {
      // Seed categories
      await Category.create([
        { name: 'Music', slug: 'music', icon: '🎵', order: 1 },
        { name: 'Sports', slug: 'sports', icon: '⚽', order: 2 },
        { name: 'Tech', slug: 'tech', icon: '💻', order: 3 },
      ]);

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(3);
      expect(res.body.data[0].name).toBe('Music');
    });

    it('should sort categories by order', async () => {
      await Category.create([
        { name: 'Last', slug: 'last', icon: '📍', order: 99 },
        { name: 'First', slug: 'first', icon: '🎯', order: 1 },
        { name: 'Middle', slug: 'middle', icon: '⭐', order: 50 },
      ]);

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('First');
      expect(res.body.data[1].name).toBe('Middle');
      expect(res.body.data[2].name).toBe('Last');
    });

    it('should not require authentication', async () => {
      await Category.create({ name: 'Public', slug: 'public', icon: '🌍', order: 1 });

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
    });

    it('should return complete category object', async () => {
      await Category.create({
        name: 'Conference',
        slug: 'conference',
        icon: '🎤',
        order: 5,
      });

      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      const category = res.body.data[0];
      expect(category).toHaveProperty('_id');
      expect(category).toHaveProperty('name');
      expect(category).toHaveProperty('slug');
      expect(category).toHaveProperty('icon');
      expect(category).toHaveProperty('order');
      expect(category).toHaveProperty('createdAt');
      expect(category).toHaveProperty('updatedAt');
    });
  });

  describe('POST /api/categories', () => {
    it('should create category as admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({
          name: 'Workshop',
          slug: 'workshop',
          icon: '🔧',
          order: 1,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Workshop');
      expect(res.body.data.slug).toBe('workshop');

      // Verify in DB
      const dbCategory = await Category.findOne({ slug: 'workshop' });
      expect(dbCategory).toBeDefined();
    });

    it('should reject creation by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({
          name: 'Workshop',
          slug: 'workshop',
          icon: '🔧',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject creation without authentication', async () => {
      const res = await request(app)
        .post('/api/categories')
        .send({
          name: 'Workshop',
          slug: 'workshop',
          icon: '🔧',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate slug', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const slug = 'unique-slug';

      // Create first
      await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({ name: 'First', slug, icon: '🎯' });

      // Try to create duplicate
      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({ name: 'Second', slug, icon: '⭐' });

      expect(res.status).toBe(409); // Conflict: duplicate key error
    });

    it('should reject missing required fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({
          name: 'Workshop', // Missing slug and icon
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should trim and lowercase slug', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({
          name: 'Test',
          slug: '  UPPER_CASE  ',
          icon: '🏷️',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.slug).toBe('upper_case');
    });

    it('should accept order parameter', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/categories')
        .set('Cookie', cookie)
        .send({
          name: 'Ordered',
          slug: 'ordered',
          icon: '📊',
          order: 42,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.order).toBe(42);
    });
  });

  describe('PUT /api/categories/:id', () => {
    it('should update category by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const category = await Category.create({
        name: 'Original',
        slug: 'original',
        icon: '📌',
      });

      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Cookie', cookie)
        .send({
          name: 'Updated',
          icon: '✨',
          order: 5,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated');
      expect(res.body.data.icon).toBe('✨');
      expect(res.body.data.order).toBe(5);

      // Verify in DB
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory?.name).toBe('Updated');
    });

    it('should reject update by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const category = await Category.create({
        name: 'Test',
        slug: 'test',
        icon: '🎯',
      });

      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Cookie', cookie)
        .send({ name: 'New Name' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject update without authentication', async () => {
      const category = await Category.create({
        name: 'Test',
        slug: 'test',
        icon: '🎯',
      });

      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject update of non-existent category', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .put('/api/categories/000000000000000000000000')
        .set('Cookie', cookie)
        .send({ name: 'New Name' });

      expect(res.status).toBe(404); // Not found
    });

    it('should allow partial update', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const category = await Category.create({
        name: 'Original',
        slug: 'original',
        icon: '📌',
        order: 1,
      });

      const res = await request(app)
        .put(`/api/categories/${category._id}`)
        .set('Cookie', cookie)
        .send({ name: 'Only Name Changed' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Only Name Changed');
      expect(res.body.data.slug).toBe('original'); // Unchanged
      expect(res.body.data.icon).toBe('📌'); // Unchanged
    });
  });

  describe('DELETE /api/categories/:id', () => {
    it('should delete category by admin', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const category = await Category.create({
        name: 'To Delete',
        slug: 'to-delete',
        icon: '🗑️',
      });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted in DB
      const dbCategory = await Category.findById(category._id);
      expect(dbCategory).toBeNull();
    });

    it('should reject deletion by non-admin', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const category = await Category.create({
        name: 'Protected',
        slug: 'protected',
        icon: '🔒',
      });

      const res = await request(app)
        .delete(`/api/categories/${category._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion without authentication', async () => {
      const category = await Category.create({
        name: 'Protected',
        slug: 'protected',
        icon: '🔒',
      });

      const res = await request(app).delete(`/api/categories/${category._id}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion of non-existent category', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .delete('/api/categories/000000000000000000000000')
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
