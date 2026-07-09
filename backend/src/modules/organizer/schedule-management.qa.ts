/**
 * Manual QA script for EM-25 "Schedule management" (organizer module).
 *
 * Exercises the dedicated `GET/PUT /api/organizer/events/:id/shows` endpoints
 * against a *running* backend (`npm run dev`). Self-contained: registers its
 * own test ORGANIZER account (reading the OTP straight from MongoDB, bypassing
 * SMTP), creates its own event, and cleans up after itself.
 *
 *   npx tsx src/modules/organizer/schedule-management.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.em25@example.com';
const ORGANIZER_PASSWORD = 'QaOrganizer@123';

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

function daysFromNow(days: number, hours = 0): string {
  return new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000).toISOString();
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
    fullName: 'QA Organizer EM-25',
    otpCode: otpDoc.otp,
    role: 'ORGANIZER',
  });
  if (register.status !== 201) {
    throw new Error(`Failed to register QA organizer: ${JSON.stringify(register.json)}`);
  }
  return register.json.data.token;
}

async function ensureParticipantToken(): Promise<string> {
  const res = await api('POST', '/api/users/google', undefined, {
    credential: 'mock_qa_participant_em25',
  });
  if (res.status !== 200) {
    throw new Error(`Failed to obtain participant token: ${JSON.stringify(res.json)}`);
  }
  return res.json.data.token;
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  console.log(`QA target: ${BASE_URL}\n`);

  const organizerToken = await ensureOrganizerToken();
  const participantToken = await ensureParticipantToken();

  const categories = await api('GET', '/api/categories');
  const category = categories.json.data?.[0];
  if (!category) {
    throw new Error('No categories found — run `npm run seed:homepage` first.');
  }

  console.log('1. Create a draft event with 2 shows, each with 1 ticket tier');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA EM-25 Test Event',
    description: 'Created by schedule-management.qa.ts',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    capacity: 200,
    venue: { name: 'Nhà hát Hòa Bình', province: 'TP.HCM' },
    shows: [
      { startTime: daysFromNow(30), endTime: daysFromNow(30, 3), tickets: [{ ticketName: 'Standard', price: 300000, quantity: 100 }] },
      { startTime: daysFromNow(31), endTime: daysFromNow(31, 3), tickets: [{ ticketName: 'Standard', price: 300000, quantity: 100 }] },
    ],
  });
  check('Create returns 201', created.status === 201, created.json);
  const eventId = created.json.data?.event?._id;
  const shows: any[] = created.json.data?.event?.shows ?? [];
  check('Draft has 2 shows', shows.length === 2, shows);
  const [show1Id, show2Id] = shows.map((s) => s._id);

  console.log('2. GET schedule');
  const list = await api('GET', `/api/organizer/events/${eventId}/shows`, organizerToken);
  check('List shows returns 200', list.status === 200, list.json);
  check('Lists 2 shows', list.json.data?.length === 2, list.json);

  console.log('3. Authorization guards');
  const forbidden = await api('GET', `/api/organizer/events/${eventId}/shows`, participantToken);
  check('PARTICIPANT cannot view schedule (403)', forbidden.status === 403, forbidden.json);

  const forbiddenPut = await api('PUT', `/api/organizer/events/${eventId}/shows`, participantToken, {
    shows: [{ startTime: daysFromNow(10), endTime: daysFromNow(10, 2) }],
  });
  check('PARTICIPANT cannot configure schedule (403)', forbiddenPut.status === 403, forbiddenPut.json);

  console.log('4. Input validation');
  const empty = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, { shows: [] });
  check('Empty show list rejected (400)', empty.status === 400, empty.json);

  const badRange = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, {
    shows: [
      { _id: show1Id, startTime: daysFromNow(30), endTime: daysFromNow(30, 3) },
      { _id: show2Id, startTime: daysFromNow(31, 3), endTime: daysFromNow(31) },
    ],
  });
  check('endTime before startTime rejected (400)', badRange.status === 400, badRange.json);

  const pastStart = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, {
    shows: [
      { _id: show1Id, startTime: daysFromNow(-1), endTime: daysFromNow(-1, 3) },
      { _id: show2Id, startTime: daysFromNow(31), endTime: daysFromNow(31, 3) },
    ],
  });
  check('Past startTime rejected (400)', pastStart.status === 400, pastStart.json);

  console.log('5. Cannot remove a show that still has a ticket type attached');
  const dropShow2 = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, {
    shows: [{ _id: show1Id, startTime: daysFromNow(30), endTime: daysFromNow(30, 3) }],
  });
  check('Removing a show with tickets rejected (400)', dropShow2.status === 400, dropShow2.json);

  console.log('6. Retime both shows + add a 3rd show (no tickets yet, so it is a valid add)');
  const newShow1Start = daysFromNow(40);
  const configured = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, {
    shows: [
      { _id: show1Id, startTime: newShow1Start, endTime: daysFromNow(40, 4) },
      { _id: show2Id, startTime: daysFromNow(41), endTime: daysFromNow(41, 4) },
      { startTime: daysFromNow(42), endTime: daysFromNow(42, 4) },
    ],
  });
  check('Configure returns 200', configured.status === 200, configured.json);
  check('Result has 3 shows', configured.json.data?.length === 3, configured.json);

  const detailAfter = await api('GET', `/api/organizer/events/${eventId}`, organizerToken);
  check(
    'Event startDate/endDate re-derived from new show range',
    new Date(detailAfter.json.data?.event?.startDate).getTime() === new Date(newShow1Start).getTime(),
    detailAfter.json.data?.event
  );

  console.log('7. Submit for review, then schedule configuration is locked');
  const submit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submit returns 200', submit.status === 200, submit.json);

  const afterSubmit = await api('PUT', `/api/organizer/events/${eventId}/shows`, organizerToken, {
    shows: [{ startTime: daysFromNow(50), endTime: daysFromNow(50, 2) }],
  });
  check('Cannot configure schedule after submit (400)', afterSubmit.status === 400, afterSubmit.json);

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
