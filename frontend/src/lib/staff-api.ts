/**
 * Staff API Client — Client Components only (uses clientApi with credentials)
 * Mirrors the backend routes at /api/staff and /api/admin
 */
import { clientApi } from "@/lib/client-api";

// ─── Shared envelope ──────────────────────────────────────────────────────────

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentStatus = "assigned" | "confirmed" | "completed" | "cancelled";

export interface StaffAssignment {
  _id: string;
  eventId: {
    _id: string;
    title: string;
    banner?: string;
    imageUrl?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    status: string;
  } | string;
  staffId: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  } | string;
  gate: string;
  shift: string;
  responsibility: string;
  status: AssignmentStatus;
  note?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CheckInResult = "success" | "duplicate" | "invalid" | "wrong_event" | "cancelled";

export interface CheckInResponse {
  result: CheckInResult;
  message: string;
  attendeeName?: string;
  ticketName?: string;
  checkedInAt?: string;
  previousCheckedInAt?: string;
}

export interface CheckInStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percent: number;
}

export interface CheckInLogEntry {
  _id: string;
  ticketCode: string;
  result: CheckInResult;
  gate?: string;
  checkedInAt: string;
  staffId?: { fullName: string; email: string };
}

export interface AttendeeRow {
  _id: string;
  participantId?: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
    phone?: string;
  };
  ticketId?: {
    _id: string;
    ticketName: string;
    price: number;
  };
  ticketCode?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  checkedIn?: boolean;
  checkedInAt?: string;
  status: string;
}

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type IncidentCategory =
  | "security"
  | "crowd_control"
  | "equipment"
  | "medical"
  | "ticket_dispute"
  | "other";

export interface IncidentReport {
  _id: string;
  eventId: { _id: string; title: string } | string;
  staffId: { _id: string; fullName: string; email: string; avatar?: string } | string;
  title: string;
  description: string;
  location: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  attachments: string[];
  status: IncidentStatus;
  resolvedNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Assignments (Staff) ──────────────────────────────────────────────────────

/** Staff: lấy danh sách ca trực của bản thân */
export async function fetchMyAssignments(): Promise<StaffAssignment[]> {
  const res = await clientApi.get<ApiEnvelope<StaffAssignment[]>>("/staff/assignments");
  return res.data ?? [];
}

/** Staff: xác nhận nhận ca */
export async function confirmAssignment(assignmentId: string): Promise<StaffAssignment> {
  const res = await clientApi.patch<ApiEnvelope<StaffAssignment>>(
    `/staff/assignments/${assignmentId}/confirm`,
    {}
  );
  return res.data;
}

// ─── Assignments (Admin) ──────────────────────────────────────────────────────

export interface CreateAssignmentPayload {
  staffId: string;
  gate: string;
  shift: string;
  responsibility: string;
  note?: string;
}

/** Admin: phân công staff cho sự kiện */
export async function createAssignment(
  eventId: string,
  payload: CreateAssignmentPayload
): Promise<StaffAssignment> {
  const res = await clientApi.post<ApiEnvelope<StaffAssignment>>(
    `/admin/events/${eventId}/assignments`,
    payload
  );
  return res.data;
}

/** Admin: xem danh sách phân công của sự kiện */
export async function fetchEventAssignments(eventId: string): Promise<StaffAssignment[]> {
  const res = await clientApi.get<ApiEnvelope<StaffAssignment[]>>(
    `/admin/events/${eventId}/assignments`
  );
  return res.data ?? [];
}

/** Admin: hủy phân công */
export async function deleteAssignment(
  eventId: string,
  assignmentId: string
): Promise<void> {
  await clientApi.delete(`/admin/events/${eventId}/assignments/${assignmentId}`);
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

/** Staff: quét mã vé / nhập tay */
export async function checkInTicket(payload: {
  ticketCode: string;
  eventId: string;
  gate?: string;
}): Promise<CheckInResponse> {
  const res = await clientApi.post<ApiEnvelope<CheckInResponse>>("/staff/check-in", payload);
  return res.data;
}

/** Staff: live stats check-in */
export async function fetchCheckInStats(eventId: string): Promise<CheckInStats> {
  const res = await clientApi.get<ApiEnvelope<CheckInStats>>(
    `/staff/events/${eventId}/checkin-stats`
  );
  return res.data;
}

/** Staff: lịch sử check-in */
export async function fetchCheckInHistory(
  eventId: string,
  params?: { page?: number; limit?: number }
): Promise<{ data: CheckInLogEntry[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";
  const res = await clientApi.get<ApiEnvelope<CheckInLogEntry[]>>(
    `/staff/events/${eventId}/checkin-history${query}`
  );
  return {
    data: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 50 },
  };
}

// ─── Attendees ────────────────────────────────────────────────────────────────

export interface FetchAttendeesParams {
  page?: number;
  limit?: number;
  search?: string;
  checkedIn?: boolean;
}

export async function fetchAttendees(
  eventId: string,
  params?: FetchAttendeesParams
): Promise<{ data: AttendeeRow[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.search) qs.set("search", params.search);
  if (params?.checkedIn !== undefined) qs.set("checkedIn", String(params.checkedIn));
  const query = qs.toString() ? `?${qs}` : "";
  const res = await clientApi.get<ApiEnvelope<AttendeeRow[]>>(
    `/staff/events/${eventId}/attendees${query}`
  );
  return {
    data: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 },
  };
}

/** Staff: check-in thủ công từ danh sách */
export async function manualCheckIn(
  eventId: string,
  registrationId: string
): Promise<AttendeeRow> {
  const res = await clientApi.post<ApiEnvelope<AttendeeRow>>(
    `/staff/events/${eventId}/attendees/${registrationId}/check-in`,
    {}
  );
  return res.data;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface CreateIncidentPayload {
  eventId: string;
  title: string;
  description: string;
  location: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  attachments?: string[];
}

/** Staff: gửi báo cáo sự cố */
export async function createIncident(
  payload: CreateIncidentPayload
): Promise<IncidentReport> {
  const res = await clientApi.post<ApiEnvelope<IncidentReport>>("/staff/incidents", payload);
  return res.data;
}

/** Staff: danh sách sự cố của mình */
export async function fetchMyIncidents(params?: {
  page?: number;
  limit?: number;
}): Promise<{ data: IncidentReport[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";
  const res = await clientApi.get<ApiEnvelope<IncidentReport[]>>(`/staff/incidents${query}`);
  return {
    data: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 },
  };
}

/** Staff: chi tiết sự cố */
export async function fetchIncidentById(id: string): Promise<IncidentReport> {
  const res = await clientApi.get<ApiEnvelope<IncidentReport>>(`/staff/incidents/${id}`);
  return res.data;
}

/** Admin: toàn bộ sự cố */
export async function fetchAllIncidents(params?: {
  eventId?: string;
  status?: IncidentStatus;
  page?: number;
  limit?: number;
}): Promise<{ data: IncidentReport[]; meta: PaginationMeta }> {
  const qs = new URLSearchParams();
  if (params?.eventId) qs.set("eventId", params.eventId);
  if (params?.status) qs.set("status", params.status);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";
  const res = await clientApi.get<ApiEnvelope<IncidentReport[]>>(`/admin/incidents${query}`);
  return {
    data: res.data ?? [],
    meta: res.meta ?? { currentPage: 1, totalPages: 1, totalItems: 0, itemsPerPage: 20 },
  };
}

/** Admin: cập nhật trạng thái sự cố */
export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  resolvedNote?: string
): Promise<IncidentReport> {
  const res = await clientApi.patch<ApiEnvelope<IncidentReport>>(
    `/admin/incidents/${id}/status`,
    { status, resolvedNote }
  );
  return res.data;
}
