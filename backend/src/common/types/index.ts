/**
 * Centralized domain enums shared across modules.
 * Modeled as `as const` objects + derived union types (tree-shakeable, no runtime enum pitfalls).
 * The `*_VALUES` arrays are typed as non-empty tuples so they drop straight into
 * Zod `z.enum(...)` and Mongoose `enum: [...]` with full literal typing.
 */

export const Role = {
  Employee: 'employee',
  Engineer: 'engineer',
} as const;
export type Role = (typeof Role)[keyof typeof Role];
export const ROLES = Object.values(Role) as [Role, ...Role[]];

export const UserStatus = {
  Pending: 'pending',
  Active: 'active',
  Rejected: 'rejected',
  Disabled: 'disabled',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];
export const USER_STATUSES = Object.values(UserStatus) as [UserStatus, ...UserStatus[]];

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
export const TICKET_STATUSES = Object.values(TicketStatus) as [TicketStatus, ...TicketStatus[]];

export const TicketPriority = {
  Low: 'low',
  Medium: 'medium',
  High: 'high',
  Urgent: 'urgent',
} as const;
export type TicketPriority = (typeof TicketPriority)[keyof typeof TicketPriority];
export const TICKET_PRIORITIES = Object.values(TicketPriority) as [
  TicketPriority,
  ...TicketPriority[],
];

export const NotificationType = {
  Registration: 'registration',
  Approval: 'approval',
  Rejection: 'rejection',
  Assignment: 'assignment',
  StatusChange: 'status_change',
  Comment: 'comment',
  Resolution: 'resolution',
  Closure: 'closure',
  Reminder: 'reminder',
  PasswordReset: 'password_reset',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const NOTIFICATION_TYPES = Object.values(NotificationType) as [
  NotificationType,
  ...NotificationType[],
];

export const AttachmentScanStatus = {
  Pending: 'pending',
  Clean: 'clean',
  Infected: 'infected',
} as const;
export type AttachmentScanStatus = (typeof AttachmentScanStatus)[keyof typeof AttachmentScanStatus];
