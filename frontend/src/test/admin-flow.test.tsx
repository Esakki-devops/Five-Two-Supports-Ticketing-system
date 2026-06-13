import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DepartmentsPage from '@/features/departments/pages/DepartmentsPage';

function ok(data: unknown, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DepartmentsPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('departments admin', () => {
  it('creates a department through the dialog', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';
      if (url.includes('/departments') && method === 'POST') {
        return Promise.resolve(
          ok({ department: { id: 'd1', name: 'Finance', isActive: true } }, 201),
        );
      }
      return Promise.resolve(ok({ departments: [] }));
    });

    renderPage();

    const [addDepartmentButton] = screen.getAllByRole('button', { name: /add department/i });
    await user.click(addDepartmentButton as HTMLElement);

    const nameInput = await screen.findByLabelText(/name/i);
    await user.type(nameInput, 'Finance');

    await user.click(screen.getByRole('button', { name: /create department/i }));

    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, i]) => String(u).includes('/departments') && i?.method === 'POST',
        ),
      ).toBe(true),
    );
  });
});
