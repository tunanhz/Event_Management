import mongoose from 'mongoose';
import { config } from '../config';
import { Event } from '../modules/event/event.model';
import { Ticket } from '../modules/organizer/ticket.model';
import { Registration } from '../modules/registration/registration.model';
import { Payment } from '../modules/registration/payment.model';
import { Contract, Withdrawal, Issue, StaffAssignment, CheckIn } from '../models';

async function run(): Promise<void> {
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 8000 });
  console.log('📦 Đã kết nối MongoDB:', config.mongodbUri);

  // Find the "Á Thần" event (case-insensitive search)
  const athanEvent = await Event.findOne({ title: /á thần/i }).select('_id title');
  
  if (!athanEvent) {
    console.log('⚠️ Không tìm thấy sự kiện "Á Thần" trong database. Không thực hiện xoá để tránh mất hết dữ liệu.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const athanId = athanEvent._id;
  console.log(`🎯 Đã tìm thấy sự kiện "${athanEvent.title}" với ID: ${athanId}`);

  // Delete other events
  const otherEvents = await Event.deleteMany({ _id: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherEvents.deletedCount} sự kiện khác.`);

  // Delete other tickets
  const otherTickets = await Ticket.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherTickets.deletedCount} loại vé khác.`);

  // Delete other registrations
  const otherRegs = await Registration.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherRegs.deletedCount} lượt đăng ký khác.`);

  // Delete other payments
  const athanRegs = await Registration.find({ eventId: athanId }).select('_id');
  const athanRegIds = athanRegs.map(r => r._id);
  const otherPayments = await Payment.deleteMany({ registrationId: { $nin: athanRegIds } as any });
  console.log(`❌ Đã xoá ${otherPayments.deletedCount} thanh toán của sự kiện khác.`);

  // Delete other staff assignments
  const otherStaff = await StaffAssignment.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherStaff.deletedCount} phân công nhân sự khác.`);

  // Delete other contracts
  const otherContracts = await Contract.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherContracts.deletedCount} đối soát hợp đồng khác.`);

  // Delete other withdrawals
  const otherWithdrawals = await Withdrawal.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherWithdrawals.deletedCount} yêu cầu rút tiền khác.`);

  // Delete other check-ins
  const otherCheckIns = await CheckIn.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherCheckIns.deletedCount} lượt check-in khác.`);

  // Delete other incidents
  const otherIncidents = await Issue.deleteMany({ eventId: { $ne: athanId } });
  console.log(`❌ Đã xoá ${otherIncidents.deletedCount} sự cố cổng khác.`);

  console.log('✅ Hoàn tất dọn dẹp cơ sở dữ liệu sự kiện, chỉ giữ lại "Á Thần".');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('❌ Dọn dẹp thất bại:', err?.message || err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
