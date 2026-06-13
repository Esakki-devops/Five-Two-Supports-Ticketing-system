import { Toaster as SonnerToaster, toast } from 'sonner';
import { useThemeStore } from '@/stores/theme';

export { toast };

/** App-wide toast host. Themed + token-styled. Mount once near the root. */
export function Toaster() {
  const theme = useThemeStore((s) => s.theme);
  return (
    <SonnerToaster
      theme={theme}
      position="top-right"
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border bg-surface text-foreground shadow-lg',
          title: 'text-sm font-medium',
          description: 'text-sm text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          error: 'border-danger/40',
          success: 'border-success/40',
        },
      }}
    />
  );
}
