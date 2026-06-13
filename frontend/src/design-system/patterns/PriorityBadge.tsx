import { Badge, type BadgeProps } from '@/design-system/primitives/Badge';
import type { TicketPriority } from '@/types';

type Variant = NonNullable<BadgeProps['variant']>;

const PRIORITY: Record<TicketPriority, { label: string; variant: Variant }> = {
  low: { label: 'Low', variant: 'muted' },
  medium: { label: 'Medium', variant: 'info' },
  high: { label: 'High', variant: 'warning' },
  urgent: { label: 'Urgent', variant: 'danger' },
};

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const config = PRIORITY[priority] ?? { label: priority, variant: 'default' as Variant };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
