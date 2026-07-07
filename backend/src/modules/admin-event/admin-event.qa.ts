/**
 * Manual QA script for AM-01 "Admin Event Moderation" (admin-event module).
 *
 * Exercises the full create → submit → reject → fix & resubmit → approve →
 * public lifecycle against a *running* backend (`npm run dev`). Self-contained:
 * seeds its own QA ORGANIZER (OTP read straight from MongoDB) and QA ADMIN
 * (upserted via the User model — admins cannot self-register), and deletes the
 * event it created at the end. Run with:
 *
 *   npx tsx src/modules/admin-event/admin-event.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';
import { User } from '../user/user.model';
import { Event } from '../event/event.model';
import { Ticket } from '../organizer/ticket.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.am01@example.com';
const ORGANIZER_PASSWORD = 'QaOrganizer@123';
const ADMIN_EMAIL = 'qa.admin.am01@example.com';
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
  if (!otpDoc) throw new Error('OTP not found in DB — is MongoDB reachable?');

  const register = await api('POST', '/api/users/register', undefined, {
    email: ORGANIZER_EMAIL,
    password: ORGANIZER_PASSWORD,
    fullName: 'QA Organizer AM-01',
    otpCode: otpDoc.otp,
    role: 'ORGANIZER',
  });
  if (register.status !== 201) {
    throw new Error(`Failed to register QA organizer: ${JSON.stringify(register.json)}`);
  }
  return register.json.data.token;
}

/** Admins cannot self-register — upsert one directly like scripts/create-admin.ts. */
async function ensureAdminToken(): Promise<{ token: string; adminId: string }> {
  let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');
  if (!admin) {
    admin = new User({
      fullName: 'QA Admin AM-01',
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
  return { token: login.json.data.token, adminId: String(admin._id) };
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  console.log(`QA target: ${BASE_URL}\n`);

  const organizerToken = await ensureOrganizerToken();
  const { token: adminToken, adminId } = await ensureAdminToken();

  const categories = await api('GET', '/api/categories');
  const category = categories.json.data?.[0];
  if (!category) throw new Error('No categories found — run `npm run seed:homepage` first.');

  console.log('1. Create draft + submit (organizer)');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA AM-01 Moderation Event',
    description: 'Created by admin-event.qa.ts',
    location: 'Cung Văn hóa Hữu nghị, Hà Nội',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString(),
    capacity: 100,
    tickets: [{ ticketName: 'Standard', price: 150000, quantity: 50 }],
    // Organizer-private fields — must never surface on public endpoints.
    paymentInfo: { bankName: 'VCB', accountNumber: '0123456789', accountHolder: 'QA ORG' },
    contract: { repName: 'QA Rep', agreed: true, signatureUrl: '/uploads/signatures/qa-sig.png' },
  });
  const eventId = created.json.data?.event?._id;
  check('Draft created (201)', created.status === 201 && !!eventId, created.json);

  const submitted = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Submitted → PENDING_REVIEW', submitted.json.data?.reviewStatus === 'PENDING_REVIEW');

  console.log('2. Authorization guards on /api/admin/events');
  const asOrganizer = await api('GET', '/api/admin/events', organizerToken);
  check('ORGANIZER blocked (403)', asOrganizer.status === 403, asOrganizer.json);
  const noToken = await api('GET', '/api/admin/events');
  check('No token blocked (401)', noToken.status === 401, noToken.json);

  console.log('3. Review queue list + response format');
  const queue = await api('GET', '/api/admin/events?reviewStatus=PENDING_REVIEW', adminToken);
  check('Queue returns 200', queue.status === 200, queue.json);
  check(
    'Response follows {success, message, data} format',
    queue.json.success === true && typeof queue.json.message === 'string' && Array.isArray(queue.json.data)
  );
  check('Pagination meta present', !!queue.json.meta?.currentPage);
  check(
    'Queue contains the submitted event',
    queue.json.data?.some((e: any) => e._id === eventId)
  );

  const badFilter = await api('GET', '/api/admin/events?reviewStatus=NOT_A_STATUS', adminToken);
  check('Invalid reviewStatus filter rejected (400)', badFilter.status === 400, badFilter.json);

  console.log('4. Admin detail');
  const detail = await api('GET', `/api/admin/events/${eventId}`, adminToken);
  check('Detail returns 200 with event + tickets', detail.status === 200 && detail.json.data?.tickets?.length === 1, detail.json);
  const missing = await api('GET', '/api/admin/events/000000000000000000000000', adminToken);
  check('Unknown id returns 404', missing.status === 404, missing.json);

  console.log('5. Reject (requires reason)');
  const rejectNoReason = await api('POST', `/api/admin/events/${eventId}/reject`, adminToken, {});
  check('Reject without reason rejected (400)', rejectNoReason.status === 400, rejectNoReason.json);

  const rejected = await api('POST', `/api/admin/events/${eventId}/reject`, adminToken, {
    reason: 'Thiếu giấy phép địa điểm — vui lòng bổ sung và gửi lại',
  });
  check('Reject returns 200 → REJECTED', rejected.status === 200 && rejected.json.data?.reviewStatus === 'REJECTED', rejected.json);
  check('rejectionReason persisted', rejected.json.data?.rejectionReason?.includes('giấy phép'));
  check('reviewedAt recorded', !!rejected.json.data?.reviewedAt);

  const rejectAgain = await api('POST', `/api/admin/events/${eventId}/reject`, adminToken, {
    reason: 'double reject',
  });
  check('Second decision blocked (409, AM-01 concurrency)', rejectAgain.status === 409, rejectAgain.json);

  console.log('6. Organizer fixes & resubmits (REJECTED editable)');
  const editRejected = await api('PUT', `/api/organizer/events/${eventId}`, organizerToken, {
    title: 'QA AM-01 Moderation Event (đã bổ sung giấy phép)',
  });
  check('REJECTED event editable by organizer (200)', editRejected.status === 200, editRejected.json);

  const resubmit = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Resubmit → PENDING_REVIEW', resubmit.status === 200 && resubmit.json.data?.reviewStatus === 'PENDING_REVIEW', resubmit.json);
  check('rejectionReason cleared on resubmit', resubmit.json.data?.rejectionReason === undefined);

  console.log('7. Approve & publish');
  const approved = await api('POST', `/api/admin/events/${eventId}/approve`, adminToken);
  check('Approve returns 200 → PUBLISHED', approved.status === 200 && approved.json.data?.reviewStatus === 'PUBLISHED', approved.json);
  check('approvedById = deciding admin', approved.json.data?.approvedById === adminId);
  check('Legacy status flipped to published', approved.json.data?.status === 'published');

  const approveAgain = await api('POST', `/api/admin/events/${eventId}/approve`, adminToken);
  check('Second approve blocked (409)', approveAgain.status === 409, approveAgain.json);

  const submitPublished = await api('POST', `/api/organizer/events/${eventId}/submit`, organizerToken);
  check('Organizer cannot resubmit a PUBLISHED event (400)', submitPublished.status === 400, submitPublished.json);

  console.log('8. Published event is publicly visible');
  const publicDetail = await api('GET', `/api/events/${eventId}/detail`);
  check('GET /api/events/:id/detail returns 200 without auth', publicDetail.status === 200, publicDetail.json);

  const publicBody = JSON.stringify(publicDetail.json);
  check(
    'Public detail hides paymentInfo/contract/permitDocuments',
    !publicBody.includes('accountNumber') &&
      !publicBody.includes('paymentInfo') &&
      !publicBody.includes('permitDocuments') &&
      !publicBody.includes('"contract"')
  );

  // Cleanup: remove the QA event + its tickets so reruns stay deterministic.
  await Ticket.deleteMany({ eventId });
  await Event.findByIdAndDelete(eventId);

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
