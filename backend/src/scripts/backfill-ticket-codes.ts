import mongoose from 'mongoose';
import { config } from '../config';
import {
  Registration,
  IRegistration,
} from '../modules/registration/registration.model';

const shouldApply = process.argv.includes('--apply');

async function main(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 15_000 });

  const missingCodeFilter: mongoose.QueryFilter<IRegistration> = {
    status: 'PAID',
    $or: [
      { ticketCode: { $exists: false } },
      { ticketCode: null },
      { ticketCode: '' },
    ],
  };

  const registrations = await Registration.find(missingCodeFilter).select('_id').lean();

  if (!shouldApply) {
    console.log(
      `Dry run: ${registrations.length} paid registration(s) need a ticket code. ` +
        'Run again with --apply to backfill them.'
    );
    return;
  }

  let updated = 0;
  for (const registration of registrations) {
    // This is the exact fallback code previously rendered by "Vé của tôi", so
    // screenshots or printed QR codes created before the migration stay valid.
    const ticketCode = `EVB-${String(registration._id).slice(-6).toUpperCase()}`;
    const result = await Registration.updateOne(
      {
        _id: registration._id,
        ...missingCodeFilter,
      },
      { $set: { ticketCode } }
    );
    updated += result.modifiedCount;
  }

  await Registration.createIndexes();
  console.log(`Backfilled ${updated} paid registration(s); ticketCode unique index is ready.`);
}

main()
  .catch((error) => {
    console.error('Ticket-code migration failed:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
