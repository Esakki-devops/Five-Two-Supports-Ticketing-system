import { Types } from 'mongoose';
import { Role, TicketStatus } from '../../common/types/index';
import type { AuthContext } from '../../core/middleware/auth-context';
import { Ticket } from '../tickets/ticket.model';

interface GroupCount {
  _id: string | null;
  count: number;
}

export interface DashboardSummary {
  totals: { total: number; open: number; resolved: number; closed: number; unassigned?: number };
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byDepartment: { department: string; name: string; count: number }[];
  /** Mean time to resolution, in hours (null when nothing resolved yet). */
  mttrHours: number | null;
}

const toRecord = (rows: GroupCount[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const row of rows) if (row._id) out[row._id] = row.count;
  return out;
};

const OPEN_STATES: TicketStatus[] = [
  TicketStatus.New,
  TicketStatus.Open,
  TicketStatus.InProgress,
  TicketStatus.OnHold,
  TicketStatus.Reopened,
];

export async function getSummary(actor: AuthContext): Promise<DashboardSummary> {
  // Employees only ever see their own non-internal tickets.
  const match: Record<string, unknown> = { isDeleted: false };
  if (actor.role === Role.Employee) {
    match.requester = new Types.ObjectId(actor.userId);
    match.isInternal = false;
  }

  const [byStatusRows, byPriorityRows, byDepartmentRows, mttrRows, total, unassigned] =
    await Promise.all([
      Ticket.aggregate<GroupCount>([
        { $match: match },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate<GroupCount>([
        { $match: match },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Ticket.aggregate<{ department: Types.ObjectId; name?: string; count: number }>([
        { $match: match },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
        { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 0, department: '$_id', name: '$dept.name', count: 1 } },
        { $sort: { count: -1 } },
      ]),
      Ticket.aggregate<{ avgMs: number }>([
        { $match: { ...match, resolvedAt: { $ne: null } } },
        { $project: { ms: { $subtract: ['$resolvedAt', '$createdAt'] } } },
        { $group: { _id: null, avgMs: { $avg: '$ms' } } },
      ]),
      Ticket.countDocuments(match),
      actor.role === Role.Engineer
        ? Ticket.countDocuments({
            ...match,
            assignee: null,
            status: { $nin: [TicketStatus.Closed] },
          })
        : Promise.resolve(undefined),
    ]);

  const byStatus = toRecord(byStatusRows);
  const avgMs = mttrRows[0]?.avgMs ?? null;

  return {
    totals: {
      total,
      open: OPEN_STATES.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0),
      resolved: byStatus[TicketStatus.Resolved] ?? 0,
      closed: byStatus[TicketStatus.Closed] ?? 0,
      ...(unassigned !== undefined ? { unassigned } : {}),
    },
    byStatus,
    byPriority: toRecord(byPriorityRows),
    byDepartment: byDepartmentRows.map((r) => ({
      department: String(r.department),
      name: r.name ?? 'Unknown',
      count: r.count,
    })),
    mttrHours: avgMs != null ? Math.round((avgMs / 3_600_000) * 10) / 10 : null,
  };
}
