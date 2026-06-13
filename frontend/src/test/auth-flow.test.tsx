import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/features/auth/pages/LoginPage';
import { useAuthStore } from '@/stores/auth';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('login flow', () => {
  it('signs in and navigates to the dashboard', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          user: { id: '1', name: 'Eng', email: 'e@x.com', role: 'engineer', status: 'active' },
          accessToken: 'tok',
        },
      }),
    );

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'e@x.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Dashboard page')).toBeInTheDocument());
    expect(useAuthStore.getState().status).toBe('authenticated');
  });

  it('surfaces a server error on invalid credentials', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password.' } },
        401,
      ),
    );

    renderLogin();
    await user.type(screen.getByLabelText(/email/i), 'e@x.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByText('Invalid email or password.')).toBeInTheDocument());
    expect(useAuthStore.getState().status).toBe('unauthenticated');
  });
});
