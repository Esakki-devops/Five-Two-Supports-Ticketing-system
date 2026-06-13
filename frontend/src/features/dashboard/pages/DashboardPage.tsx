import {
  CheckCircle2,
  Clock,
  Inbox,
  Ticket as TicketIcon,
  UserX,
  type LucideIcon,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
  Skeleton,
} from '@/design-system';
import { useAuthStore } from '@/stores/auth';
import { Role } from '@/types';
import { STATUS_LABELS } from '@/features/tickets/transitions';
import { cn } from '@/lib/utils/cn';
import { useDashboardSummary } from '../api';

const STATUS_ORDER = ['new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'];
const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

const STATUS_LABEL_MAP: Record<string, string> = { ...STATUS_LABELS };
const PRIORITY_LABEL_MAP: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};
const BAR_TONE: Record<string, string> = {
  new: 'bg-info',
  open: 'bg-info',
  in_progress: 'bg-primary',
  on_hold: 'bg-warning',
  resolved: 'bg-success',
  closed: 'bg-muted-foreground',
  reopened: 'bg-danger',
  urgent: 'bg-danger',
  high: 'bg-warning',
  medium: 'bg-info',
  low: 'bg-muted-foreground',
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  data,
  order,
  labels,
}: {
  title: string;
  data: Record<string, number>;
  order: string[];
  labels: Record<string, string>;
}) {
  const rows = order.filter((key) => (data[key] ?? 0) > 0);
  const max = Math.max(1, ...rows.map((key) => data[key] ?? 0));
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((key) => {
              const value = data[key] ?? 0;
              return (
                <li key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{labels[key] ?? key}</span>
                    <span className="font-medium tabular-nums">{value}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', BAR_TONE[key] ?? 'bg-primary')}
                      style={{ width: `${Math.round((value / max) * 100)}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isEngineer = user?.role === Role.Engineer;
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={TicketIcon}
        title="Couldn't load the dashboard"
        description="Something went wrong while fetching metrics."
        action={
          <Button variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const { totals, byStatus, byPriority, byDepartment, mttrHours } = data;
  const firstName = user?.name?.split(' ')[0] ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Dashboard'}
        description={isEngineer ? 'Organization-wide ticket overview.' : 'Your support overview.'}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total tickets" value={totals.total} icon={TicketIcon} />
        <StatCard label="Open" value={totals.open} icon={Inbox} />
        <StatCard label="Resolved" value={totals.resolved} icon={CheckCircle2} />
        {isEngineer && totals.unassigned !== undefined ? (
          <StatCard label="Unassigned" value={totals.unassigned} icon={UserX} />
        ) : (
          <StatCard label="Closed" value={totals.closed} icon={CheckCircle2} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Breakdown
          title="By status"
          data={byStatus}
          order={STATUS_ORDER}
          labels={STATUS_LABEL_MAP}
        />
        <Breakdown
          title="By priority"
          data={byPriority}
          order={PRIORITY_ORDER}
          labels={PRIORITY_LABEL_MAP}
        />
      </div>

      {isEngineer ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>By department</CardTitle>
            </CardHeader>
            <CardContent>
              {byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {byDepartment.map((dept) => (
                    <li
                      key={dept.department}
                      className="flex items-center justify-between py-2 text-sm"
                    >
                      <span>{dept.name}</span>
                      <span className="font-medium tabular-nums">{dept.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4 pt-2">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">Mean time to resolution</p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {mttrHours != null ? `${mttrHours}h` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
