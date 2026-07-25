/**
 * Manual QA script for the organizer workspace endpoints (orders / check-in /
 * members / analytics / withdrawals / revenue reports).
 *
 * Exercises against a *running* backend (`npm run dev`). Self-contained:
 * registers its own ORGANIZER + PARTICIPANT, creates an event, buys tickets
 * for real through /registrations + confirm-payment, and seeds the two
 * flows that belong to other roles directly in MongoDB (CheckInLog — staff flow;
 * StaffAssignment — admin flow) so the organizer read endpoints have data.
 *
 *   npx tsx src/modules/organizer/organizer-workspace.qa.ts
 *
 * Requires: MongoDB reachable (same MONGODB_URI as the running server) and at
 * least one Category in the DB (`npm run seed:homepage` if none exist).
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';
import { User } from '../user/user.model';
import { Event } from '../event/event.model';
import { Ticket } from './ticket.model';
import { Registration } from '../registration/registration.model';
import { Payment } from '../registration/payment.model';
import { CheckInLog } from '../staff/checkin-log.model';
import { StaffAssignment } from '../staff/assignment.model';
import { Withdrawal } from './withdrawal.model';
import { RevenueReport } from './revenue-report.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.workspace@example.com';
const ORGANIZER_PASSWORD = 'QaOrganizer@123';
const STAFF_EMAIL = 'qa.staff.workspace@example.com';

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

/** For the report export endpoint — response body is a binary file, not JSON. */
async function binaryApi(
  path: string,
  token?: string
): Promise<{ status: number; contentType: string | null; byteLength: number }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const buf = await res.arrayBuffer();
  return { status: res.status, contentType: res.headers.get('content-type'), byteLength: buf.byteLength };
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
    fullName: 'QA Organizer Workspace',
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
    credential: 'mock_qa_participant_workspace',
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
  let staff = await User.findOne({ email: STAFF_EMAIL });
  if (!staff) {
    staff = await User.create({
      fullName: 'QA Staff Workspace',
      email: STAFF_EMAIL,
      role: 'STAFF',
      accountStatus: 'ACTIVE',
    });
  }

  const categories = await api('GET', '/api/categories');
  const category = categories.json.data?.[0];
  if (!category) throw new Error('No categories found — run `npm run seed:homepage` first.');

  console.log('1. Create a draft event (1 show, 1 tier: 300.000đ x100)');
  const created = await api('POST', '/api/organizer/events', organizerToken, {
    title: 'QA Workspace Test Event',
    description: 'Created by organizer-workspace.qa.ts',
    banner: 'https://example.com/banner.jpg',
    categoryId: category._id,
    capacity: 100,
    venue: { name: 'Nhà hát QA', province: 'TP.HCM' },
    shows: [
      {
        startTime: daysFromNow(30),
        endTime: daysFromNow(30, 3),
        tickets: [{ ticketName: 'Standard', price: 300000, quantity: 100 }],
      },
    ],
  });
  check('Create returns 201', created.status === 201, created.json);
  const eventId: string = created.json.data?.event?._id;
  const ticketId: string = created.json.data?.tickets?.[0]?._id;

  // Simulate the admin approval that the moderation flow would perform.
  await Event.updateOne(
    { _id: eventId },
    { $set: { reviewStatus: 'PUBLISHED', status: 'published' } }
  );

  console.log('2. Participant buys 2 tickets for real (hold → confirm-payment)');
  const reg = await api('POST', '/api/registrations', participantToken, {
    eventId,
    ticketId,
    quantity: 2,
  });
  check('Registration hold created (201)', reg.status === 201, reg.json);
  const registrationId: string = reg.json.data?._id;

  const pay = await api(
    'POST',
    `/api/registrations/${registrationId}/confirm-payment`,
    participantToken
  );
  check('Payment confirmed (200)', pay.status === 200, pay.json);

  console.log('3. Orders — GET /organizer/events/:id/registrations');
  const orders = await api(
    'GET',
    `/api/organizer/events/${eventId}/registrations`,
    organizerToken
  );
  check('List orders returns 200', orders.status === 200, orders.json);
  const orderRows: any[] = orders.json.data ?? [];
  check('Exactly 1 PAID order listed', orderRows.length === 1 && orderRows[0].status === 'PAID');
  check(
    'Order row carries buyer + ticket + amount (2 x 300k = 600k)',
    orderRows[0]?.quantity === 2 &&
      orderRows[0]?.totalAmount === 600000 &&
      orderRows[0]?.ticketName === 'Standard' &&
      typeof orderRows[0]?.participantName === 'string',
    orderRows[0]
  );
  check('Not checked-in yet', orderRows[0]?.checkedIn === false);

  const forbidden = await api(
    'GET',
    `/api/organizer/events/${eventId}/registrations`,
    participantToken
  );
  check('PARTICIPANT cannot list orders (403)', forbidden.status === 403, forbidden.json);

  console.log('4. Analytics — GET /organizer/events/:id/analytics');
  const analytics = await api(
    'GET',
    `/api/organizer/events/${eventId}/analytics`,
    organizerToken
  );
  check('Analytics returns 200', analytics.status === 200, analytics.json);
  const a = analytics.json.data ?? {};
  check(
    'Revenue 600k / 2 tickets / 1 paid order',
    a.totalRevenue === 600000 && a.soldTickets === 2 && a.paidOrders === 1,
    a
  );
  check('revenueByDay has 1 day with 600k', a.revenueByDay?.length === 1 && a.revenueByDay[0].revenue === 600000, a.revenueByDay);
  check(
    'salesByTicket shows Standard sold 2, revenue 600k',
    a.salesByTicket?.[0]?.sold === 2 && a.salesByTicket?.[0]?.revenue === 600000,
    a.salesByTicket
  );

  console.log('5. Check-in report — empty, then seed a staff CheckInLog (success)');
  const checkins0 = await api(
    'GET',
    `/api/organizer/events/${eventId}/checkins`,
    organizerToken
  );
  check('Check-in report returns 200', checkins0.status === 200, checkins0.json);
  const s0 = checkins0.json.data?.stats ?? {};
  check('Before: 2 paid tickets, 0 checked-in', s0.paidTickets === 2 && s0.checkedInTickets === 0, s0);

  // Staff check-in flow does not exist yet — seed the record it would write.
  const seededRegistration = await Registration.findByIdAndUpdate(
    registrationId,
    { $set: { checkedIn: true, checkedInAt: new Date() } },
    { new: true }
  );
  await CheckInLog.create({
    registrationId,
    eventId,
    staffId: staff._id,
    ticketCode: seededRegistration?.ticketCode ?? registrationId,
    result: 'success',
  });

  const checkins1 = await api(
    'GET',
    `/api/organizer/events/${eventId}/checkins`,
    organizerToken
  );
  const s1 = checkins1.json.data?.stats ?? {};
  check('After: 2/2 checked-in, rate 100%', s1.checkedInTickets === 2 && s1.rate === 100, s1);
  check(
    'byTicket Standard shows checkedIn 2/2',
    checkins1.json.data?.byTicket?.[0]?.checkedIn === 2,
    checkins1.json.data?.byTicket
  );

  console.log('5b. Per-show filter (?showId=) on orders / check-ins / analytics');
  const showId: string = created.json.data?.event?.shows?.[0]?._id;
  check('Created event carries its show _id', !!showId, created.json.data?.event?.shows);

  const ordersByShow = await api(
    'GET',
    `/api/organizer/events/${eventId}/registrations?showId=${showId}`,
    organizerToken
  );
  check(
    "Orders filtered to the sold show still list the order",
    ordersByShow.status === 200 && (ordersByShow.json.data ?? []).length === 1,
    ordersByShow.json
  );

  const checkinsByShow = await api(
    'GET',
    `/api/organizer/events/${eventId}/checkins?showId=${showId}`,
    organizerToken
  );
  const sShow = checkinsByShow.json.data?.stats ?? {};
  check(
    'Check-in report scoped to the show matches event-wide totals (single show)',
    sShow.paidTickets === 2 && sShow.checkedInTickets === 2,
    sShow
  );

  const analyticsByShow = await api(
    'GET',
    `/api/organizer/events/${eventId}/analytics?showId=${showId}`,
    organizerToken
  );
  const aShow = analyticsByShow.json.data ?? {};
  check(
    'Analytics scoped to the show keeps revenue 600k / 2 tickets',
    aShow.totalRevenue === 600000 && aShow.soldTickets === 2,
    aShow
  );

  // Add a second (empty) show, then confirm its scope reads as zero.
  const retimed = await api('PUT', `/api/organizer/events/${eventId}`, organizerToken, {
    shows: [
      { _id: showId, startTime: daysFromNow(30), endTime: daysFromNow(30, 3) },
      { title: 'Suất QA 2', startTime: daysFromNow(31), endTime: daysFromNow(31, 3) },
    ],
  });
  // PUT is rejected outside DRAFT/REJECTED — flip back, retry, then re-publish.
  let show2Id: string | undefined;
  if (retimed.status === 400) {
    await Event.updateOne({ _id: eventId }, { $set: { reviewStatus: 'DRAFT' } });
    const retry = await api('PUT', `/api/organizer/events/${eventId}`, organizerToken, {
      shows: [
        { _id: showId, startTime: daysFromNow(30), endTime: daysFromNow(30, 3) },
        { title: 'Suất QA 2', startTime: daysFromNow(31), endTime: daysFromNow(31, 3) },
      ],
    });
    check('Second show added after reverting to DRAFT', retry.status === 200, retry.json);
    show2Id = retry.json.data?.shows?.[1]?._id;
    await Event.updateOne(
      { _id: eventId },
      { $set: { reviewStatus: 'PUBLISHED', status: 'published' } }
    );
  } else {
    check('Second show added (200)', retimed.status === 200, retimed.json);
    show2Id = retimed.json.data?.shows?.[1]?._id;
  }

  if (show2Id) {
    const emptyShowCheckins = await api(
      'GET',
      `/api/organizer/events/${eventId}/checkins?showId=${show2Id}`,
      organizerToken
    );
    const sEmpty = emptyShowCheckins.json.data?.stats ?? {};
    check(
      'Empty show scope reads 0 paid / 0 checked-in',
      sEmpty.paidTickets === 0 && sEmpty.checkedInTickets === 0,
      sEmpty
    );
  }

  const bogusShow = await api(
    'GET',
    `/api/organizer/events/${eventId}/checkins?showId=64b000000000000000000000`,
    organizerToken
  );
  check('Unknown showId rejected (400)', bogusShow.status === 400, bogusShow.json);

  console.log('6. Members — empty, then seed an admin StaffAssignment');
  const members0 = await api('GET', `/api/organizer/events/${eventId}/members`, organizerToken);
  check('Members returns 200 + empty', members0.status === 200 && members0.json.data?.length === 0, members0.json);

  // Admin assignment flow does not exist yet — seed the doc it would write.
  await StaffAssignment.create({
    eventId,
    staffId: staff._id,
    gate: 'Cổng A',
    shift: '08:00 - 12:00',
    responsibility: 'Check-in',
    status: 'assigned',
  });

  const members1 = await api('GET', `/api/organizer/events/${eventId}/members`, organizerToken);
  const memberRows: any[] = members1.json.data ?? [];
  check(
    'Assigned staff appears with name/email/role',
    memberRows.length === 1 &&
      memberRows[0].staffName === 'QA Staff Workspace' &&
      memberRows[0].roleInEvent === 'Check-in',
    memberRows
  );

  console.log('7. Withdrawals — post-event rule, min amount, balance cap');
  const wd0 = await api('GET', `/api/organizer/events/${eventId}/withdrawals`, organizerToken);
  check('Overview returns 200', wd0.status === 200, wd0.json);
  const o0 = wd0.json.data ?? {};
  check(
    'Balance 600k, event not ended yet',
    o0.totalRevenue === 600000 && o0.availableBalance === 600000 && o0.eventEnded === false,
    o0
  );

  const early = await api('POST', `/api/organizer/events/${eventId}/withdrawals`, organizerToken, {
    amount: 500000,
    bankName: 'Vietcombank',
    accountNumber: '0071000123456',
    accountHolder: 'QA ORGANIZER',
  });
  check('Withdrawal before event ends rejected (400)', early.status === 400, early.json);

  // End the event so payout opens up (SRS: post-event settlement).
  await Event.updateOne(
    { _id: eventId },
    { $set: { endDate: daysFromNow(-1), date: daysFromNow(-2), startDate: daysFromNow(-2) } }
  );

  const tooSmall = await api('POST', `/api/organizer/events/${eventId}/withdrawals`, organizerToken, {
    amount: 400000,
    bankName: 'Vietcombank',
    accountNumber: '0071000123456',
    accountHolder: 'QA ORGANIZER',
  });
  check('Amount under 500k minimum rejected (400)', tooSmall.status === 400, tooSmall.json);

  const badAccount = await api('POST', `/api/organizer/events/${eventId}/withdrawals`, organizerToken, {
    amount: 500000,
    bankName: 'Vietcombank',
    accountNumber: 'ABC123',
    accountHolder: 'QA ORGANIZER',
  });
  check('Non-numeric account number rejected (400)', badAccount.status === 400, badAccount.json);

  const wdOk = await api('POST', `/api/organizer/events/${eventId}/withdrawals`, organizerToken, {
    amount: 500000,
    bankName: 'Vietcombank',
    accountNumber: '0071000123456',
    accountHolder: 'QA ORGANIZER',
  });
  check('Valid withdrawal accepted (201, PENDING)', wdOk.status === 201 && wdOk.json.data?.status === 'PENDING', wdOk.json);

  const wd1 = await api('GET', `/api/organizer/events/${eventId}/withdrawals`, organizerToken);
  const o1 = wd1.json.data ?? {};
  check(
    'Balance drops to 100k, history has 1 request',
    o1.availableBalance === 100000 && o1.history?.length === 1,
    o1
  );

  const overBalance = await api('POST', `/api/organizer/events/${eventId}/withdrawals`, organizerToken, {
    amount: 500000,
    bankName: 'Vietcombank',
    accountNumber: '0071000123456',
    accountHolder: 'QA ORGANIZER',
  });
  check('Amount over remaining balance rejected (400)', overBalance.status === 400, overBalance.json);

  console.log('8. Revenue reports — generate + breakdown + list');
  const report = await api('POST', '/api/organizer/reports', organizerToken, { eventId });
  check(
    'Report created with server-computed revenue 600k',
    report.status === 201 && report.json.data?.totalRevenue === 600000,
    report.json
  );
  const reportId: string = report.json.data?._id;
  const breakdown: any[] = report.json.data?.ticketBreakdown ?? [];
  check(
    'ticketBreakdown has Standard: sold 2, revenue 600k',
    breakdown.length === 1 && breakdown[0].ticketName === 'Standard' &&
      breakdown[0].sold === 2 && breakdown[0].revenue === 600000,
    breakdown
  );

  const reports = await api('GET', '/api/organizer/reports', organizerToken);
  check(
    'My reports lists ≥ 1 with event title joined',
    reports.status === 200 && reports.json.data?.length >= 1,
    reports.json
  );

  const forbiddenReport = await api('POST', '/api/organizer/reports', participantToken, { eventId });
  check('PARTICIPANT cannot generate reports (403)', forbiddenReport.status === 403, forbiddenReport.json);

  console.log('9. Report export — xlsx + pdf');
  const xlsx = await binaryApi(`/api/organizer/reports/${reportId}/export?format=xlsx`, organizerToken);
  check(
    'xlsx export 200, correct content-type, non-empty body',
    xlsx.status === 200 &&
      xlsx.contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      xlsx.byteLength > 1000,
    xlsx
  );

  const pdf = await binaryApi(`/api/organizer/reports/${reportId}/export?format=pdf`, organizerToken);
  check(
    'pdf export 200, correct content-type, non-empty body',
    pdf.status === 200 && pdf.contentType === 'application/pdf' && pdf.byteLength > 1000,
    pdf
  );

  const forbiddenExport = await binaryApi(`/api/organizer/reports/${reportId}/export?format=pdf`, participantToken);
  check('PARTICIPANT cannot export reports (403)', forbiddenExport.status === 403, forbiddenExport);

  console.log('10. Report delete — disposable report, ownership guard');
  const disposable = await api('POST', '/api/organizer/reports', organizerToken, {
    eventId,
    reportName: 'QA Delete Me',
  });
  const disposableId: string = disposable.json.data?._id;

  const forbiddenDelete = await api('DELETE', `/api/organizer/reports/${disposableId}`, participantToken);
  check('PARTICIPANT cannot delete reports (403)', forbiddenDelete.status === 403, forbiddenDelete.json);

  const deleted = await api('DELETE', `/api/organizer/reports/${disposableId}`, organizerToken);
  check('Delete disposable report returns 200', deleted.status === 200, deleted.json);

  const afterDelete = await api('GET', '/api/organizer/reports', organizerToken);
  const stillThere = (afterDelete.json.data ?? []).some((r: any) => r._id === disposableId);
  const originalStillThere = (afterDelete.json.data ?? []).some((r: any) => r._id === reportId);
  check('Deleted report no longer listed, original report untouched', !stillThere && originalStillThere, afterDelete.json);

  console.log('11. Bulk delete — selects several, leaves the rest untouched');
  const bulkA = await api('POST', '/api/organizer/reports', organizerToken, { eventId, reportName: 'QA Bulk A' });
  const bulkB = await api('POST', '/api/organizer/reports', organizerToken, { eventId, reportName: 'QA Bulk B' });
  const bulkC = await api('POST', '/api/organizer/reports', organizerToken, { eventId, reportName: 'QA Bulk C (kept)' });
  const idA: string = bulkA.json.data._id;
  const idB: string = bulkB.json.data._id;
  const idC: string = bulkC.json.data._id;

  const forbiddenBulk = await api('POST', '/api/organizer/reports/bulk-delete', participantToken, {
    ids: [idA, idB],
  });
  check('PARTICIPANT cannot bulk-delete (403)', forbiddenBulk.status === 403, forbiddenBulk.json);

  const foreignId = new mongoose.Types.ObjectId().toString();
  const bulk = await api('POST', '/api/organizer/reports/bulk-delete', organizerToken, {
    ids: [idA, idB, foreignId],
  });
  check(
    'Bulk delete returns 200, deletedCount 2 (foreign id silently skipped)',
    bulk.status === 200 && bulk.json.data?.deletedCount === 2,
    bulk.json
  );

  const afterBulk = await api('GET', '/api/organizer/reports?limit=100', organizerToken);
  const rows: any[] = afterBulk.json.data ?? [];
  const aGone = !rows.some((r) => r._id === idA);
  const bGone = !rows.some((r) => r._id === idB);
  const cKept = rows.some((r) => r._id === idC);
  check('A and B deleted, C (not selected) untouched', aGone && bGone && cKept, { aGone, bGone, cKept });

  console.log('\n12. Cleanup (event + child docs; QA users are kept for reruns)');
  const regIds = (await Registration.find({ eventId }).select('_id')).map((r) => r._id);
  await Promise.all([
    CheckInLog.deleteMany({ eventId }),
    Payment.deleteMany({ registrationId: { $in: regIds } }),
  ]);
  await Promise.all([
    Registration.deleteMany({ eventId }),
    Ticket.deleteMany({ eventId }),
    StaffAssignment.deleteMany({ eventId }),
    Withdrawal.deleteMany({ eventId }),
    RevenueReport.deleteMany({ eventId }),
  ]);
  await Event.deleteOne({ _id: eventId });
  console.log('  🧹 done');

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
