import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth, RequireGuest, RequireRole } from '@/app/guards';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuthStore } from '@/stores/auth';
import { Role, type User } from '@/types';

const engineer: User = {
  id: '1',
  name: 'Eng',
  email: 'e@x.com',
  role: Role.Engineer,
  status: 'active',
};
const employee: User = {
  id: '2',
  name: 'Emp',
  email: 'emp@x.com',
  role: Role.Employee,
  status: 'active',
};

beforeEach(() => {
  useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null });
});

describe('route guards', () => {
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/dashboard" element={<div>Protected content</div>} />
            <Route element={<RequireRole role={Role.Engineer} />}>
              <Route path="/admin/users" element={<div>Admin area</div>} />
            </Route>
          </Route>
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<div>Login screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it('redirects unauthenticated users to /login', () => {
    renderAt('/dashboard');
    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('renders protected content when authenticated', () => {
    useAuthStore.setState({ status: 'authenticated', user: engineer, accessToken: 't' });
    renderAt('/dashboard');
    expect(screen.getByText('Protected content')).toBeInTheDocument();
  });

  it('blocks employees from engineer-only routes', () => {
    useAuthStore.setState({ status: 'authenticated', user: employee, accessToken: 't' });
    renderAt('/admin/users');
    expect(screen.getByText('Protected content')).toBeInTheDocument(); // redirected to /dashboard
    expect(screen.queryByText('Admin area')).not.toBeInTheDocument();
  });

  it('redirects authenticated users away from guest-only routes', () => {
    useAuthStore.setState({ status: 'authenticated', user: engineer, accessToken: 't' });
    renderAt('/login');
    expect(screen.getByText('Protected content')).toBeInTheDocument(); // redirected to /dashboard
  });
});

describe('theme toggle', () => {
  it('flips the data-theme attribute', () => {
    render(<ThemeToggle />);
    const before = document.documentElement.getAttribute('data-theme');
    fireEvent.click(screen.getByLabelText(/toggle theme/i));
    expect(document.documentElement.getAttribute('data-theme')).not.toBe(before);
  });
});
