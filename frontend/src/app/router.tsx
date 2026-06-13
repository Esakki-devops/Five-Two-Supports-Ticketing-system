import { Suspense, lazy, type ComponentType, type ReactElement } from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import { RequireAuth, RequireGuest, RequireRole } from '@/app/guards';
import { AppShell } from '@/app/layouts/AppShell';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { RouteError } from '@/app/RouteError';
import { PageSpinner } from '@/components/Spinner';
import { Role } from '@/types';

const lazyEl = (factory: () => Promise<{ default: ComponentType }>): ReactElement => {
  const Component = lazy(factory);
  return (
    <Suspense fallback={<PageSpinner />}>
      <Component />
    </Suspense>
  );
};

export const router = createBrowserRouter([
  {
    errorElement: <RouteError />,
    children: [
      // ── Guest-only (auth screens) ──
      {
        element: <RequireGuest />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: '/login', element: lazyEl(() => import('@/features/auth/pages/LoginPage')) },
              {
                path: '/register',
                element: lazyEl(() => import('@/features/auth/pages/RegisterPage')),
              },
              {
                path: '/forgot-password',
                element: lazyEl(() => import('@/features/auth/pages/ForgotPasswordPage')),
              },
              {
                path: '/reset-password',
                element: lazyEl(() => import('@/features/auth/pages/ResetPasswordPage')),
              },
              {
                path: '/pending-approval',
                element: lazyEl(() => import('@/features/auth/pages/PendingApprovalPage')),
              },
            ],
          },
        ],
      },

      // ── Authenticated app ──
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: '/dashboard',
                element: lazyEl(() => import('@/features/dashboard/pages/DashboardPage')),
              },
              {
                path: '/tickets',
                element: lazyEl(() => import('@/features/tickets/pages/TicketsPage')),
              },
              {
                path: '/tickets/new',
                element: lazyEl(() => import('@/features/tickets/pages/NewTicketPage')),
              },
              {
                path: '/tickets/:id',
                element: lazyEl(() => import('@/features/tickets/pages/TicketDetailPage')),
              },
              {
                path: '/notifications',
                element: lazyEl(() => import('@/features/notifications/pages/NotificationsPage')),
              },
              {
                path: '/profile',
                element: lazyEl(() => import('@/features/profile/pages/ProfilePage')),
              },

              // ── Engineer/admin only ──
              {
                element: <RequireRole role={Role.Engineer} />,
                children: [
                  {
                    path: '/admin/users',
                    element: lazyEl(() => import('@/features/users/pages/UsersPage')),
                  },
                  {
                    path: '/admin/departments',
                    element: lazyEl(() => import('@/features/departments/pages/DepartmentsPage')),
                  },
                  {
                    path: '/admin/categories',
                    element: lazyEl(() => import('@/features/categories/pages/CategoriesPage')),
                  },
                  {
                    path: '/reports',
                    element: lazyEl(() => import('@/features/reports/pages/ReportsPage')),
                  },
                ],
              },
            ],
          },
        ],
      },

      { path: '*', element: lazyEl(() => import('@/features/misc/NotFoundPage')) },
    ],
  },
]);
