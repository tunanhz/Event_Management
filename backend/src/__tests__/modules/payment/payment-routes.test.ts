import request from 'supertest';
import app from '../../../app';
import {
  connectInMemoryDatabase,
  clearDatabase,
  closeInMemoryDatabase,
} from '../../setup/in-memory-database';
import { createAuthedUser, uniqueEmail } from '../../setup/auth-test-helpers';
import { Event } from '../../../modules/event/event.model';
import { Ticket } from '../../../modules/organizer/ticket.model';
import { Registration } from '../../../modules/registration/registration.model';
import mongoose from 'mongoose';
import { signParams, buildOrderInfo, formatVnpayDate } from '../../../modules/payment/vnpay.util';

describe('Payment Routes', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('POST /api/payments/vnpay/create-payment-url', () => {
    it('should create a payment URL for a participant owned registration', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 2,
        unitPrice: 100000,
        totalAmount: 200000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/payments/vnpay/create-payment-url')
        .set('Cookie', participant.cookie)
        .send({
          registrationIds: [registration._id.toString()],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('paymentUrl');
      expect(res.body.data.paymentUrl).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html');
      expect(res.body.data.paymentUrl).toContain('vnp_SecureHash=');
    });

    it('should return 401 if unauthenticated', async () => {
      const res = await request(app).post('/api/payments/vnpay/create-payment-url').send({
        registrationIds: ['507f1f77bcf86cd799439011'],
      });

      expect(res.status).toBe(401);
    });

    it('should return 403 if not a PARTICIPANT', async () => {
      const admin = await createAuthedUser('ADMIN');
      const res = await request(app)
        .post('/api/payments/vnpay/create-payment-url')
        .set('Cookie', admin.cookie)
        .send({
          registrationIds: ['507f1f77bcf86cd799439011'],
        });

      expect(res.status).toBe(403);
    });

    it('should reject unknown registration ids', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const unknownId = new mongoose.Types.ObjectId();

      const res = await request(app)
        .post('/api/payments/vnpay/create-payment-url')
        .set('Cookie', participant.cookie)
        .send({
          registrationIds: [unknownId.toString()],
        });

      expect(res.status).toBe(404);
    });

    it('should reject foreign registrations', async () => {
      const participant1 = await createAuthedUser('PARTICIPANT');
      const participant2 = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant1.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/payments/vnpay/create-payment-url')
        .set('Cookie', participant2.cookie)
        .send({
          registrationIds: [registration._id.toString()],
        });

      expect(res.status).toBe(404);
    });

    it('should include all passed registration ids in the order info', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const reg1 = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const reg2 = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 2,
        unitPrice: 100000,
        totalAmount: 200000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/payments/vnpay/create-payment-url')
        .set('Cookie', participant.cookie)
        .send({
          registrationIds: [reg1._id.toString(), reg2._id.toString()],
        });

      expect(res.status).toBe(200);
      const url = res.body.data.paymentUrl;
      expect(url).toContain(`EVB_${reg1._id.toString()}-${reg2._id.toString()}`);
    });
  });

  describe('GET /api/payments/vnpay/return', () => {
    it('should redirect to frontend with status=success for a valid callback', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const paymentDate = formatVnpayDate(new Date());
      const hashSecret = 'TESTHASHSECRET0123456789';
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: paymentDate,
      };

      const hash = signParams(params, hashSecret);

      const res = await request(app).get('/api/payments/vnpay/return').query({
        ...params,
        vnp_SecureHash: hash,
      });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('status=success');
    });

    it('should reject an invalid signature', async () => {
      const params = {
        vnp_OrderInfo: 'EVB_507f1f77bcf86cd799439011',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: '20240115080000',
        vnp_SecureHash: 'invalidsignaturehash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      const res = await request(app).get('/api/payments/vnpay/return').query(params);

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('status=failed');
      expect(res.headers.location).toContain(encodeURIComponent('Chữ ký không hợp lệ'));
    });

    it('should leave DB unchanged if signature is invalid', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: '20240115080000',
        vnp_SecureHash: 'invalidsignaturehash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      const beforeCount = await Registration.countDocuments({ status: 'PENDING' });
      await request(app).get('/api/payments/vnpay/return').query(params);
      const afterCount = await Registration.countDocuments({ status: 'PENDING' });

      expect(beforeCount).toBe(1);
      expect(afterCount).toBe(1);
    });

    it('should mark registration as PAID on valid callback', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const paymentDate = formatVnpayDate(new Date());
      const hashSecret = 'TESTHASHSECRET0123456789';
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: paymentDate,
      };

      const hash = signParams(params, hashSecret);
      await request(app).get('/api/payments/vnpay/return').query({
        ...params,
        vnp_SecureHash: hash,
      });

      const updated = await Registration.findById(registration._id);
      expect(updated?.status).toBe('PAID');
    });
  });

  describe('GET /api/payments/vnpay/ipn', () => {
    it('should accept a valid IPN callback and return RspCode 00', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const paymentDate = formatVnpayDate(new Date());
      const hashSecret = 'TESTHASHSECRET0123456789';
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: paymentDate,
      };

      const hash = signParams(params, hashSecret);

      const res = await request(app).get('/api/payments/vnpay/ipn').query({
        ...params,
        vnp_SecureHash: hash,
      });

      expect(res.status).toBe(200);
      expect(res.body.RspCode).toBe('00');
      expect(res.body.Message).toBe('Confirm Success');
    });

    it('should reject invalid signature with RspCode 97', async () => {
      const params = {
        vnp_OrderInfo: 'EVB_507f1f77bcf86cd799439011',
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: '20240115080000',
        vnp_SecureHash: 'invalidsignaturehash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      const res = await request(app).get('/api/payments/vnpay/ipn').query(params);

      expect(res.status).toBe(200);
      expect(res.body.RspCode).toBe('97');
      expect(res.body.Message).toBe('Invalid signature');
    });

    it('should not mutate DB if signature is invalid', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'TEST123456',
        vnp_TxnRef: 'TXN001',
        vnp_Amount: '10000000',
        vnp_PayDate: '20240115080000',
        vnp_SecureHash: 'invalidsignaturehash1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      };

      const beforeStatus = (await Registration.findById(registration._id))?.status;
      await request(app).get('/api/payments/vnpay/ipn').query(params);
      const afterStatus = (await Registration.findById(registration._id))?.status;

      expect(beforeStatus).toBe('PENDING');
      expect(afterStatus).toBe('PENDING');
    });

    it('should be idempotent for duplicate callbacks with same transaction', async () => {
      const participant = await createAuthedUser('PARTICIPANT');
      const eventId = new mongoose.Types.ObjectId();
      const ticketId = new mongoose.Types.ObjectId();

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

      await Ticket.create({
        _id: ticketId,
        eventId,
        ticketName: 'General Admission',
        price: 100000,
        quantity: 50,
        soldQuantity: 0,
        minPerOrder: 1,
        maxPerOrder: 10,
        status: 'ACTIVE',
      });

      const registration = await Registration.create({
        participantId: participant.id,
        eventId,
        ticketId,
        quantity: 1,
        unitPrice: 100000,
        totalAmount: 100000,
        registerDate: new Date(),
        status: 'PENDING',
        holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      const orderInfo = buildOrderInfo([registration._id.toString()]);
      const paymentDate = formatVnpayDate(new Date());
      const hashSecret = 'TESTHASHSECRET0123456789';
      const params = {
        vnp_OrderInfo: orderInfo,
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_TransactionNo: 'DUPLICATE_TEST_123456',
        vnp_TxnRef: 'TXN002',
        vnp_Amount: '10000000',
        vnp_PayDate: paymentDate,
      };

      const hash = signParams(params, hashSecret);

      const res1 = await request(app).get('/api/payments/vnpay/ipn').query({
        ...params,
        vnp_SecureHash: hash,
      });

      const res2 = await request(app).get('/api/payments/vnpay/ipn').query({
        ...params,
        vnp_SecureHash: hash,
      });

      expect(res1.status).toBe(200);
      expect(res1.body.RspCode).toBe('00');
      expect(res2.status).toBe(200);
      expect(res2.body.RspCode).toBe('00');

      const finalReg = await Registration.findById(registration._id);
      expect(finalReg?.status).toBe('PAID');
    });
  });
});
