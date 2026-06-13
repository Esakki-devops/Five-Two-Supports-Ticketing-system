import type { AppModule } from '../../core/registry/types';
import { dashboardRouter } from './dashboard.routes';

export const dashboardModule: AppModule = {
  name: 'dashboard',
  basePath: '/dashboard',
  router: dashboardRouter,
};
