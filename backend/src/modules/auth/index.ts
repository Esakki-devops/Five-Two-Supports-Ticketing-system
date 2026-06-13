import type { AppModule } from '../../core/registry/types';
import { authRouter } from './auth.routes';

export const authModule: AppModule = {
  name: 'auth',
  basePath: '/auth',
  router: authRouter,
};
