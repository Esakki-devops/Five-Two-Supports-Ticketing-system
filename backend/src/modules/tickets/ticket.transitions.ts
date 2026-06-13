import { TicketStatus } from '../../common/types/index';

/**
 * Allowed status transitions. Invalid jumps are rejected server-side.
 * Engineers may perform any allowed transition; employees are further limited
 * to confirming/reopening their own tickets (see EMPLOYEE_TRANSITIONS).
 */
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

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/** The only transitions an employee may drive on their own ticket. */
const EMPLOYEE_TRANSITIONS: ReadonlyArray<{ from: TicketStatus; to: TicketStatus }> = [
  { from: TicketStatus.Resolved, to: TicketStatus.Closed }, // confirm resolution
  { from: TicketStatus.Resolved, to: TicketStatus.Reopened }, // reject resolution
  { from: TicketStatus.Closed, to: TicketStatus.Reopened }, // reopen after close
];

export function employeeCanTransition(from: TicketStatus, to: TicketStatus): boolean {
  return EMPLOYEE_TRANSITIONS.some((t) => t.from === from && t.to === to);
}
