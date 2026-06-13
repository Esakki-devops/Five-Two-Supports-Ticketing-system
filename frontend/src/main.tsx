import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import '@fontsource-variable/inter';
import '@fontsource-variable/lexend';
import './index.css';
import { Providers } from '@/app/providers';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { SessionGate } from '@/app/SessionGate';
import { router } from '@/app/router';
import { initTheme } from '@/stores/theme';

initTheme();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <SessionGate>
          <RouterProvider router={router} />
        </SessionGate>
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
