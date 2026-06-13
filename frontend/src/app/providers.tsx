import { type ReactNode, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/design-system/primitives/Tooltip';
import { Toaster } from '@/design-system/primitives/Toast';

/** Global app providers (query client, tooltips, toasts). Grows in later phases. */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
