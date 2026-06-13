import type { AppModule } from '../../core/registry/types';
import { systemRouter } from './system.routes';

/** Liveness/readiness endpoints, mounted at the server root (not under /api/v1). */
export const systemModule: AppModule = {
  name: 'system',
  basePath: '',
  root: true,
  router: systemRouter,
};
