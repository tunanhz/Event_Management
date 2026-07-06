export type EventStatus = "draft" | "published" | "cancelled" | "completed"

export interface Event {
  id: string
  title: string
  description: string
  date: string
  location: string
  capacity: number
  ticketsSold: number
  revenue: number
  status: EventStatus
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Attendee {
  id: string
  eventId: string
  name: string
  email: string
  ticketType: string
  status: "checked-in" | "registered" | "cancelled"
  purchasedAt: string
}

export interface DashboardMetrics {
  totalEvents: number
  activeEvents: number
  totalRevenue: number
  totalAttendees: number
  revenueGrowth: number // percentage
  attendeeGrowth: number // percentage
  totalUsers: number
  pendingApprovals: number
}

export type ModerationStatus = "pending" | "approved" | "rejected"

export interface ModerationEvent {
  id: string
  title: string
  organizer: string
  category: string
  location: string
  submittedAt: string
  status: ModerationStatus
}

export interface RevenueData {
  month: string
  revenue: number
}
