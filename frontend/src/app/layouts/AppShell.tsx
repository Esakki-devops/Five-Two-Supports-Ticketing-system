import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/stores/auth';
import { logout } from '@/lib/auth/session';
import { navItemsForRole } from '@/app/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SocketManager } from '@/app/SocketManager';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';

function Brand() {
  return (
    <span className="font-display text-base font-semibold tracking-tight">
      Five Two <span className="text-primary">Supports</span>
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const items = navItemsForRole(role);
  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials =
    (user?.name ?? '?')
      .split(' ')
      .map((p) => p[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
        className="flex items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
          {initials}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <SocketManager />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">
        <div className="flex h-16 items-center border-b border-border px-5">
          <Brand />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-neutral-950/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-5">
              <Brand />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-muted-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search tickets…"
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <div className="mx-1 h-6 w-px bg-border" />
            <UserMenu />
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-6 outline-none sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
