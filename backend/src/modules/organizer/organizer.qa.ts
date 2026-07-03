/**
 * Manual QA script for EM-23 "Event Creation" (organizer module).
 *
 * Exercises the full HTTP flow against a *running* backend (`npm run dev`),
 * self-contained: registers its own test ORGANIZER account (reading the OTP
 * straight from MongoDB, bypassing SMTP), seeds nothing, and cleans up after
 * itself. No new test framework / dependency added — run with:
 *
 *   npx tsx src/modules/organizer/organizer.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.em23@example.com';
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

async function ensureOrganizerToken(): Promise<string> {
  // Already registered from a previous run? Just log in.
  const login = await api('POST', '/api/users/login', undefined, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
  });
  if (login.status === 200) return login.json.data.token;

  // Otherwise register: send OTP, read it straight from Mongo (works even
  // without SMTP configured, matching how OTP is persisted before email send).
  await api('POST', '/api/users/otp/send', undefined, { email: ORGANIZER_EMAIL });
  const otpDoc = await OTP.findOne({ email: ORGANIZER_EMAIL }).sort({ createdAt: -1 });
  if (!otpDoc) throw new Error('OTP not found in DB — is MongoDB reachable and MONGODB_URI correct?');

  const register = await api('POST', '/api/users/register', undefined, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
    fullName: 'QA Organizer EM-23',
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
    credential: 'mock_qa_participant_em23',
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

  const validEventPayload = {
    title: 'QA EM-23 Test Event',
    description: 'Created by organizer.qa.ts',
    location: 'Nhà hát Hòa Bình, TP.HCM',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    capacity: 200,
    tickets: [
      { ticketName: 'Standard', price: 300000, quantity: 100 },
      { ticketName: 'VIP', price: 800000, quantity: 50 },
    ],
  };

  console.log('1. Authorization guards');
  const forbidden = await api('POST', '/api/organizer/events', participantToken, validEventPayload);
  check('PARTICIPANT cannot create event (403)', forbidden.status === 403, forbidden.json);

  const unauthenticated = await api('POST', '/api/organizer/events', undefined, validEventPayload);
  check('No token cannot create event (401)', unauthenticated.status === 401, unauthenticated.json);

  console.log('2. Input validation');
  const missingFields = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'Missing stuff',
  });
  check('Missing required fields rejected (400)', missingFields.status === 400, missingFields.json);

  const noTickets = await api('POST', '/api/organizer/events', organizerToken, {
    ...validEventPayload,
    tickets: [],
  });
  check('Zero tickets rejected (400)', noTickets.status === 400, noTickets.json);

  const pastDate = await api('POST', '/api/organizer/events', organizerToken, {
    ...validEventPayload,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });
  check('Past startDate rejected (400)', pastDate.status === 400, pastDate.json);

  console.log('3. Happy path: create event + tickets');
  const created = await api('POST', '/api/organizer/events', organizerToken, validEventPayload);
  check('Create returns 201', created.status === 201, created.json);
  const eventId = created.json.data?.event?._id;
  check('Response includes event._id', !!eventId);
  check('Response includes 2 created tickets', created.json.data?.tickets?.length === 2);
  check('reviewStatus starts as DRAFT', created.json.data?.event?.reviewStatus === 'DRAFT');
  check(
    'Legacy fields mirrored (status=draft, maxAttendees=capacity)',
    created.json.data?.event?.status === 'draft' &&
      created.json.data?.event?.maxAttendees === validEventPayload.capacity
  );

  console.log('4. Listing & detail');
  const myEvents = await api('GET', '/api/organizer/events', organizerToken);
  check(
    'GET /organizer/events includes the created event',
    myEvents.json.data?.some((e: any) => e._id === eventId)
  );

  const detail = await api('GET', `/api/organizer/events/${eventId}`, organizerToken);
  check('GET detail returns 200', detail.status === 200, detail.json);
  check('GET detail includes 2 tickets', detail.json.data?.tickets?.length === 2);

  const otherOrgDetail = await api('GET', `/api/organizer/events/${eventId}`, participantToken);
  check('Non-owner cannot view event detail (403)', otherOrgDetail.status === 403);

  console.log('5. Add ticket while DRAFT');
  const addTicket = await api('POST', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    ticketName: 'Early Bird',
    price: 200000,
    quantity: 20,
  });
  check('Add ticket returns 201', addTicket.status === 201, addTicket.json);

  const ticketsAfterAdd = await api('GET', `/api/organizer/events/${eventId}/tickets`, organizerToken);
  check('Now has 3 tickets', ticketsAfterAdd.json.data?.length === 3);

  console.log('6. Submit for review');
  const submit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submit returns 200', submit.status === 200, submit.json);
  check('reviewStatus becomes PENDING_REVIEW', submit.json.data?.reviewStatus === 'PENDING_REVIEW');

  const resubmit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Re-submitting already-pending event rejected (400)', resubmit.status === 400, resubmit.json);

  const addTicketAfterSubmit = await api(
    'POST',
    `/api/organizer/events/${eventId}/tickets`,
    organizerToken,
    { ticketName: 'Late Ticket', price: 100000, quantity: 10 }
  );
  check(
    'Cannot add ticket after submit (400)',
    addTicketAfterSubmit.status === 400,
    addTicketAfterSubmit.json
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
