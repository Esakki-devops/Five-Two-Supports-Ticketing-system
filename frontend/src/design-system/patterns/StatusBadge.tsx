import { Badge, type BadgeProps } from '@/design-system/primitives/Badge';
import type { TicketStatus } from '@/types';

type Variant = NonNullable<BadgeProps['variant']>;

const STATUS: Record<TicketStatus, { label: string; variant: Variant }> = {
  new: { label: 'New', variant: 'info' },
  open: { label: 'Open', variant: 'primary' },
  in_progress: { label: 'In Progress', variant: 'primary' },
  on_hold: { label: 'On Hold', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  closed: { label: 'Closed', variant: 'muted' },
  reopened: { label: 'Reopened', variant: 'warning' },
};

export function StatusBadge({ status }: { status: TicketStatus }) {
  const config = STATUS[status] ?? { label: status, variant: 'default' as Variant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
