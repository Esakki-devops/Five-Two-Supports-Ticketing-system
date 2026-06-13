import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsPage from '@/features/notifications/pages/NotificationsPage';

function notif(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    type: 'comment',
    message: 'New comment on ticket TKT-1.',
    ticket: { id: 't1', ticketNumber: 'TKT-1', title: 'Printer' },
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function listResponse(notifications: unknown[], unreadCount: number): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data: { notifications, unreadCount },
      meta: {
        pagination: {
          page: 1,
          limit: 20,
          total: notifications.length,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

function ok(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/notifications']}>
        <Routes>
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/tickets/:id" element={<div>ticket-detail</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('notifications page', () => {
  it('marks a notification read and navigates to its ticket', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/notifications/n1/read')) return Promise.resolve(ok({ message: 'ok' }));
      return Promise.resolve(listResponse([notif()], 1));
    });

    renderPage();
    await waitFor(() =>
      expect(screen.getByText('New comment on ticket TKT-1.')).toBeInTheDocument(),
    );

    await user.click(screen.getByText('New comment on ticket TKT-1.'));

    await waitFor(() => expect(screen.getByText('ticket-detail')).toBeInTheDocument());
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u).includes('/notifications/n1/read') && i?.method === 'PATCH',
        ),
      ).toBe(true),
    );
  });

  it('marks all notifications read', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/notifications/read-all')) return Promise.resolve(ok({ updated: 1 }));
      return Promise.resolve(listResponse([notif()], 1));
    });

    renderPage();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /mark all read/i })).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: /mark all read/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u).includes('/notifications/read-all') && i?.method === 'PATCH',
        ),
      ).toBe(true),
    );
  });
});
