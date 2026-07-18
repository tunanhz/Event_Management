/**
 * Manual QA script for the full 6-step create-event wizard payload
 * (organizer module): shows with per-show ticket tiers, venue, org info,
 * settings (slug/privacy), logistics + permit docs, contract, payment info,
 * and the permit file upload endpoint.
 *
 * Runs against a *running* backend (`npm run dev`). Self-contained: reuses the
 * QA organizer convention (OTP read from MongoDB), cleans up created events.
 *
 *   npx tsx src/modules/organizer/event-wizard-full.qa.ts
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { OTP } from '../user/otp.model';
import { Event } from '../event/event.model';
import { Ticket } from './ticket.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ORGANIZER_EMAIL = 'qa.organizer.wizard@example.com';
const ORGANIZER_PASSWORD = 'QaOrganizer@123';

let passed = 0;
let failed = 0;
const createdEventIds: string[] = [];

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
    fullName: 'QA Organizer Wizard',
    otpCode: otpDoc.otp,
    role: 'ORGANIZER',
  });
  if (register.status !== 201) {
    throw new Error(`Failed to register QA organizer: ${JSON.stringify(register.json)}`);
  }
  return register.json.data.token;
}

function daysFromNow(days: number, hours = 0): string {
  return new Date(Date.now() + (days * 24 + hours) * 60 * 60 * 1000).toISOString();
}

function fullWizardPayload(categoryId: string, slug: string, signatureUrl?: string) {
  return {
    // Step 1
    title: 'QA Wizard Full Event',
    description: '<p><strong>Giới thiệu sự kiện</strong> đầy đủ 6 bước</p>',
    categoryId,
    capacity: 500,
    banner: 'https://example.com/banner.jpg',
    posterImage: 'https://example.com/poster.jpg',
    locationType: 'offline',
    venue: {
      name: 'Nhà hát Hòa Bình',
      province: 'TP. Hồ Chí Minh',
      ward: 'Phường Bến Nghé',
      street: '240 Đường 3/2',
    },
    orgName: 'QA Entertainment',
    orgLogo: 'https://example.com/logo.png',
    orgInfo: 'Đơn vị tổ chức sự kiện QA',
    // Step 2 — two shows, each with its own tiers
    shows: [
      {
        startTime: daysFromNow(30),
        endTime: daysFromNow(30, 4),
        tickets: [
          { ticketName: 'VIP', price: 800000, quantity: 100, minPerOrder: 1, maxPerOrder: 4, description: 'Hàng đầu' },
          { ticketName: 'Standard', price: 300000, quantity: 300, minPerOrder: 1, maxPerOrder: 10 },
        ],
      },
      {
        startTime: daysFromNow(31),
        endTime: daysFromNow(31, 4),
        tickets: [{ ticketName: 'Standard N2', price: 250000, quantity: 200 }],
      },
    ],
    // Step 3
    slug,
    privacy: 'private',
    confirmationMessage: 'Hẹn gặp bạn tại sự kiện!',
    // Step 4
    logisticsServices: ['audio-lighting', 'checkin-staff'],
    permitDocuments: [{ name: 'giay-phep-to-chuc.pdf', url: '/uploads/permits/qa.pdf', sizeKb: 1024 }],
    // Step 5 — signing implies agreeing (BE rejects agreed without signature)
    contract: {
      repName: 'Nguyễn Văn QA',
      agreed: true,
      signatureUrl: signatureUrl ?? '/uploads/signatures/qa-fallback.png',
    },
    // Step 6
    paymentInfo: { bankName: 'VCB', accountNumber: '0123456789', accountHolder: 'NGUYEN VAN QA' },
  };
}

async function main() {
  await mongoose.connect(config.mongodbUri);
  console.log(`QA target: ${BASE_URL}\n`);

  const token = await ensureOrganizerToken();
  const categories = await api('GET', '/api/categories');
  const category = categories.json.data?.[0];
  if (!category) throw new Error('No categories found — run `npm run seed:homepage` first.');

  const slug = `qa-wizard-${Date.now()}`;

  // Hand-drawn signature stand-in: 1x1 transparent PNG, uploaded first so the
  // contract payload can reference a real stored file.
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64'
  );
  const sigForm = new FormData();
  sigForm.append('file', new Blob([pngBytes], { type: 'image/png' }), 'chu-ky.png');
  const sigRes = await fetch(`${BASE_URL}/api/uploads/signatures`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: sigForm,
  });
  const sigJson: any = await sigRes.json().catch(() => ({}));
  const sigUrl: string | undefined = sigJson.data?.url;
  check('Signature PNG upload returns 201 + /uploads/signatures url',
    sigRes.status === 201 && !!sigUrl?.startsWith('/uploads/signatures/'), sigJson);

  console.log('1. Create with full 6-step payload');
  const created = await api('POST', '/api/organizer/events', token, fullWizardPayload(category._id, slug, sigUrl));
  const ev = created.json.data?.event;
  const eventId = ev?._id;
  if (eventId) createdEventIds.push(eventId);
  check('Create returns 201', created.status === 201, created.json);
  check('2 shows persisted with _id', ev?.shows?.length === 2 && !!ev.shows[0]._id);
  check('startDate/endDate derived from shows (min/max)',
    new Date(ev?.startDate).getTime() === new Date(ev?.shows?.[0]?.startTime).getTime() &&
    new Date(ev?.endDate).getTime() === new Date(ev?.shows?.[1]?.endTime).getTime());
  check('Venue + composed location saved',
    ev?.venue?.province === 'TP. Hồ Chí Minh' && String(ev?.location).includes('Nhà hát Hòa Bình'));
  check('posterImage + locationType saved', ev?.posterImage?.includes('poster') && ev?.locationType === 'offline');
  check('Org info mapped (organizer/logo/description)',
    ev?.organizer === 'QA Entertainment' && !!ev?.organizerLogoUrl && !!ev?.organizerDescription);
  check('Settings saved (slug/privacy/confirmation)',
    ev?.slug === slug && ev?.privacy === 'private' && !!ev?.confirmationMessage);
  check('Logistics + permit docs saved',
    ev?.logisticsServices?.length === 2 && ev?.permitDocuments?.[0]?.name?.endsWith('.pdf'));
  check('Contract agreed + agreedAt stamped', ev?.contract?.agreed === true && !!ev?.contract?.agreedAt);
  check('Contract signature persisted (url + signedAt)',
    ev?.contract?.signatureUrl === sigUrl && !!ev?.contract?.signedAt);
  check('signatureHash is SHA-256 hex', /^[0-9a-f]{64}$/.test(String(ev?.contract?.signatureHash)));
  check('paymentInfo saved', ev?.paymentInfo?.bankName === 'VCB');

  const tickets = created.json.data?.tickets;
  check('3 tiers created across shows', tickets?.length === 3);
  const show1Id = String(ev?.shows?.[0]?._id);
  const show2Id = String(ev?.shows?.[1]?._id);
  check('Tiers attached to correct shows',
    tickets?.filter((t: any) => String(t.showId) === show1Id).length === 2 &&
    tickets?.filter((t: any) => String(t.showId) === show2Id).length === 1);
  check('minPerOrder/maxPerOrder persisted (VIP 1..4)',
    tickets?.some((t: any) => t.ticketName === 'VIP' && t.minPerOrder === 1 && t.maxPerOrder === 4));

  console.log('2. Wizard validation');
  const dupSlug = await api('POST', '/api/organizer/events', token, fullWizardPayload(category._id, slug));
  if (dupSlug.json?.data?.event?._id) createdEventIds.push(dupSlug.json.data.event._id);
  check('Duplicate slug rejected (400)', dupSlug.status === 400, dupSlug.json);

  const badSlug = await api('POST', '/api/organizer/events', token,
    { ...fullWizardPayload(category._id, 'ok-slug-x'), slug: 'Sai Slug!!' });
  check('Invalid slug format rejected (400)', badSlug.status === 400, badSlug.json);

  const badMinMax = { ...fullWizardPayload(category._id, `qa-mm-${Date.now()}`) };
  badMinMax.shows[0].tickets[0] = { ...badMinMax.shows[0].tickets[0], minPerOrder: 5, maxPerOrder: 2 };
  const badMinMaxRes = await api('POST', '/api/organizer/events', token, badMinMax);
  check('maxPerOrder < minPerOrder rejected (400)', badMinMaxRes.status === 400, badMinMaxRes.json);

  const badPermit = { ...fullWizardPayload(category._id, `qa-doc-${Date.now()}`) };
  badPermit.permitDocuments = [{ name: 'virus.exe', url: '/uploads/x.exe', sizeKb: 10 }];
  const badPermitRes = await api('POST', '/api/organizer/events', token, badPermit);
  check('Non PDF/DOCX/PNG permit doc rejected (400)', badPermitRes.status === 400, badPermitRes.json);

  const unsignedAgree = { ...fullWizardPayload(category._id, `qa-us-${Date.now()}`, sigUrl) };
  unsignedAgree.contract = { repName: 'Không ký', agreed: true } as any;
  const unsignedRes = await api('POST', '/api/organizer/events', token, unsignedAgree);
  check('Agreed contract without signature rejected (400)', unsignedRes.status === 400, unsignedRes.json);

  const noTicketShows = { ...fullWizardPayload(category._id, `qa-nt-${Date.now()}`, sigUrl) };
  noTicketShows.shows = [{ startTime: daysFromNow(10), endTime: daysFromNow(10, 2), tickets: [] }];
  const noTicketRes = await api('POST', '/api/organizer/events', token, noTicketShows);
  check('Shows without any ticket rejected (400)', noTicketRes.status === 400, noTicketRes.json);

  console.log('3. Update: settings + show replacement rules');
  const createdSignatureHash = ev?.contract?.signatureHash;
  const upd = await api('PUT', `/api/organizer/events/${eventId}`, token, {
    privacy: 'public',
    confirmationMessage: 'Cập nhật lời xác nhận',
    logisticsServices: ['permit-support'],
    // Same accepted signature resubmitted — acceptance stamps must not change.
    contract: { repName: 'Nguyễn Văn QA', agreed: true, signatureUrl: sigUrl },
  });
  check('Update settings returns 200', upd.status === 200, upd.json);
  check('privacy + logistics updated', upd.json.data?.privacy === 'public' && upd.json.data?.logisticsServices?.[0] === 'permit-support');
  check('Unchanged signature keeps original signatureHash (no re-stamp)',
    upd.json.data?.contract?.signatureHash === createdSignatureHash);

  // Dropping show 2 while its tier still exists must be blocked.
  const dropShow2 = await api('PUT', `/api/organizer/events/${eventId}`, token, {
    shows: [{ _id: show1Id, startTime: daysFromNow(30), endTime: daysFromNow(30, 5) }],
  });
  check('Removing a show that still has tiers rejected (400)', dropShow2.status === 400, dropShow2.json);

  // Retime both shows (keep both) is allowed.
  const retime = await api('PUT', `/api/organizer/events/${eventId}`, token, {
    shows: [
      { _id: show1Id, startTime: daysFromNow(40), endTime: daysFromNow(40, 4) },
      { _id: show2Id, startTime: daysFromNow(41), endTime: daysFromNow(41, 4) },
    ],
  });
  const retimedStart = new Date(retime.json.data?.startDate).getTime();
  const expectedStart = new Date(daysFromNow(40)).getTime();
  check(
    'Retiming shows returns 200 + dates re-derived',
    retime.status === 200 && Math.abs(retimedStart - expectedStart) < 60_000,
    retime.json
  );

  console.log('4. Ticket ops with showId');
  const addNoShow = await api('POST', `/api/organizer/events/${eventId}/tickets`, token, {
    ticketName: 'Missing show', price: 100000, quantity: 10,
  });
  check('Add tier without showId on multi-show event rejected (400)', addNoShow.status === 400, addNoShow.json);

  const addOk = await api('POST', `/api/organizer/events/${eventId}/tickets`, token, {
    ticketName: 'Early Bird N2', price: 200000, quantity: 50, showId: show2Id, minPerOrder: 2, maxPerOrder: 6,
  });
  check('Add tier with valid showId returns 201', addOk.status === 201, addOk.json);
  check('New tier carries showId + min/max', String(addOk.json.data?.showId) === show2Id && addOk.json.data?.minPerOrder === 2);

  const addBadShow = await api('POST', `/api/organizer/events/${eventId}/tickets`, token, {
    ticketName: 'Ghost show', price: 1000, quantity: 5, showId: '000000000000000000000000',
  });
  check('Add tier with foreign showId rejected (400)', addBadShow.status === 400, addBadShow.json);

  console.log('5. Legacy flat payload still works (backward compat)');
  const legacy = await api('POST', '/api/organizer/events', token, {
    title: 'QA Legacy Flat Event',
    description: 'Legacy shape',
    location: 'Sân vận động Mỹ Đình, Hà Nội',
    banner: 'https://example.com/banner2.jpg',
    categoryId: category._id,
    startDate: daysFromNow(20),
    endDate: daysFromNow(21),
    capacity: 100,
    tickets: [{ ticketName: 'GA', price: 100000, quantity: 100 }],
  });
  const legacyId = legacy.json.data?.event?._id;
  if (legacyId) createdEventIds.push(legacyId);
  check('Legacy create returns 201', legacy.status === 201, legacy.json);
  check('Legacy event has no shows; tier has no showId',
    legacy.json.data?.event?.shows?.length === 0 && !legacy.json.data?.tickets?.[0]?.showId);

  console.log('6. Upload endpoints (permits + images)');
  const imgForm = new FormData();
  imgForm.append('file', new Blob([pngBytes], { type: 'image/png' }), 'poster.png');
  const imgRes = await fetch(`${BASE_URL}/api/uploads/images`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: imgForm,
  });
  const imgJson: any = await imgRes.json().catch(() => ({}));
  check('Image upload returns 201 + /uploads/images url',
    imgRes.status === 201 && !!imgJson.data?.url?.startsWith('/uploads/images/'), imgJson);

  const form = new FormData();
  form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'giay-phep.png');
  const uploadRes = await fetch(`${BASE_URL}/api/uploads/permits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploadJson: any = await uploadRes.json().catch(() => ({}));
  check('PNG upload returns 201 + url', uploadRes.status === 201 && uploadJson.data?.url?.startsWith('/uploads/permits/'), uploadJson);
  check('Upload response format {success,message,data}', uploadJson.success === true && typeof uploadJson.message === 'string');

  if (uploadJson.data?.url) {
    const fileRes = await fetch(`${BASE_URL}${uploadJson.data.url}`);
    check('Uploaded file publicly fetchable (200)', fileRes.status === 200);
  }

  const badForm = new FormData();
  badForm.append('file', new Blob([Buffer.from('MZ...')], { type: 'application/octet-stream' }), 'evil.exe');
  const badUpload = await fetch(`${BASE_URL}/api/uploads/permits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: badForm,
  });
  check('EXE upload rejected (400)', badUpload.status === 400);

  const noAuthUpload = await fetch(`${BASE_URL}/api/uploads/permits`, { method: 'POST', body: form });
  check('Upload without token rejected (401)', noAuthUpload.status === 401);

  // Cleanup QA events + tiers
  for (const id of createdEventIds) {
    await Ticket.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);
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
