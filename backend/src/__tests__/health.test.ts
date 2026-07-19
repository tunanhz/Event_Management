import request from 'supertest';
import app from '../app';
import { connectInMemoryDatabase, closeInMemoryDatabase } from './setup/in-memory-database';

describe('Application Bootstrap', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('GET /api/health', () => {
    it('should report the service as healthy', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should return an ISO timestamp', async () => {
      const res = await request(app).get('/api/health');

      expect(Number.isNaN(Date.parse(res.body.timestamp))).toBe(false);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for an unmapped path', async () => {
      const res = await request(app).get('/api/this-route-does-not-exist');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
