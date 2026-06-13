import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TicketDetailPage from '@/features/tickets/pages/TicketDetailPage';
import { useAuthStore } from '@/stores/auth';
import { nextStatuses } from '@/features/tickets/transitions';
import { TicketStatus, type User } from '@/types';

const employee: User = {
  id: 'emp1',
  name: 'Emp',
  email: 'emp@x.com',
  role: 'employee',
  status: 'active',
};

function resolvedTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    ticketNumber: 'TKT-000001',
    title: 'Printer issue',
    description: 'No power',
    status: 'resolved',
    priority: 'high',
    isInternal: false,
    requester: { id: 'emp1', name: 'Emp', email: 'emp@x.com' },
    assignee: null,
    department: { id: 'd1', name: 'IT' },
    category: { id: 'c1', name: 'Hardware' },
    comments: [],
    activity: [],
    attachments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: new Date().toISOString(),
    closedAt: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/tickets/t1']}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/tickets" element={<div>List</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: 'authenticated', user: employee, accessToken: 'tok' });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ticket transitions', () => {
  it('offers valid next statuses', () => {
    expect(nextStatuses(TicketStatus.Resolved)).toContain(TicketStatus.Closed);
    expect(nextStatuses(TicketStatus.New)).not.toContain(TicketStatus.Reopened);
  });
});

describe('ticket detail — confirm resolution', () => {
  it('lets the requester confirm a resolved ticket (PATCH → closed)', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      if (!init || init.method === 'GET' || init.method === undefined) {
        return Promise.resolve(jsonResponse({ success: true, data: { ticket: resolvedTicket() } }));
      }
      return Promise.resolve(
        jsonResponse({ success: true, data: { ticket: resolvedTicket({ status: 'closed' }) } }),
      );
    });

    renderDetail();
    await waitFor(() => expect(screen.getByText('Printer issue')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      const patchCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
      expect(patchCall).toBeTruthy();
      expect(String(patchCall?.[1]?.body)).toContain('closed');
    });
  });
});
