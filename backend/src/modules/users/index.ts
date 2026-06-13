import type { AppModule } from '../../core/registry/types';
import { userRouter } from './user.routes';

export const usersModule: AppModule = {
  name: 'users',
  basePath: '/users',
  router: userRouter,
};
