/**
 * Manual QA script for EM-132 "Ticket inventory management" (organizer module).
 *
 * Exercises `GET /api/organizer/events/:id/tickets/inventory` and
 * `PATCH /api/organizer/events/:id/tickets/:ticketId/inventory` against a
 * *running* backend (`npm run dev`), including the full create → submit →
 * approve → hold → pay lifecycle needed to produce real sold/held numbers.
 * Self-contained: registers its own ORGANIZER/PARTICIPANT accounts, inserts
 * its own QA admin directly via the User model (bypassing SMTP/registration).
 *
 *   npx tsx src/modules/organizer/ticket-inventory.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';
import { User } from '../user/user.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.em132@example.com';
const ORGANIZER_PASSWORD = 'QaOrganizer@123';
const ADMIN_EMAIL = 'qa.admin.em132@example.com';
const ADMIN_PASSWORD = 'QaAdmin@123456';

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: unknown): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    console.log(`  ❌ ${label}`, detail !== undefined ? JSON.stringify(detail) : '');
  }
}

async function api(
  method: string,
  path: string,
  token?: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function ensureOrganizerToken(): Promise<string> {
  const login = await api('POST', '/api/users/login', undefined, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
  });
  if (login.status === 200) return login.json.data.token;

  await api('POST', '/api/users/otp/send', undefined, { email: ORGANIZER_EMAIL });
  const otpDoc = await OTP.findOne({ email: ORGANIZER_EMAIL }).sort({ createdAt: -1 });
  if (!otpDoc) throw new Error('OTP not found in DB — is MongoDB reachable and MONGODB_URI correct?');

  const register = await api('POST', '/api/users/register', undefined, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
    fullName: 'QA Organizer EM-132',
    otpCode: otpDoc.otp,
    role: 'ORGANIZER',
  });
  if (register.status !== 201) {
    throw new Error(`Failed to register QA organizer: ${JSON.stringify(register.json)}`);
  }
  return register.json.data.token;
}

async function ensureParticipantToken(credential: string): Promise<string> {
  const res = await api('POST', '/api/users/google', undefined, { credential });
  if (res.status !== 200) {
    throw new Error(`Failed to obtain participant token: ${JSON.stringify(res.json)}`);
  }
  return res.json.data.token;
}

async function ensureAdminToken(): Promise<string> {
  let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');
  if (!admin) {
    admin = new User({
      fullName: 'QA Admin EM-132',
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD, // hashed by the model's pre-save hook
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
    });
    await admin.save();
  }
  const login = await api('POST', '/api/users/login', undefined, {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  if (login.status !== 200) {
    throw new Error(`Failed to login QA admin: ${JSON.stringify(login.json)}`);
  }
  return login.json.data.token;
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  console.log(`QA target: ${BASE_URL}\n`);

  const organizerToken = await ensureOrganizerToken();
  const adminToken = await ensureAdminToken();
  const buyerToken = await ensureParticipantToken('mock_qa_buyer_em132');
  const otherParticipantToken = await ensureParticipantToken('mock_qa_bystander_em132');

  const categories = await api('GET', '/api/categories');
  const category = categories.json.data?.[0];
  if (!category) {
    throw new Error('No categories found — run `npm run seed:homepage` first.');
  }

  console.log('1. Create + submit + approve a draft event with 5 Standard tickets');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA EM-132 Test Event',
    description: 'Created by ticket-inventory.qa.ts',
    location: 'Nhà hát Hòa Bình, TP.HCM',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    capacity: 200,
    tickets: [{ ticketName: 'Standard', price: 300000, quantity: 5 }],
  });
  check('Create returns 201', created.status === 201, created.json);
  const eventId = created.json.data?.event?._id;
  const ticketId = created.json.data?.tickets?.[0]?._id;

  const submit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submit returns 200', submit.status === 200, submit.json);

  const approved = await api('POST', `/api/admin/events/${eventId}/approve`, adminToken);
  check('Approve returns 200 -> PUBLISHED', approved.status === 200 && approved.json.data?.reviewStatus === 'PUBLISHED', approved.json);

  console.log('2. Authorization guards');
  const forbiddenGet = await api('GET', `/api/organizer/events/${eventId}/tickets/inventory`, buyerToken);
  check('PARTICIPANT cannot view inventory (403)', forbiddenGet.status === 403, forbiddenGet.json);

  const forbiddenPatch = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    buyerToken,
    { quantity: 999 }
  );
  check('PARTICIPANT cannot adjust inventory (403)', forbiddenPatch.status === 403, forbiddenPatch.json);

  console.log('3. Inventory starts fully available');
  const initial = await api('GET', `/api/organizer/events/${eventId}/tickets/inventory`, organizerToken);
  check('Inventory returns 200', initial.status === 200, initial.json);
  const row0 = initial.json.data?.find((r: any) => r.ticketId === ticketId);
  check(
    'quantity=5, sold=0, held=0, available=5',
    row0?.quantity === 5 && row0?.sold === 0 && row0?.held === 0 && row0?.available === 5,
    row0
  );

  console.log('4. Buyer holds 2 tickets (PENDING) — inventory reflects the hold');
  const hold = await api('POST', '/api/registrations', buyerToken, { eventId, ticketId, quantity: 2 });
  check('Hold returns 201', hold.status === 201, hold.json);
  const registrationId = hold.json.data?._id;

  const afterHold = await api('GET', `/api/organizer/events/${eventId}/tickets/inventory`, organizerToken);
  const row1 = afterHold.json.data?.find((r: any) => r.ticketId === ticketId);
  check(
    'held=2, sold=0, soldQuantity=2, available=3',
    row1?.held === 2 && row1?.sold === 0 && row1?.soldQuantity === 2 && row1?.available === 3,
    row1
  );

  console.log('5. Buyer confirms payment — inventory moves held -> sold');
  const confirm = await api('POST', `/api/registrations/${registrationId}/confirm-payment`, buyerToken);
  check('Confirm payment returns 200', confirm.status === 200, confirm.json);

  const afterPay = await api('GET', `/api/organizer/events/${eventId}/tickets/inventory`, organizerToken);
  const row2 = afterPay.json.data?.find((r: any) => r.ticketId === ticketId);
  check(
    'sold=2, held=0, soldQuantity=2, available=3',
    row2?.sold === 2 && row2?.held === 0 && row2?.soldQuantity === 2 && row2?.available === 3,
    row2
  );

  console.log('6. Restock validation: cannot drop quantity below soldQuantity');
  const badRestock = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    organizerToken,
    { quantity: 1 }
  );
  check('quantity < soldQuantity rejected (400)', badRestock.status === 400, badRestock.json);

  console.log('7. Restock upward: quantity 5 -> 10 while event is PUBLISHED');
  const restock = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    organizerToken,
    { quantity: 10 }
  );
  check('Restock returns 200', restock.status === 200, restock.json);
  check('New quantity is 10', restock.json.data?.quantity === 10, restock.json);

  const afterRestock = await api('GET', `/api/organizer/events/${eventId}/tickets/inventory`, organizerToken);
  const row3 = afterRestock.json.data?.find((r: any) => r.ticketId === ticketId);
  check('available recomputed to 8 after restock', row3?.available === 8, row3);

  console.log('8. Pause sales: status -> HIDDEN blocks new holds');
  const pause = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    organizerToken,
    { status: 'HIDDEN' }
  );
  check('Pause returns 200', pause.status === 200 && pause.json.data?.status === 'HIDDEN', pause.json);

  const blockedHold = await api('POST', '/api/registrations', otherParticipantToken, {
    eventId,
    ticketId,
    quantity: 1,
  });
  check('New hold on HIDDEN ticket rejected (400)', blockedHold.status === 400, blockedHold.json);

  console.log('9. Resume sales: status -> ACTIVE allows holds again');
  const resume = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    organizerToken,
    { status: 'ACTIVE' }
  );
  check('Resume returns 200', resume.status === 200 && resume.json.data?.status === 'ACTIVE', resume.json);

  const allowedHold = await api('POST', '/api/registrations', otherParticipantToken, {
    eventId,
    ticketId,
    quantity: 1,
  });
  check('Hold after resume returns 201', allowedHold.status === 201, allowedHold.json);

  console.log('10. Input validation: no-op patch rejected');
  const empty = await api(
    'PATCH',
    `/api/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    organizerToken,
    {}
  );
  check('Empty patch body rejected (400)', empty.status === 400, empty.json);

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
