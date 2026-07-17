import mongoose from 'mongoose';
import { Contract, Withdrawal } from '../../models';
import { Event } from '../event/event.model';
import { User } from '../user/user.model';
import { AppError } from '../../common/utils/AppError';

export class FinanceService {
  async listContracts() {
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
      status: c.status,
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
      status: w.status,
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
    } else if (status === 'rejected') {
      payout.rejectionReason = rejectionReason || 'Từ chối bởi admin';
      payout.approvedAt = new Date();
    }
    await payout.save();
    return payout;
  }
}
