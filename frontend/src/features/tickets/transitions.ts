import { TicketStatus } from '@/types';

/** Mirrors the backend's allowed-transition map (UI affordance only; server re-validates). */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.New]: [
    TicketStatus.Open,
    TicketStatus.InProgress,
    TicketStatus.OnHold,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
  [TicketStatus.Open]: [
    TicketStatus.InProgress,
    TicketStatus.OnHold,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
  [TicketStatus.InProgress]: [
    TicketStatus.Open,
    TicketStatus.OnHold,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
  [TicketStatus.OnHold]: [
    TicketStatus.Open,
    TicketStatus.InProgress,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
  [TicketStatus.Resolved]: [TicketStatus.Closed, TicketStatus.Reopened, TicketStatus.InProgress],
  [TicketStatus.Closed]: [TicketStatus.Reopened],
  [TicketStatus.Reopened]: [
    TicketStatus.Open,
    TicketStatus.InProgress,
    TicketStatus.OnHold,
    TicketStatus.Resolved,
    TicketStatus.Closed,
  ],
};

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  open: 'Open',
  in_progress: 'In Progress',
  on_hold: 'On Hold',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

export function nextStatuses(from: TicketStatus): TicketStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}
