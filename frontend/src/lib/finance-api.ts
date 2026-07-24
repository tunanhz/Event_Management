import { clientApi } from './client-api';

export interface ContractReview {
  id: string;
  eventTitle: string;
  organizer: string;
  documentName: string;
  documentUrl: string;
  uploadedAt: string;
  status: 'awaiting_review' | 'compliant' | 'flagged';
  note?: string;
}

export interface PayoutRequest {
  id: string;
  kind: 'payout' | 'refund';
  eventTitle: string;
  eventId?: string;
  organizer?: string;
  beneficiary: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  bankInfo: string;
  amount: number;
  requestedAt: string;
  status: 'pending' | 'executed' | 'rejected';
  rejectionReason?: string;
  // Audit & Contract Inspection fields
  location?: string;
  startDate?: string;
  endDate?: string;
  ticketsSold?: number;
  capacity?: number;
  totalRevenue?: number;
  logisticsServices?: string[];
  serviceCost?: number;
  depositAmount?: number;
  depositStatus?: "PAID" | "UNPAID";
  additionalCost?: number;
  finalPaymentAmount?: number;
  finalPaymentStatus?: "PAID" | "UNPAID";
  contract?: {
    repName?: string;
    signatureUrl?: string;
  } | null;
  permitDocuments?: { name: string; url?: string; sizeKb?: number }[];
}

export interface DashboardStats {
  totalUsers: number;
  attendeeGrowth: number;
  totalEvents: number;
  activeEvents: number;
  totalRevenue: number;
  revenueGrowth: number;
  pendingApprovals: number;
  monthlyRevenue: { month: string; revenue: number }[];
  pendingEvents: {
    id: string;
    title: string;
    organizer: string;
    location: string;
    category: string;
    submittedAt: string;
  }[];
}

export interface DashboardReports {
  monthlyRevenue: { month: string; revenue: number }[];
  categoryData: { name: string; value: number }[];
  topEvents: {
    id: string;
    title: string;
    location: string;
    ticketsSold: number;
    capacity: number;
    revenue: number;
  }[];
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function fetchContracts(): Promise<ContractReview[]> {
  const res = await clientApi.get<ApiEnvelope<ContractReview[]>>('/finance/contracts');
  return res.data;
}

export async function updateContract(
  id: string,
  body: { status: string; note?: string }
): Promise<ContractReview> {
  const res = await clientApi.patch<ApiEnvelope<ContractReview>>(`/finance/contracts/${id}`, body);
  return res.data;
}

export async function fetchPayouts(): Promise<PayoutRequest[]> {
  const res = await clientApi.get<ApiEnvelope<PayoutRequest[]>>('/finance/payouts');
  return res.data;
}

export async function updatePayout(
  id: string,
  body: { status: string; rejectionReason?: string }
): Promise<PayoutRequest> {
  const res = await clientApi.patch<ApiEnvelope<PayoutRequest>>(`/finance/payouts/${id}`, body);
  return res.data;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const res = await clientApi.get<ApiEnvelope<DashboardStats>>('/admin/events/dashboard/stats');
  return res.data;
}

export async function fetchDashboardReports(): Promise<DashboardReports> {
  const res = await clientApi.get<ApiEnvelope<DashboardReports>>('/admin/events/dashboard/reports');
  return res.data;
}
