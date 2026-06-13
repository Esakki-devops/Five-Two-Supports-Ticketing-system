import type { AppModule } from '../../core/registry/types';
import { exportRouter } from './export.routes';

export const exportModule: AppModule = {
  name: 'export',
  basePath: '/export',
  router: exportRouter,
};
