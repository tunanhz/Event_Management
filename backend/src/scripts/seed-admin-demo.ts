import mongoose from 'mongoose';
import { config } from '../config';
import { User } from '../modules/user/user.model';
import { Category } from '../modules/category/category.model';
import { Event, IEvent } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';
import { TICKET_SALE_END_LEAD_MS } from '../modules/organizer/event-wizard-validation';
import { Registration } from '../modules/registration/registration.model';
import { Payment } from '../modules/registration/payment.model';

const ADMIN = {
  fullName: 'EventBox Demo Admin',
  email: 'admin@eventbox.vn',
  password: 'Admin@123456',
  phone: '0900000001',
  role: 'ADMIN' as const,
};

const ORGANIZER = {
  fullName: 'EventBox Demo Organizer',
  email: 'organizer@eventbox.vn',
  password: 'Organizer@123',
  phone: '0900000002',
  role: 'ORGANIZER' as const,
};

const PARTICIPANT = {
  fullName: 'EventBox Demo Participant',
  email: 'participant@eventbox.vn',
  password: 'Participant@123',
  phone: '0900000003',
  role: 'PARTICIPANT' as const,
};

const CATEGORIES = [
  { name: 'Music', slug: 'music', icon: 'music', order: 1 },
  { name: 'Conference', slug: 'conference', icon: 'presentation', order: 2 },
  { name: 'Sport', slug: 'sport', icon: 'trophy', order: 3 },
  { name: 'Workshop', slug: 'workshop', icon: 'briefcase', order: 4 },
];

const dayMs = 24 * 60 * 60 * 1000;
const now = () => Date.now();
const future = (days: number, hour = 19) => {
  const date = new Date(now() + days * dayMs);
  date.setHours(hour, 0, 0, 0);
  return date;
};
const past = (days: number, hour = 19) => {
  const date = new Date(now() - days * dayMs);
  date.setHours(hour, 0, 0, 0);
  return date;
};

type ReviewStatus = IEvent['reviewStatus'];
type EventStatus = IEvent['status'];
type TicketStatus = 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';

interface DemoTicket {
  ticketName: string;
  description?: string;
  price: number;
  quantity: number;
  soldQuantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  status?: TicketStatus;
}

interface DemoEvent {
  title: string;
  slug: string;
  description: string;
  categorySlug: string;
  location: string;
  city: IEvent['city'];
  reviewStatus: ReviewStatus;
  status: EventStatus;
  startDate: Date;
  endDate: Date;
  capacity: number;
  rejectionReason?: string;
  featured?: boolean;
  trending?: boolean;
  tickets: DemoTicket[];
}

const DEMO_EVENTS: DemoEvent[] = [
  {
    title: 'Admin Demo - Published Music Festival',
    slug: 'admin-demo-published-music-festival',
    description: '<p>Published event with paid registrations for Event Administration and Ticket Administration.</p>',
    categorySlug: 'music',
    location: 'Hoa Binh Theater, Ho Chi Minh City',
    city: 'hcm',
    reviewStatus: 'PUBLISHED',
    status: 'published',
    startDate: future(20, 19),
    endDate: future(20, 23),
    capacity: 1200,
    featured: true,
    trending: true,
    tickets: [
      {
        ticketName: 'Standard',
        description: 'Main floor ticket',
        price: 350000,
        quantity: 600,
        soldQuantity: 8,
        maxPerOrder: 6,
      },
      {
        ticketName: 'VIP',
        description: 'Priority entrance and best seats',
        price: 850000,
        quantity: 200,
        soldQuantity: 4,
        maxPerOrder: 4,
      },
      {
        ticketName: 'Internal Hold',
        description: 'Hidden allocation for operations team',
        price: 0,
        quantity: 50,
        status: 'HIDDEN',
      },
    ],
  },
  {
    title: 'Admin Demo - Pending Tech Summit',
    slug: 'admin-demo-pending-tech-summit',
    description: '<p>Pending review event for admin approval and status tracking.</p>',
    categorySlug: 'conference',
    location: 'National Convention Center, Hanoi',
    city: 'hanoi',
    reviewStatus: 'PENDING_REVIEW',
    status: 'draft',
    startDate: future(35, 8),
    endDate: future(35, 17),
    capacity: 800,
    tickets: [
      {
        ticketName: 'Early Bird',
        price: 250000,
        quantity: 250,
        soldQuantity: 0,
      },
      {
        ticketName: 'Business Pass',
        price: 650000,
        quantity: 150,
        soldQuantity: 0,
      },
    ],
  },
  {
    title: 'Admin Demo - Rejected Comedy Night',
    slug: 'admin-demo-rejected-comedy-night',
    description: '<p>Rejected event with a visible rejection reason.</p>',
    categorySlug: 'music',
    location: 'Youth Cultural House, Ho Chi Minh City',
    city: 'hcm',
    reviewStatus: 'REJECTED',
    status: 'draft',
    startDate: future(42, 20),
    endDate: future(42, 22),
    capacity: 300,
    rejectionReason: 'Missing performance permit. Organizer must upload a valid permit before resubmission.',
    tickets: [
      {
        ticketName: 'General Admission',
        price: 180000,
        quantity: 300,
      },
    ],
  },
  {
    title: 'Admin Demo - Draft Photo Workshop',
    slug: 'admin-demo-draft-photo-workshop',
    description: '<p>Draft event owned by organizer. Useful for admin edit and force status tests.</p>',
    categorySlug: 'workshop',
    location: 'Studio A, District 3, Ho Chi Minh City',
    city: 'hcm',
    reviewStatus: 'DRAFT',
    status: 'draft',
    startDate: future(60, 14),
    endDate: future(60, 17),
    capacity: 80,
    tickets: [
      {
        ticketName: 'Workshop Seat',
        price: 200000,
        quantity: 80,
      },
    ],
  },
  {
    title: 'Admin Demo - Sold Out Running Day',
    slug: 'admin-demo-sold-out-running-day',
    description: '<p>Published event with one sold-out ticket tier.</p>',
    categorySlug: 'sport',
    location: 'West Lake, Hanoi',
    city: 'hanoi',
    reviewStatus: 'PUBLISHED',
    status: 'published',
    startDate: future(28, 6),
    endDate: future(28, 11),
    capacity: 500,
    tickets: [
      {
        ticketName: '5K Fun Run',
        price: 150000,
        quantity: 10,
        soldQuantity: 10,
        status: 'SOLD_OUT',
      },
      {
        ticketName: '10K Challenge',
        price: 300000,
        quantity: 100,
        soldQuantity: 2,
      },
    ],
  },
  {
    title: 'Admin Demo - Cancelled Food Fair',
    slug: 'admin-demo-cancelled-food-fair',
    description: '<p>Cancelled event for lifecycle filters and admin operations.</p>',
    categorySlug: 'workshop',
    location: 'District 7 Exhibition Hall, Ho Chi Minh City',
    city: 'hcm',
    reviewStatus: 'PUBLISHED',
    status: 'cancelled',
    startDate: future(15, 10),
    endDate: future(15, 21),
    capacity: 1000,
    tickets: [
      {
        ticketName: 'Entry Ticket',
        price: 50000,
        quantity: 1000,
      },
    ],
  },
  {
    title: 'Admin Demo - Completed Gala',
    slug: 'admin-demo-completed-gala',
    description: '<p>Completed event with paid sales for revenue-like ticket data.</p>',
    categorySlug: 'conference',
    location: 'Saigon Riverside Hotel, Ho Chi Minh City',
    city: 'hcm',
    reviewStatus: 'PUBLISHED',
    status: 'completed',
    startDate: past(20, 18),
    endDate: past(20, 22),
    capacity: 350,
    tickets: [
      {
        ticketName: 'Gala Seat',
        price: 700000,
        quantity: 350,
        soldQuantity: 6,
      },
    ],
  },
];

async function ensureUser(seed: typeof ADMIN | typeof ORGANIZER | typeof PARTICIPANT) {
  let user = await User.findOne({ email: seed.email }).select('+passwordHash');
  if (!user) {
    user = new User({
      fullName: seed.fullName,
      email: seed.email,
      passwordHash: seed.password,
      phone: seed.phone,
      role: seed.role,
      accountStatus: 'ACTIVE',
    });
  } else {
    user.fullName = seed.fullName;
    user.passwordHash = seed.password;
    user.phone = seed.phone;
    user.role = seed.role;
    user.accountStatus = 'ACTIVE';
  }
  await user.save();
  return user;
}

async function ensureCategories() {
  const categories = [];
  for (const category of CATEGORIES) {
    const saved = await Category.findOneAndUpdate(
      { slug: category.slug },
      { $set: category },
      { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
    );
    categories.push(saved);
  }
  return new Map(categories.map((category) => [category.slug, category]));
}

async function resetPreviousDemoData() {
  const demoSlugs = DEMO_EVENTS.map((event) => event.slug);
  const previousEvents = await Event.find({ slug: { $in: demoSlugs } }).select('_id');
  const eventIds = previousEvents.map((event) => event._id);

  if (!eventIds.length) return 0;

  const registrations = await Registration.find({ eventId: { $in: eventIds } }).select('_id');
  const registrationIds = registrations.map((registration) => registration._id);

  if (registrationIds.length) {
    await Payment.deleteMany({ registrationId: { $in: registrationIds } });
    await Registration.deleteMany({ _id: { $in: registrationIds } });
  }

  await Ticket.deleteMany({ eventId: { $in: eventIds } });
  await Event.deleteMany({ _id: { $in: eventIds } });
  return eventIds.length;
}

function visiblePriceFrom(tickets: DemoTicket[]) {
  const visibleTickets = tickets.filter((ticket) => ticket.status !== 'HIDDEN');
  return Math.min(...visibleTickets.map((ticket) => ticket.price));
}

async function createPaidRegistration(params: {
  participantId: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  ticketId: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
}) {
  const registration = await Registration.create({
    participantId: params.participantId,
    eventId: params.eventId,
    ticketId: params.ticketId,
    quantity: params.quantity,
    unitPrice: params.unitPrice,
    totalAmount: params.unitPrice * params.quantity,
    registerDate: new Date(),
    status: 'PAID',
  });

  await Payment.create({
    registrationId: registration._id,
    amount: registration.totalAmount,
    paymentMethod: 'MOCK',
    transactionCode: `ADMIN-DEMO-${registration._id}`,
    status: 'PAID',
    paymentDate: new Date(),
  });
}

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('Connected MongoDB:', config.mongodbUri);

  const [admin, organizer, participant] = await Promise.all([
    ensureUser(ADMIN),
    ensureUser(ORGANIZER),
    ensureUser(PARTICIPANT),
  ]);
  const categoryBySlug = await ensureCategories();
  const removedCount = await resetPreviousDemoData();
  if (removedCount) {
    console.log(`Removed ${removedCount} previous admin demo events.`);
  }

  let createdEvents = 0;
  let createdTickets = 0;
  let createdRegistrations = 0;

  for (const seedEvent of DEMO_EVENTS) {
    const category = categoryBySlug.get(seedEvent.categorySlug) ?? [...categoryBySlug.values()][0];
    const event = await Event.create({
      title: seedEvent.title,
      slug: seedEvent.slug,
      description: seedEvent.description,
      contentBlocks: [{ type: 'paragraph', text: seedEvent.description.replace(/<[^>]+>/g, '') }],
      location: seedEvent.location,
      city: seedEvent.city,
      organizer: organizer.fullName,
      organizerId: organizer._id,
      creatorId: organizer._id,
      category: category.name,
      categorySlug: category.slug,
      categoryId: category._id,
      date: seedEvent.startDate,
      time: `${String(seedEvent.startDate.getHours()).padStart(2, '0')}:00`,
      sessions: [{ date: seedEvent.startDate, time: `${String(seedEvent.startDate.getHours()).padStart(2, '0')}:00` }],
      startDate: seedEvent.startDate,
      endDate: seedEvent.endDate,
      shows: [{ startTime: seedEvent.startDate, endTime: seedEvent.endDate }],
      maxAttendees: seedEvent.capacity,
      capacity: seedEvent.capacity,
      reviewStatus: seedEvent.reviewStatus,
      status: seedEvent.status,
      rejectionReason: seedEvent.rejectionReason,
      reviewedAt:
        seedEvent.reviewStatus === 'PUBLISHED' || seedEvent.reviewStatus === 'REJECTED'
          ? new Date()
          : undefined,
      approvedById: seedEvent.reviewStatus === 'PUBLISHED' ? admin._id : undefined,
      banner: `https://picsum.photos/seed/${seedEvent.slug}/1200/675`,
      imageUrl: `https://picsum.photos/seed/${seedEvent.slug}/1200/675`,
      priceFrom: visiblePriceFrom(seedEvent.tickets),
      isFree: seedEvent.tickets.filter((ticket) => ticket.status !== 'HIDDEN').every((ticket) => ticket.price === 0),
      isFeatured: seedEvent.featured === true,
      isTrending: seedEvent.trending === true,
      privacy: 'public',
      logisticsServices: [],
      permitDocuments:
        seedEvent.reviewStatus === 'PENDING_REVIEW' || seedEvent.reviewStatus === 'PUBLISHED'
          ? [
              {
                name: 'Demo permit.pdf',
                url: `/uploads/demo/${seedEvent.slug}-permit.pdf`,
                sizeKb: 256,
              },
            ]
          : [],
      paymentInfo: {
        bankName: 'Demo Bank',
        accountNumber: '123456789',
        accountHolder: organizer.fullName,
      },
    });
    createdEvents += 1;

    for (const seedTicket of seedEvent.tickets) {
      const ticket = await Ticket.create({
        eventId: event._id,
        ticketName: seedTicket.ticketName,
        description: seedTicket.description,
        price: seedTicket.price,
        quantity: seedTicket.quantity,
        soldQuantity: seedTicket.soldQuantity ?? 0,
        minPerOrder: seedTicket.minPerOrder ?? 1,
        maxPerOrder: seedTicket.maxPerOrder ?? 10,
        saleStart: past(7, 9),
        // Sales close 30 minutes before the doors — see TICKET_SALE_END_LEAD_MS.
        saleEnd: new Date(seedEvent.startDate.getTime() - TICKET_SALE_END_LEAD_MS),
        status: seedTicket.status ?? 'ACTIVE',
      });
      createdTickets += 1;

      const paidQuantity = seedTicket.soldQuantity ?? 0;
      if (paidQuantity > 0) {
        await createPaidRegistration({
          participantId: participant._id as mongoose.Types.ObjectId,
          eventId: event._id as mongoose.Types.ObjectId,
          ticketId: ticket._id as mongoose.Types.ObjectId,
          quantity: Math.min(paidQuantity, 2),
          unitPrice: ticket.price,
        });
        createdRegistrations += 1;
      }
    }

    console.log(`- ${seedEvent.reviewStatus.padEnd(14)} ${seedEvent.status.padEnd(10)} ${seedEvent.title}`);
  }

  console.log('');
  console.log(`Seeded ${createdEvents} events, ${createdTickets} tickets, ${createdRegistrations} paid registrations.`);
  console.log('Demo accounts:');
  console.log(`- Admin:       ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`- Organizer:   ${ORGANIZER.email} / ${ORGANIZER.password}`);
  console.log(`- Participant: ${PARTICIPANT.email} / ${PARTICIPANT.password}`);

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (error) => {
  console.error('Seed admin demo failed:', error?.message || error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
