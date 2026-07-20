/**
 * Manual QA for Admin Ticket Administration.
 *
 * Run against a running backend:
 *   npx tsx src/modules/admin-ticket/admin-ticket.qa.ts
 */
import mongoose from 'mongoose';
import { config } from '../../config';
import { User } from '../user/user.model';
import { Event } from '../event/event.model';
import { Ticket } from '../organizer/ticket.model';

const BASE_URL = process.env.QA_BASE_URL || `http://localhost:${config.port}`;
const ADMIN_EMAIL = 'qa.admin.tickets@example.com';
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

async function ensureAdminToken(): Promise<string> {
  let admin = await User.findOne({ email: ADMIN_EMAIL }).select('+passwordHash');
  if (!admin) {
    admin = new User({
      fullName: 'QA Admin Tickets',
      email: ADMIN_EMAIL,
      passwordHash: ADMIN_PASSWORD,
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

  const adminToken = await ensureAdminToken();
  const event = await Event.create({
    title: 'QA Ticket Administration Event',
    description: 'Created by admin-ticket.qa.ts',
    date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    startDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
    location: 'QA Hall',
    maxAttendees: 100,
    capacity: 100,
    organizer: 'QA Organizer',
    category: 'QA',
    categorySlug: 'qa',
    status: 'published',
    reviewStatus: 'PUBLISHED',
    priceFrom: 100000,
    isFree: false,
  });

  const soldTicket = await Ticket.create({
    eventId: event._id,
    ticketName: 'QA Sold Ticket',
    price: 100000,
    quantity: 10,
    soldQuantity: 3,
    minPerOrder: 1,
    maxPerOrder: 5,
    status: 'ACTIVE',
  });
  const emptyTicket = await Ticket.create({
    eventId: event._id,
    ticketName: 'QA Empty Ticket',
    price: 200000,
    quantity: 20,
    soldQuantity: 0,
    minPerOrder: 1,
    maxPerOrder: 10,
    status: 'ACTIVE',
  });

  console.log('1. Admin list');
  const list = await api('GET', `/api/admin/tickets?eventId=${event._id}`, adminToken);
  check('List returns 200', list.status === 200, list.json);
  check('List contains 2 tickets', list.json.data?.length === 2, list.json);

  console.log('2. Admin read-only detail');
  const detail = await api('GET', `/api/admin/tickets/${soldTicket._id}`, adminToken);
  check('Detail returns 200', detail.status === 200, detail.json);

  console.log('3. Admin mutation routes are not exposed');
  const update = await api('PUT', `/api/admin/tickets/${soldTicket._id}`, adminToken, {
    quantity: 2,
  });
  check('Admin cannot edit ticket configuration', update.status === 404, update.json);

  const statusOverride = await api('PATCH', `/api/admin/tickets/${soldTicket._id}/status`, adminToken, {
    status: 'HIDDEN',
  });
  check('Admin cannot override ticket status', statusOverride.status === 404, statusOverride.json);

  const remove = await api('DELETE', `/api/admin/tickets/${emptyTicket._id}`, adminToken);
  check('Admin cannot delete organizer ticket', remove.status === 404, remove.json);

  await Ticket.deleteMany({ eventId: event._id });
  await Event.findByIdAndDelete(event._id);

  console.log(`\n${passed} passed, ${failed} failed`);
  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('QA script crashed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
