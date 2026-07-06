/**
 * Manual QA script for EM-136 "Permit submission" (organizer module, EM-28 epic).
 *
 * Exercises the dedicated `GET/PUT /api/organizer/events/:id/permits` endpoints
 * against a *running* backend (`npm run dev`). Self-contained: registers its
 * own test ORGANIZER account (reading the OTP straight from MongoDB, bypassing
 * SMTP), creates its own event, and cleans up after itself.
 *
 *   npx tsx src/modules/organizer/permit-submission.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.em136@example.com';
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
    fullName: 'QA Organizer EM-136',
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
    credential: 'mock_qa_participant_em136',
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

  console.log('1. Create a draft event with no permit documents yet');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA EM-136 Test Event',
    description: 'Created by permit-submission.qa.ts',
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
  check('Draft starts with no permit documents', (created.json.data?.event?.permitDocuments ?? []).length === 0);

  console.log('2. GET permits (empty)');
  const list0 = await api('GET', `/api/organizer/events/${eventId}/permits`, organizerToken);
  check('List permits returns 200', list0.status === 200, list0.json);
  check('Starts empty', Array.isArray(list0.json.data) && list0.json.data.length === 0, list0.json);

  console.log('3. Authorization guards');
  const forbiddenGet = await api('GET', `/api/organizer/events/${eventId}/permits`, participantToken);
  check('PARTICIPANT cannot view permits (403)', forbiddenGet.status === 403, forbiddenGet.json);

  const forbiddenPut = await api('PUT', `/api/organizer/events/${eventId}/permits`, participantToken, {
    permitDocuments: [{ name: 'x.pdf', url: '/uploads/permits/x.pdf' }],
  });
  check('PARTICIPANT cannot configure permits (403)', forbiddenPut.status === 403, forbiddenPut.json);

  console.log('4. Input validation');
  const badExt = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ name: 'virus.exe', url: '/uploads/permits/virus.exe' }],
  });
  check('Non PDF/DOCX/PNG extension rejected (400)', badExt.status === 400, badExt.json);

  const badUrl = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ name: 'giay-phep.pdf', url: 'https://evil.example.com/giay-phep.pdf' }],
  });
  check('URL outside /uploads/permits/ rejected (400)', badUrl.status === 400, badUrl.json);

  const missingName = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ url: '/uploads/permits/no-name.pdf' }],
  });
  check('Missing name rejected (400)', missingName.status === 400, missingName.json);

  const tooLarge = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ name: 'giay-phep.pdf', url: '/uploads/permits/giay-phep.pdf', sizeKb: 20 * 1024 }],
  });
  check('sizeKb over 15MB rejected (400)', tooLarge.status === 400, tooLarge.json);

  console.log('5. Submit 2 valid permit documents');
  const configured = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [
      { name: 'giay-phep-to-chuc.pdf', url: '/uploads/permits/giay-phep-to-chuc.pdf', sizeKb: 512 },
      { name: 'giay-phep-am-thanh.docx', url: '/uploads/permits/giay-phep-am-thanh.docx', sizeKb: 256 },
    ],
  });
  check('Configure returns 200', configured.status === 200, configured.json);
  check('Result has 2 documents', configured.json.data?.length === 2, configured.json);

  const list1 = await api('GET', `/api/organizer/events/${eventId}/permits`, organizerToken);
  check('GET reflects the 2 saved documents', list1.json.data?.length === 2, list1.json);

  console.log('6. Replace with empty list (permits are optional — clears the set)');
  const cleared = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [],
  });
  check('Clearing to empty list returns 200', cleared.status === 200, cleared.json);
  check('Result is empty', cleared.json.data?.length === 0, cleared.json);

  console.log('7. Re-submit 1 document, then submit event for review — configuration locks');
  const resubmitDocs = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ name: 'giay-phep-to-chuc.pdf', url: '/uploads/permits/giay-phep-to-chuc.pdf' }],
  });
  check('Re-submit 1 doc returns 200', resubmitDocs.status === 200 && resubmitDocs.json.data?.length === 1, resubmitDocs.json);

  const submit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submit returns 200', submit.status === 200, submit.json);

  const afterSubmit = await api('PUT', `/api/organizer/events/${eventId}/permits`, organizerToken, {
    permitDocuments: [{ name: 'late.pdf', url: '/uploads/permits/late.pdf' }],
  });
  check('Cannot configure permits after submit (400)', afterSubmit.status === 400, afterSubmit.json);

  const listAfterSubmit = await api('GET', `/api/organizer/events/${eventId}/permits`, organizerToken);
  check(
    'GET still readable after submit (read-only, not locked)',
    listAfterSubmit.status === 200 && listAfterSubmit.json.data?.length === 1,
    listAfterSubmit.json
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
