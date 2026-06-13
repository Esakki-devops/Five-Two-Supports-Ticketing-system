import { type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center', className)}>
      {children}
    </div>
  );
}
