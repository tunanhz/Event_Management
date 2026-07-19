import request from 'supertest';
import app from '../../../app';
import { connectInMemoryDatabase, clearDatabase, closeInMemoryDatabase } from '../../setup/in-memory-database';
import { createAuthedUser, uniqueEmail } from '../../setup/auth-test-helpers';
import { OTP } from '../../../modules/user/otp.model';
import { User } from '../../../modules/user/user.model';
import { emailService } from '../../../common/utils/email.service';
import * as dbModule from '../../../config/database';

// Mock email service so no SMTP calls happen
jest.mock('../../../common/utils/email.service');

describe('User Authentication Routes', () => {
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

  describe('POST /api/users/otp/send', () => {
    it('should send OTP to a valid email', async () => {
      const email = uniqueEmail();

      const res = await request(app)
        .post('/api/users/otp/send')
        .send({ email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Mã OTP');

      // Verify OTP was stored
      const otpRecord = await OTP.findOne({ email: email.toLowerCase().trim() });
      expect(otpRecord).toBeDefined();
      expect(otpRecord?.otp).toMatch(/^\d{6}$/);
    });

    it('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/users/otp/send')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should clear previous OTPs for the same email', async () => {
      const email = uniqueEmail();

      // Send OTP first time
      await request(app).post('/api/users/otp/send').send({ email });
      const firstOtp = await OTP.findOne({ email: email.toLowerCase().trim() });
      expect(firstOtp?.otp).toBeDefined();

      // Send OTP second time
      await request(app).post('/api/users/otp/send').send({ email });
      const otps = await OTP.find({ email: email.toLowerCase().trim() });
      expect(otps.length).toBe(1); // Only one OTP should exist
    });

    it('should handle email with whitespace', async () => {
      const email = '  test.user@test.com  ';

      const res = await request(app)
        .post('/api/users/otp/send')
        .send({ email });

      expect(res.status).toBe(200);

      // Check OTP was stored with trimmed email
      const otpRecord = await OTP.findOne({ email: 'test.user@test.com' });
      expect(otpRecord).toBeDefined();
    });
  });

  describe('POST /api/users/register', () => {
    it('should register a new user with valid OTP', async () => {
      const email = uniqueEmail();
      const password = 'SecurePassword@123';
      const fullName = 'Test User';

      // Step 1: Send OTP
      await request(app).post('/api/users/otp/send').send({ email });
      const otpRecord = await OTP.findOne({ email: email.toLowerCase().trim() });
      const otp = otpRecord!.otp;

      // Step 2: Register with OTP
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password,
          fullName,
          otpCode: otp,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(email.toLowerCase());
      expect(res.body.data.user.fullName).toBe(fullName);
      expect(res.body.data.user.role).toBe('PARTICIPANT');
      expect(res.body.data.user.passwordHash).toBeUndefined(); // Should not expose password

      // Verify token is in response
      expect(res.body.data.token).toBeDefined();

      // Verify cookie is set
      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('token=');

      // Verify user was created in DB
      const user = await User.findOne({ email: email.toLowerCase() });
      expect(user).toBeDefined();
      expect(user?.accountStatus).toBe('ACTIVE');

      // Verify OTP was deleted after use
      const deletedOtp = await OTP.findOne({ email: email.toLowerCase().trim() });
      expect(deletedOtp).toBeNull();
    });

    it('should reject registration with invalid OTP', async () => {
      const email = uniqueEmail();

      // Send OTP
      await request(app).post('/api/users/otp/send').send({ email });

      // Try to register with wrong OTP
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password: 'SecurePassword@123',
          fullName: 'Test User',
          otpCode: '999999', // Wrong OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('OTP');
    });

    it('should reject registration without OTP', async () => {
      const res = await request(app)
        .post('/api/users/register')
        .send({
          email: uniqueEmail(),
          password: 'SecurePassword@123',
          fullName: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with duplicate email', async () => {
      const email = uniqueEmail();
      const password = 'SecurePassword@123';

      // Create first user
      await request(app).post('/api/users/otp/send').send({ email });
      const otp1 = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;
      await request(app)
        .post('/api/users/register')
        .send({ email, password, fullName: 'User 1', otpCode: otp1 });

      // Try to register same email again
      await request(app).post('/api/users/otp/send').send({ email });
      const otp2 = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;
      const res = await request(app)
        .post('/api/users/register')
        .send({ email, password, fullName: 'User 2', otpCode: otp2 });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email already registered');
    });

    it('should prevent STAFF self-registration', async () => {
      const email = uniqueEmail();

      await request(app).post('/api/users/otp/send').send({ email });
      const otp = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;

      const res = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password: 'SecurePassword@123',
          fullName: 'Test User',
          otpCode: otp,
          role: 'STAFF', // Try to register as STAFF
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('STAFF');
    });

    it('should prevent non-first ADMIN registration', async () => {
      // Create an ADMIN first
      await createAuthedUser('ADMIN');

      // Try to register another ADMIN
      const email = uniqueEmail();
      await request(app).post('/api/users/otp/send').send({ email });
      const otp = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;

      const res = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password: 'SecurePassword@123',
          fullName: 'Another Admin',
          otpCode: otp,
          role: 'ADMIN',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('ADMIN');
    });

    it('should allow first ADMIN registration', async () => {
      const email = uniqueEmail();
      const password = 'AdminPassword@123';

      await request(app).post('/api/users/otp/send').send({ email });
      const otp = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;

      const res = await request(app)
        .post('/api/users/register')
        .send({
          email,
          password,
          fullName: 'First Admin',
          otpCode: otp,
          role: 'ADMIN',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('ADMIN');
    });

    it('should reject missing required fields', async () => {
      const email = uniqueEmail();

      await request(app).post('/api/users/otp/send').send({ email });
      const otp = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;

      const res = await request(app)
        .post('/api/users/register')
        .send({
          email, // Missing password, fullName, otpCode
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should not expose password hash in response', async () => {
      const email = uniqueEmail();
      const password = 'SecurePassword@123';

      await request(app).post('/api/users/otp/send').send({ email });
      const otp = (await OTP.findOne({ email: email.toLowerCase().trim() }))!.otp;

      const res = await request(app)
        .post('/api/users/register')
        .send({ email, password, fullName: 'Test', otpCode: otp });

      expect(res.status).toBe(201);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
    });
  });

  describe('POST /api/users/login', () => {
    it('should login with correct credentials', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('PARTICIPANT', { password });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(user.email);
      expect(res.body.data.token).toBeDefined();

      // Verify cookie is set
      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('token=');
    });

    it('should reject login with wrong password', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('PARTICIPANT', { password });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password: 'WrongPassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: uniqueEmail(),
          password: 'SomePassword@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject login with missing credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject login for PENDING account', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('STAFF', { password, accountStatus: 'PENDING' });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('chưa được kích hoạt');
    });

    it('should reject login for BANNED account', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('PARTICIPANT', { password, accountStatus: 'BANNED' });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password,
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('khóa');
    });

    it('should not expose password hash in response', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('PARTICIPANT', { password });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email,
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should handle case-insensitive email', async () => {
      const password = 'LoginPassword@123';
      const { user } = await createAuthedUser('PARTICIPANT', { password });

      const res = await request(app)
        .post('/api/users/login')
        .send({
          email: user.email.toUpperCase(),
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe(user.email);
    });
  });

  describe('POST /api/users/google', () => {
    it('should login/create user with google mock token', async () => {
      const res = await request(app)
        .post('/api/users/google')
        .send({
          credential: 'mock_testuser', // Mock token format
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toContain('@gmail.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should return existing user on second google login', async () => {
      const token = 'mock_sameuser';

      // First login
      const res1 = await request(app)
        .post('/api/users/google')
        .send({ credential: token });

      expect(res1.status).toBe(200);
      const firstUserId = res1.body.data.user._id;

      // Second login with same token
      const res2 = await request(app)
        .post('/api/users/google')
        .send({ credential: token });

      expect(res2.status).toBe(200);
      expect(res2.body.data.user._id).toBe(firstUserId);
    });

    it('should reject banned google user on second login', async () => {
      const token = 'mock_banneduser';

      // First login - creates user
      const res1 = await request(app)
        .post('/api/users/google')
        .send({ credential: token });

      expect(res1.status).toBe(200);
      const userId = res1.body.data.user._id;

      // Ban the user
      const { cookie: adminCookie } = await createAuthedUser('ADMIN');
      await request(app)
        .post(`/api/users/admin/${userId}/status`)
        .set('Cookie', adminCookie)
        .send({ status: 'BANNED' });

      // Second login attempt with banned user
      const res2 = await request(app)
        .post('/api/users/google')
        .send({ credential: token });

      expect(res2.status).toBe(403);
      expect(res2.body.success).toBe(false);
      expect(res2.body.message).toContain('khóa');
    });

    it('should reject missing credential', async () => {
      const res = await request(app)
        .post('/api/users/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/users/logout', () => {
    it('should clear token cookie', async () => {
      const { cookie } = await createAuthedUser();

      const res = await request(app)
        .post('/api/users/logout')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify cookie is cleared (either via Max-Age=0 or Expires in past)
      const setCookieHeader = res.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      expect(setCookieHeader[0]).toContain('token=');
      const isClearViaMaxAge = setCookieHeader[0].includes('Max-Age=0');
      const isClearViaExpires = setCookieHeader[0].includes('Expires=');
      expect(isClearViaMaxAge || isClearViaExpires).toBe(true);
    });

    it('should logout without authentication (no-op)', async () => {
      const res = await request(app)
        .post('/api/users/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
