/**
 * Staff-area API calls.
 *
 * Uses the client-side API helper (`clientApi`) which sends cookies (JWT token)
 * automatically and goes through the Next.js rewrite → Express backend.
 */

import { clientApi } from './client-api';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface StaffAssignment {
  _id: string;
  eventId: any; // populated Event object
  staffId: any; // populated User object
  roleInEvent: string;
  gate?: string;
  shift?: string;
  status: 'ACTIVE' | 'REMOVED';
  assignedAt: string;
}

export interface CheckInResult {
  status: 'SUCCESS' | 'DUPLICATE' | 'INVALID';
  checkIn?: any;
  previousTime?: string;
  attendeeName?: string;
  ticketType?: string;
}

export interface Attendee {
  registrationId: string;
  attendeeName: string;
  email: string;
  phone: string;
  ticketType: string;
  ticketPrice: number;
  quantity: number;
  checkedIn: boolean;
}

export interface CheckInStats {
  total: number;
  checkedIn: number;
  remaining: number;
  percent: number;
  byType: { type: string; total: number; checkedIn: number }[];
}

export interface CheckInHistoryEntry {
  checkInId: string;
  registrationId: string;
  attendeeName: string;
  ticketType: string;
  staffName: string;
  checkInTime: string;
  status?: string;
}

export type IncidentType = 'fake-ticket' | 'duplicate-ticket' | 'device-error' | 'gate-issue' | 'other';
export type IncidentStatus = 'PENDING' | 'IN_REVIEW' | 'RESOLVED';

export interface StaffIncident {
  _id: string;
  eventId: any; // populated
  reportedBy: any; // populated
  type: IncidentType;
  ticketCode?: string;
  description: string;
  status: IncidentStatus;
  resolvedBy?: any;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
}

// Wrap API response
interface ApiRes<T> {
  success: boolean;
  message: string;
  data: T;
}

// ═══════════════════════════════════════════════════════════════════
// Staff Assignment API
// ═══════════════════════════════════════════════════════════════════

/** Staff: get events assigned to me. */
export async function getMyAssignments(): Promise<StaffAssignment[]> {
  const res = await clientApi.get<ApiRes<StaffAssignment[]>>('/staff-assignments/me');
  return res.data;
}

/** Admin: assign staff to event. */
export async function assignStaff(body: {
  eventId: string;
  staffId: string;
  roleInEvent: string;
  gate?: string;
  shift?: string;
}): Promise<StaffAssignment> {
  const res = await clientApi.post<ApiRes<StaffAssignment>>('/staff-assignments', body);
  return res.data;
}

/** Admin: remove staff from event. */
export async function removeStaff(eventId: string, staffId: string): Promise<void> {
  await clientApi.delete(`/staff-assignments/${eventId}/${staffId}`);
}

/** Admin: get staff assigned to an event. */
export async function getStaffByEvent(eventId: string): Promise<StaffAssignment[]> {
  const res = await clientApi.get<ApiRes<StaffAssignment[]>>(`/staff-assignments/event/${eventId}`);
  return res.data;
}

/** Admin: update assignment details. */
export async function updateAssignment(
  eventId: string,
  staffId: string,
  body: { roleInEvent?: string; gate?: string; shift?: string }
): Promise<StaffAssignment> {
  const res = await clientApi.patch<ApiRes<StaffAssignment>>(
    `/staff-assignments/${eventId}/${staffId}`,
    body
  );
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════
// Check-In API
// ═══════════════════════════════════════════════════════════════════

/** Staff: check in an attendee. */
export async function checkIn(eventId: string, registrationId: string): Promise<CheckInResult> {
  const res = await clientApi.post<ApiRes<CheckInResult>>('/check-in', { eventId, registrationId });
  return res.data;
}

/** Staff: get attendees list for an event. */
export async function getAttendees(eventId: string): Promise<Attendee[]> {
  const res = await clientApi.get<ApiRes<Attendee[]>>(`/check-in/event/${eventId}/attendees`);
  return res.data;
}

/** Staff: get check-in history for an event. */
export async function getCheckInHistory(eventId: string): Promise<CheckInHistoryEntry[]> {
  const res = await clientApi.get<ApiRes<CheckInHistoryEntry[]>>(
    `/check-in/event/${eventId}/history`
  );
  return res.data;
}

/** Staff: get check-in stats for an event. */
export async function getCheckInStats(eventId: string): Promise<CheckInStats> {
  const res = await clientApi.get<ApiRes<CheckInStats>>(`/check-in/event/${eventId}/stats`);
  return res.data;
}

/** Staff: sell ticket offline at the gate. */
export async function sellOffline(
  eventId: string,
  body: {
    ticketId: string;
    quantity: number;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
  }
): Promise<any> {
  const res = await clientApi.post<ApiRes<any>>(`/check-in/event/${eventId}/sell-offline`, body);
  return res.data;
}

// ═══════════════════════════════════════════════════════════════════
// Incident API
// ═══════════════════════════════════════════════════════════════════

/** Staff: create an incident report. */
export async function createIncident(body: {
  eventId: string;
  type: IncidentType;
  ticketCode?: string;
  description: string;
}): Promise<StaffIncident> {
  const res = await clientApi.post<ApiRes<StaffIncident>>('/incidents', body);
  return res.data;
}

/** Staff: get my incident reports. */
export async function getMyIncidents(): Promise<StaffIncident[]> {
  const res = await clientApi.get<ApiRes<StaffIncident[]>>('/incidents/me');
  return res.data;
}

/** Admin: get all incidents (optional status filter). */
export async function getAllIncidents(status?: string): Promise<StaffIncident[]> {
  const qs = status ? `?status=${status}` : '';
  const res = await clientApi.get<ApiRes<StaffIncident[]>>(`/incidents${qs}`);
  return res.data;
}

/** Admin: get incidents by event. */
export async function getIncidentsByEvent(eventId: string): Promise<StaffIncident[]> {
  const res = await clientApi.get<ApiRes<StaffIncident[]>>(`/incidents/event/${eventId}`);
  return res.data;
}

/** Admin: update incident status. */
export async function updateIncidentStatus(
  incidentId: string,
  body: { status: string; resolution?: string }
): Promise<StaffIncident> {
  const res = await clientApi.patch<ApiRes<StaffIncident>>(`/incidents/${incidentId}/status`, body);
  return res.data;
}
