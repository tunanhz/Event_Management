/**
 * Remove leftover QA/test events (and their tickets) from the database.
 * QA scripts that create events keyed by a "QA ..." title should clean up after
 * themselves; this maintenance script clears any that were left behind.
 *
 * Usage: npm run cleanup:qa
 */
import mongoose from 'mongoose';
import { config } from '../config';
import { Event } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';

// Titles created by the QA suites (organizer.qa.ts, ticket-configuration.qa.ts).
const QA_TITLE_REGEX = /^QA (EM-|AM-|Wizard|Legacy|Ticket)/i;

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  const stale = await Event.find({ title: { $regex: QA_TITLE_REGEX } }).select('_id title');
  const ids = stale.map((e) => e._id);
  if (ids.length === 0) {
    console.log('✅ Không có sự kiện QA rác nào.');
  } else {
    const tickets = await Ticket.deleteMany({ eventId: { $in: ids } });
    await Event.deleteMany({ _id: { $in: ids } });
    console.log(`✅ Đã xoá ${ids.length} sự kiện QA + ${tickets.deletedCount} vé:`);
    stale.forEach((e) => console.log(`  • ${e.title}`));
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Cleanup QA thất bại:', err?.message || err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
