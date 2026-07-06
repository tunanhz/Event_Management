/**
 * Manual QA script for EM-128 "Ticket type configuration" (organizer module).
 *
 * Exercises the bulk `PUT /api/organizer/events/:id/tickets` endpoint against a
 * *running* backend (`npm run dev`). Self-contained: registers its own test
 * ORGANIZER account (reading the OTP straight from MongoDB, bypassing SMTP),
 * seeds nothing beyond an event draft, and cleans up after itself.
 *
 *   npx tsx src/modules/organizer/ticket-configuration.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';
import { Event } from '../event/event.model';
import { Ticket } from './ticket.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.em128@example.com';
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
    fullName: 'QA Organizer EM-128',
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
    credential: 'mock_qa_participant_em128',
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

  console.log('1. Create a draft event with one ticket type');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA EM-128 Test Event',
    description: 'Created by ticket-configuration.qa.ts',
    location: 'Nhà hát Hòa Bình, TP.HCM',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    capacity: 200,
    tickets: [{ ticketName: 'Standard', price: 300000, quantity: 100 }],
  });
  check('Create returns 201', created.status === 201, created.json);
  const eventId = created.json.data?.event?._id;
  const standardTicketId = created.json.data?.tickets?.[0]?._id;
  check('Draft has 1 ticket type', !!standardTicketId);

  console.log('2. Authorization guards');
  const forbidden = await api('PUT', `/api/organizer/events/${eventId}/tickets`, participantToken, {
    tickets: [{ ticketName: 'Hack', price: 0, quantity: 1 }],
  });
  check('PARTICIPANT cannot configure tickets (403)', forbidden.status === 403, forbidden.json);

  console.log('3. Input validation');
  const empty = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [],
  });
  check('Empty ticket list rejected (400)', empty.status === 400, empty.json);

  const badStatus = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [{ ticketName: 'Standard', price: 300000, quantity: 100, status: 'SOLD_OUT' }],
  });
  check('Client-set status=SOLD_OUT rejected (400)', badStatus.status === 400, badStatus.json);

  const unknownId = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [{ _id: '000000000000000000000000', ticketName: 'Ghost', price: 1, quantity: 1 }],
  });
  check('Unknown ticket _id rejected (400)', unknownId.status === 400, unknownId.json);

  console.log('4. Replace ticket set: keep+edit Standard, add VIP, add Early Bird');
  const configured = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [
      { _id: standardTicketId, ticketName: 'Standard', price: 350000, quantity: 120 },
      { ticketName: 'VIP', price: 900000, quantity: 30, status: 'HIDDEN' },
      { ticketName: 'Early Bird', price: 200000, quantity: 20 },
    ],
  });
  check('Configure returns 200', configured.status === 200, configured.json);
  check('Result has 3 ticket types', configured.json.data?.length === 3);
  const standard = configured.json.data?.find((t: any) => t._id === standardTicketId);
  check('Existing ticket updated in place (price/quantity)', standard?.price === 350000 && standard?.quantity === 120);
  const vip = configured.json.data?.find((t: any) => t.ticketName === 'VIP');
  check('New ticket created with requested status', vip?.status === 'HIDDEN');

  console.log('5. Replace ticket set again: drop Early Bird (no sales yet)');
  const dropped = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [
      { _id: standardTicketId, ticketName: 'Standard', price: 350000, quantity: 120 },
      { ticketName: 'VIP', price: 900000, quantity: 30 },
    ],
  });
  check('Configure (drop) returns 200', dropped.status === 200, dropped.json);
  check('Result has 2 ticket types after drop', dropped.json.data?.length === 2);
  check(
    'Dropped ticket type no longer listed',
    !dropped.json.data?.some((t: any) => t.ticketName === 'Early Bird')
  );

  console.log('6. Submit for review, then configuration is locked');
  const submit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submit returns 200', submit.status === 200, submit.json);

  const afterSubmit = await api('PUT', `/api/organizer/events/${eventId}/tickets`, organizerToken, {
    tickets: [{ ticketName: 'Late change', price: 1, quantity: 1 }],
  });
  check('Cannot configure tickets after submit (400)', afterSubmit.status === 400, afterSubmit.json);

  // Cleanup: remove the QA event + its tickets so the DB and the admin
  // moderation queue don't accumulate test data across runs.
  if (eventId) {
    await Ticket.deleteMany({ eventId });
    await Event.findByIdAndDelete(eventId);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
