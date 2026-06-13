import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { AlertCircle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const alertVariants = cva('flex items-start gap-3 rounded-lg border p-3 text-sm', {
  variants: {
    variant: {
      error: 'border-danger/30 bg-danger/10 text-danger',
      success: 'border-success/30 bg-success/12 text-success',
      info: 'border-info/30 bg-info/10 text-info',
      warning: 'border-warning/30 bg-warning/15 text-warning',
    },
  },
  defaultVariants: { variant: 'info' },
});

type AlertVariant = NonNullable<VariantProps<typeof alertVariants>['variant']>;

const ICONS: Record<AlertVariant, LucideIcon> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
  warning: AlertCircle,
};

export interface AlertProps extends VariantProps<typeof alertVariants> {
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const Icon = ICONS[variant ?? 'info'];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
