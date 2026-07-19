import mongoose from 'mongoose';
import { Contract, Withdrawal, Registration, Payment, User } from '../../models';
import { Event } from '../event/event.model';
import { AppError } from '../../common/utils/AppError';

export class FinanceService {
  async listContracts() {
    // 1. Find all completed events
    const completedEvents = await Event.find({ status: 'completed' }).lean();
    
    // 2. Ensure each completed event has a contract review record
    for (const event of completedEvents) {
      const existing = await Contract.findOne({ eventId: event._id });
      if (!existing) {
        await Contract.create({
          eventId: event._id,
          documentName: `hop-dong-va-bien-ban-thanh-ly-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'su-kien'}.pdf`,
          documentType: 'contract',
          documentUrl: event.contract?.signatureUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf',
          status: 'awaiting_review',
          uploadedAt: event.updatedAt || new Date()
        });
      }
    }

    const list = await Contract.find()
      .populate('eventId', 'title organizer')
      .populate('managedBy', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    return list.map((c: any) => ({
      id: c._id,
      eventTitle: c.eventId?.title || "Sự kiện không xác định",
      organizer: c.eventId?.organizer || "Nhà tổ chức",
      documentName: c.documentName,
      documentUrl: c.documentUrl,
      uploadedAt: c.uploadedAt,
      status: (c.status || 'awaiting_review').toLowerCase(),
      note: c.note
    }));
  }

  async updateContractStatus(contractId: string, adminId: string, status: string, note?: string) {
    if (!mongoose.isValidObjectId(contractId)) {
      throw new AppError('Mã hợp đồng không hợp lệ', 400);
    }
    const contract = await Contract.findById(contractId);
    if (!contract) {
      throw new AppError('Không tìm thấy hợp đồng', 404);
    }

    contract.status = status;
    contract.managedBy = new mongoose.Types.ObjectId(adminId);
    if (note !== undefined) {
      contract.note = note;
    }
    await contract.save();
    return contract;
  }

  async listPayouts() {
    // 1. Find all cancelled events
    const cancelledEvents = await Event.find({ status: 'cancelled' }).lean();

    // 2. Ensure each PAID registration of cancelled events has a refund record in Withdrawal
    for (const event of cancelledEvents) {
      const regs = await Registration.find({ eventId: event._id, status: 'PAID' }).lean();
      for (const reg of regs) {
        const existingRefund = await Withdrawal.findOne({ kind: 'refund', registrationId: reg._id });
        if (!existingRefund) {
          const user = await User.findById(reg.participantId).lean();
          const beneficiary = user?.fullName || 'Người mua vé';
          const payment = await Payment.findOne({ registrationId: reg._id }).lean();
          const amount = payment?.amount || reg.totalAmount || 0;
          const bankInfo = payment 
            ? `${payment.paymentMethod || 'VNPAY'} · GD: ${payment.transactionCode || reg._id}` 
            : 'VNPAY · Cổng thanh toán';

          await Withdrawal.create({
            eventId: event._id,
            organizerId: event.creatorId,
            registrationId: reg._id,
            kind: 'refund',
            beneficiary,
            bankInfo,
            amount,
            requestDate: reg.createdAt || new Date(),
            status: 'PENDING'
          });
        }
      }
    }

    const list = await Withdrawal.find()
      .populate('eventId', 'title')
      .populate('organizerId', 'fullName')
      .sort({ createdAt: -1 })
      .lean();

    return list.map((w: any) => ({
      id: w._id,
      kind: w.kind || "payout",
      eventTitle: w.eventId?.title || "Sự kiện không xác định",
      beneficiary: w.beneficiary || w.organizerId?.fullName || "Nhà tổ chức",
      bankInfo: w.bankInfo || "Chưa cung cấp",
      amount: w.amount,
      requestedAt: w.requestDate,
      status: (w.status || 'pending').toLowerCase(),
      rejectionReason: w.rejectionReason
    }));
  }

  async updatePayoutStatus(payoutId: string, adminId: string, status: string, rejectionReason?: string) {
    if (!mongoose.isValidObjectId(payoutId)) {
      throw new AppError('Mã yêu cầu không hợp lệ', 400);
    }
    const payout = await Withdrawal.findById(payoutId);
    if (!payout) {
      throw new AppError('Không tìm thấy yêu cầu rút tiền', 404);
    }

    payout.status = status;
    payout.approvedBy = new mongoose.Types.ObjectId(adminId);
    if (status === 'executed') {
      payout.approvedAt = new Date();
      payout.rejectionReason = undefined;

      // If it is a refund, update Registration and Payment status
      if (payout.kind === 'refund' && payout.registrationId) {
        await Registration.findByIdAndUpdate(payout.registrationId, { status: 'REFUNDED' });
        await Payment.findOneAndUpdate({ registrationId: payout.registrationId }, { status: 'REFUNDED' });
      }
    } else if (status === 'rejected') {
      payout.rejectionReason = rejectionReason || 'Từ chối bởi admin';
      payout.approvedAt = new Date();
    }
    await payout.save();
    return payout;
  }
}
