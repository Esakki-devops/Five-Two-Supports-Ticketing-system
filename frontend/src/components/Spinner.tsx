import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin', className)} aria-hidden />;
}

export function PageSpinner() {
  return (
    <div
      className="flex min-h-[40vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-6 w-6 text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div
      className="flex min-h-screen w-full items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <Spinner className="h-8 w-8 text-primary" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
