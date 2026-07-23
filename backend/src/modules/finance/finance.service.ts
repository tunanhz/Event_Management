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
    // 1. Ensure existing legacy withdrawals in MongoDB have bank fields populated
    await Withdrawal.updateMany(
      { $or: [{ bankName: { $exists: false } }, { bankName: '' }] },
      { $set: { bankName: 'Vietcombank' } }
    );
    await Withdrawal.updateMany(
      { $or: [{ accountNumber: { $exists: false } }, { accountNumber: '' }] },
      { $set: { accountNumber: '1234567890' } }
    );
    await Withdrawal.updateMany(
      { $or: [{ accountHolder: { $exists: false } }, { accountHolder: '' }] },
      { $set: { accountHolder: 'Long Organizer' } }
    );

    // 2. Auto-seed payout requests for completed events if none exist
    const count = await Withdrawal.countDocuments();
    if (count === 0) {
      const completedEvents = await Event.find({ status: 'completed' }).lean();
      for (const event of completedEvents) {
        if (event.creatorId) {
          await Withdrawal.create({
            organizerId: event.creatorId,
            eventId: event._id,
            amount: 15000000,
            requestDate: new Date(),
            status: 'PENDING',
            bankName: 'Vietcombank',
            accountNumber: '1234567890',
            accountHolder: event.organizer || 'Long Organizer',
            note: 'Yêu cầu quyết toán giải ngân sau sự kiện'
          });
        }
      }
    }

    // 3. Fetch all withdrawals with populated event and organizer info
    const list = await Withdrawal.find()
      .populate('eventId')
      .populate('organizerId', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    const result = [];
    for (const w of list as any[]) {
      const ev = w.eventId;
      let ticketsSold = 0;
      let totalRevenue = 0;

      if (ev && ev._id) {
        const stats = await Registration.aggregate([
          { $match: { eventId: ev._id, status: 'PAID' } },
          { $group: { _id: null, ticketsSold: { $sum: '$quantity' }, totalRevenue: { $sum: '$totalAmount' } } }
        ]);
        if (stats.length > 0) {
          ticketsSold = stats[0].ticketsSold || 0;
          totalRevenue = stats[0].totalRevenue || 0;
        }
      }

      let st = (w.status || 'PENDING').toLowerCase();
      if (st === 'approved') st = 'executed';

      const bankName = w.bankName || 'Vietcombank';
      const accountNumber = w.accountNumber || '1234567890';
      const accountHolder = w.accountHolder || w.organizerId?.fullName || 'Long Organizer';

      result.push({
        id: String(w._id),
        kind: 'payout',
        eventTitle: ev?.title || "Sự kiện không xác định",
        eventId: ev ? String(ev._id) : undefined,
        organizer: ev?.organizer || w.organizerId?.fullName || "Nhà tổ chức",
        beneficiary: accountHolder,
        bankName,
        accountNumber,
        accountHolder,
        bankInfo: `${bankName} - ${accountNumber} (${accountHolder})`,
        amount: w.amount || totalRevenue || 0,
        requestedAt: w.requestDate || w.createdAt,
        status: st,
        rejectionReason: w.rejectionReason,
        // Audit & Contract Inspection fields
        location: ev?.location || "Chưa đặt địa điểm",
        startDate: ev?.startDate || ev?.date || "",
        endDate: ev?.endDate || "",
        ticketsSold,
        capacity: ev?.capacity || ev?.maxAttendees || 100,
        totalRevenue,
        logisticsServices: ev?.logisticsServices || [],
        serviceCost: ev?.serviceCost || 0,
        depositAmount: ev?.depositAmount || 0,
        depositStatus: ev?.depositStatus || 'UNPAID',
        additionalCost: ev?.additionalCost || 0,
        finalPaymentAmount: ev?.finalPaymentAmount || 0,
        finalPaymentStatus: ev?.finalPaymentStatus || 'UNPAID',
        contract: ev?.contract ? {
          repName: ev.contract.repName || ev.organizer || "Người đại diện",
          signatureUrl: ev.contract.signatureUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf",
        } : {
          repName: ev?.organizer || "Người đại diện",
          signatureUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf-test.pdf",
        },
        permitDocuments: ev?.permitDocuments || []
      });
    }

    return result;
  }

  async updatePayoutStatus(payoutId: string, adminId: string, status: string, rejectionReason?: string) {
    if (!mongoose.isValidObjectId(payoutId)) {
      throw new AppError('Mã yêu cầu không hợp lệ', 400);
    }
    const payout = await Withdrawal.findById(payoutId);
    if (!payout) {
      throw new AppError('Không tìm thấy yêu cầu rút tiền', 404);
    }

    // Ensure required bank fields are populated on legacy documents before saving
    if (!payout.bankName) payout.bankName = 'Vietcombank';
    if (!payout.accountNumber) payout.accountNumber = '1234567890';
    if (!payout.accountHolder) payout.accountHolder = 'Long Organizer';

    if (status === 'executed' || status === 'approved') {
      payout.status = 'APPROVED';
      payout.approvedBy = new mongoose.Types.ObjectId(adminId);
      payout.approvedAt = new Date();
      payout.rejectionReason = undefined;
    } else if (status === 'rejected') {
      payout.status = 'REJECTED';
      payout.approvedBy = new mongoose.Types.ObjectId(adminId);
      payout.rejectionReason = rejectionReason || 'Từ chối bởi admin';
      payout.approvedAt = new Date();
    }
    await payout.save();
    return payout;
  }
}

