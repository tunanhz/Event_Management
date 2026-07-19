import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser, uniqueEmail, tokenForMissingUser } from '../../setup/auth-test-helpers';
import { User } from '../../../modules/user/user.model';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';
import * as dbModule from '../../../config/database';

describe('User Profile Routes', () => {
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

  describe('GET /api/users/me', () => {
    it('should return authenticated user profile', async () => {
      const { user, cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(String(user._id));
      expect(res.body.data.email).toBe(user.email);
      expect(res.body.data.fullName).toBe(user.fullName);
      expect(res.body.data.role).toBe('PARTICIPANT');
    });

    it('should work with Bearer token header', async () => {
      const { user, token } = await createAuthedUser('ORGANIZER');

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data._id).toBe(String(user._id));
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Cookie', 'token=invalid.token.here');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject token for non-existent user', async () => {
      const token = tokenForMissingUser();

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject token for banned user', async () => {
      const { user, token } = await createAuthedUser('PARTICIPANT', { accountStatus: 'BANNED' });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should not expose password hash', async () => {
      const { user, cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should return all expected user fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .get('/api/users/me')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      const user = res.body.data;
      expect(user).toHaveProperty('_id');
      expect(user).toHaveProperty('fullName');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('accountStatus');
      expect(user).toHaveProperty('createdAt');
      expect(user).toHaveProperty('updatedAt');
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update user profile fullName', async () => {
      const { user, cookie } = await createAuthedUser('PARTICIPANT');
      const newName = 'Updated Name';

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({ fullName: newName });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe(newName);

      // Verify in DB
      const dbUser = await User.findById(user._id);
      expect(dbUser?.fullName).toBe(newName);
    });

    it('should change password with current password verification', async () => {
      const currentPassword = 'CurrentPassword@123';
      const { user, cookie } = await createAuthedUser('PARTICIPANT', { password: currentPassword });

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          currentPassword,
          newPassword: 'NewPassword@456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify old password no longer works
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: currentPassword,
        });
      expect(loginRes.status).toBe(401);

      // Verify new password works
      const newLoginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'NewPassword@456',
        });
      expect(newLoginRes.status).toBe(200);
    });

    it('should reject password change without current password', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          newPassword: 'NewPassword@456', // Missing currentPassword
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('mật khẩu hiện tại');
    });

    it('should reject password change with wrong current password', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT', { password: 'CurrentPassword@123' });

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          currentPassword: 'WrongPassword@123',
          newPassword: 'NewPassword@456',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('không chính xác');
    });

    it('should reject password shorter than 6 characters', async () => {
      const password = 'Current@123';
      const { cookie } = await createAuthedUser('PARTICIPANT', { password });

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          currentPassword: password,
          newPassword: 'short', // Less than 6 chars
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ít nhất 6');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .send({ fullName: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should update multiple fields at once', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          fullName: 'New Full Name',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe('New Full Name');
    });

    it('should not expose password hash in response', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({ fullName: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.passwordHash).toBeUndefined();
    });

    it('should not allow role change via body', async () => {
      const { user, cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .put('/api/users/me')
        .set('Cookie', cookie)
        .send({
          fullName: 'New Name',
          role: 'ADMIN', // Try to escalate privilege
        });

      expect(res.status).toBe(200);

      // Verify role was not changed
      const dbUser = await User.findById(user._id);
      expect(dbUser?.role).toBe('PARTICIPANT');
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .put('/api/users/me')
        .set('Authorization', 'Bearer invalid.token')
        .send({ fullName: 'New Name' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/users/admin', () => {
    it('should return user list for admin', async () => {
      const { cookie: adminCookie } = await createAuthedUser('ADMIN');
      const { user: participant1 } = await createAuthedUser('PARTICIPANT');
      const { user: participant2 } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/admin')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject non-admin users', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/admin')
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('quyền');
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/users/admin');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should support pagination', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      await createAuthedUser('PARTICIPANT');
      await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/admin?page=1&limit=1')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.currentPage).toBe(1);
      expect(res.body.meta.itemsPerPage).toBe(1);
    });

    it('should filter by role', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      await createAuthedUser('PARTICIPANT');
      await createAuthedUser('ORGANIZER');
      await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .get('/api/users/admin?role=ORGANIZER')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u: any) => u.role === 'ORGANIZER')).toBe(true);
    });

    it('should filter by status', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      await createAuthedUser('PARTICIPANT', { accountStatus: 'ACTIVE' });
      await createAuthedUser('PARTICIPANT', { accountStatus: 'BANNED' });

      const res = await request(app)
        .get('/api/users/admin?status=BANNED')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.every((u: any) => u.accountStatus === 'BANNED')).toBe(true);
    });

    it('should search by name or email', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      await createAuthedUser('PARTICIPANT', { fullName: 'John Doe', email: uniqueEmail('john') });
      await createAuthedUser('PARTICIPANT', { fullName: 'Jane Smith', email: uniqueEmail('jane') });

      const res = await request(app)
        .get('/api/users/admin?search=john')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.some((u: any) => u.fullName.toLowerCase().includes('john'))).toBe(true);
    });
  });

  describe('POST /api/users/admin/staff', () => {
    it('should create staff account with pending status', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const staffEmail = uniqueEmail('staff');
      const staffName = 'New Staff Member';

      const res = await request(app)
        .post('/api/users/admin/staff')
        .set('Cookie', cookie)
        .send({
          fullName: staffName,
          email: staffEmail,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(staffEmail.toLowerCase());
      expect(res.body.data.fullName).toBe(staffName);
      expect(res.body.data.role).toBe('STAFF');
      expect(res.body.data.accountStatus).toBe('PENDING');

      // Verify in DB
      const dbStaff = await User.findOne({ email: staffEmail.toLowerCase() });
      expect(dbStaff?.role).toBe('STAFF');
      expect(dbStaff?.accountStatus).toBe('PENDING');
    });

    it('should reject non-admin staff creation', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post('/api/users/admin/staff')
        .set('Cookie', cookie)
        .send({
          fullName: 'Staff',
          email: uniqueEmail('staff'),
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should reject duplicate email', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const email = uniqueEmail('staff');

      // Create first staff
      await request(app)
        .post('/api/users/admin/staff')
        .set('Cookie', cookie)
        .send({ fullName: 'Staff 1', email });

      // Try to create with same email
      const res = await request(app)
        .post('/api/users/admin/staff')
        .set('Cookie', cookie)
        .send({ fullName: 'Staff 2', email });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email already registered');
    });

    it('should reject missing required fields', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/users/admin/staff')
        .set('Cookie', cookie)
        .send({
          fullName: 'Staff', // Missing email
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/admin/:id/role', () => {
    it('should update user role', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'ORGANIZER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ORGANIZER');

      // Verify in DB
      const dbUser = await User.findById(user._id);
      expect(dbUser?.role).toBe('ORGANIZER');
    });

    it('should reject non-admin role update', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'ORGANIZER' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent admin from changing own role', async () => {
      const { user, cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'PARTICIPANT' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('tự');
    });

    it('should reject invalid role', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/role`)
        .set('Cookie', cookie)
        .send({ role: 'INVALID_ROLE' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject for non-existent user', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post('/api/users/admin/000000000000000000000000/role')
        .set('Cookie', cookie)
        .send({ role: 'ORGANIZER' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/admin/:id/status', () => {
    it('should ban user account', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'BANNED' });

      expect(res.status).toBe(200);
      expect(res.body.data.accountStatus).toBe('BANNED');
    });

    it('should activate user account', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT', { accountStatus: 'PENDING' });

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'ACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.data.accountStatus).toBe('ACTIVE');
    });

    it('should reject non-admin status update', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'BANNED' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent admin from banning themselves', async () => {
      const { user, cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'BANNED' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('tự');
    });

    it('should reject invalid status', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .post(`/api/users/admin/${user._id}/status`)
        .set('Cookie', cookie)
        .send({ status: 'INVALID' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/users/admin/:id', () => {
    it('should delete user account', async () => {
      const { cookie } = await createAuthedUser('ADMIN');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .delete(`/api/users/admin/${user._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify deleted in DB
      const dbUser = await User.findById(user._id);
      expect(dbUser).toBeNull();
    });

    it('should reject non-admin deletion', async () => {
      const { cookie } = await createAuthedUser('PARTICIPANT');
      const { user } = await createAuthedUser('PARTICIPANT');

      const res = await request(app)
        .delete(`/api/users/admin/${user._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should prevent admin from deleting themselves', async () => {
      const { user, cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .delete(`/api/users/admin/${user._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject deletion of non-existent user', async () => {
      const { cookie } = await createAuthedUser('ADMIN');

      const res = await request(app)
        .delete('/api/users/admin/000000000000000000000000')
        .set('Cookie', cookie);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/activate', () => {
    it('should activate staff account and update profile', async () => {
      const password = 'TempPassword@123';
      const { user: staff } = await createAuthedUser('STAFF', {
        password,
        accountStatus: 'PENDING',
      });

      // Generate activation token
      const activationToken = jwt.sign(
        { id: String(staff._id), email: staff.email, purpose: 'activation' },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/users/activate')
        .send({
          token: activationToken,
          fullName: 'Activated Staff',
          password: 'NewPassword@456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountStatus).toBe('ACTIVE');
      expect(res.body.data.fullName).toBe('Activated Staff');

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({
          email: staff.email,
          password: 'NewPassword@456',
        });
      expect(loginRes.status).toBe(200);
    });

    it('should reject invalid activation token', async () => {
      const res = await request(app)
        .post('/api/users/activate')
        .send({
          token: 'invalid.token',
          fullName: 'Staff',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject expired activation token', async () => {
      const { user: staff } = await createAuthedUser('STAFF', {
        accountStatus: 'PENDING',
      });

      const expiredToken = jwt.sign(
        { id: String(staff._id), email: staff.email, purpose: 'activation' },
        config.jwt.secret,
        { expiresIn: '0s' } // Expired immediately
      );

      // Wait a moment for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .post('/api/users/activate')
        .send({
          token: expiredToken,
          fullName: 'Staff',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('hết hạn');
    });

    it('should reject activation for already active account', async () => {
      const { user: staff } = await createAuthedUser('STAFF', {
        accountStatus: 'ACTIVE',
      });

      const token = jwt.sign(
        { id: String(staff._id), email: staff.email, purpose: 'activation' },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/users/activate')
        .send({
          token,
          fullName: 'Staff',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject short password', async () => {
      const { user: staff } = await createAuthedUser('STAFF', {
        accountStatus: 'PENDING',
      });

      const token = jwt.sign(
        { id: String(staff._id), email: staff.email, purpose: 'activation' },
        config.jwt.secret,
        { expiresIn: '7d' }
      );

      const res = await request(app)
        .post('/api/users/activate')
        .send({
          token,
          fullName: 'Staff',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ít nhất 6');
    });

    it('should reject missing activation token', async () => {
      const res = await request(app)
        .post('/api/users/activate')
        .send({
          fullName: 'Staff',
          password: 'Password@123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
