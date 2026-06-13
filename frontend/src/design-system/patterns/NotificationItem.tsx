import {
  Bell,
  CheckCircle2,
  MessageSquare,
  RefreshCcw,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

interface NotificationItemProps {
  type: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  onClick?: () => void;
  className?: string;
}

const ICONS: Record<string, LucideIcon> = {
  assignment: UserPlus,
  comment: MessageSquare,
  resolution: CheckCircle2,
  closure: CheckCircle2,
  status_change: RefreshCcw,
  registration: UserPlus,
  approval: CheckCircle2,
};

export function NotificationItem({
  type,
  message,
  createdAt,
  isRead,
  onClick,
  className,
}: NotificationItemProps) {
  const Icon = ICONS[type] ?? Bell;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted',
        !isRead && 'bg-primary/5',
        className,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-foreground">{message}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatRelativeTime(createdAt)}
        </span>
      </span>
      {!isRead ? (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
      ) : null}
    </button>
  );
}
