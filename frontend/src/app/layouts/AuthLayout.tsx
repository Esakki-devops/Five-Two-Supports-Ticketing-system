import { Outlet } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';

export function AuthLayout() {
  return (
     <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 items-center justify-between px-6">
        <span className="font-display text-base font-semibold tracking-tight">
          Five Two <span className="text-primary">Supports</span>
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </main>
      <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Five Two Supports · Internal Ticketing . 022
      </footer>
    </div>
  );
}
