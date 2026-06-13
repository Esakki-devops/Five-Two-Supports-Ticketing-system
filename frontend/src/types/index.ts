// Shared domain types/enums — mirror the backend's `/api/v1` contract.

export const Role = { Employee: 'employee', Engineer: 'engineer' } as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  Pending: 'pending',
  Active: 'active',
  Rejected: 'rejected',
  Disabled: 'disabled',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const TicketStatus = {
  New: 'new',
  Open: 'open',
  InProgress: 'in_progress',
  OnHold: 'on_hold',
  Resolved: 'resolved',
  Closed: 'closed',
  Reopened: 'reopened',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TicketPriority = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Urgent: 'urgent',
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];

export const AttachmentScanStatus = {
  Pending: 'pending',
  Clean: 'clean',
  Infected: 'infected',
} as const;
export type AttachmentScanStatus = (typeof AttachmentScanStatus)[keyof typeof AttachmentScanStatus];

export interface RefUser {
  id: string;
  name: string;
  email?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  department?: string | { id: string; name: string } | null;
  mustResetPassword?: boolean;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface Department {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  department?: { id: string; name: string } | string | null;
  isActive: boolean;
}

export interface Attachment {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  scanStatus: AttachmentScanStatus;
  uploadedBy?: RefUser | string;
  uploadedAt: string;
}

export interface TicketComment {
  _id: string;
  author: RefUser | string;
  body: string;
  createdAt: string;
}

export interface ActivityEntry {
  actor?: RefUser | string;
  action: string;
  from?: string;
  to?: string;
  at: string;
}

export interface TicketSummary {
  id: string;
  ticketNumber: string;
  title: string;
  status: TicketStatus;
  priority: TicketPriority;
  isInternal: boolean;
  requester?: RefUser;
  assignee?: RefUser | null;
  department?: { id: string; name: string };
  category?: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Ticket extends TicketSummary {
  description: string;
  createdBy?: RefUser;
  comments: TicketComment[];
  activity: ActivityEntry[];
  attachments: Attachment[];
  resolvedAt?: string | null;
  closedAt?: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  ticket?: { id: string; ticketNumber: string; title: string } | string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totals: { total: number; open: number; resolved: number; closed: number; unassigned?: number };
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byDepartment: { department: string; name: string; count: number }[];
  /** Mean time to resolution, in hours (null until something is resolved). */
  mttrHours: number | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  mustResetPassword?: boolean;
}
