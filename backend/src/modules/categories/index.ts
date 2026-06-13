import type { AppModule } from '../../core/registry/types';
import { categoryRouter } from './category.routes';

export const categoriesModule: AppModule = {
  name: 'categories',
  basePath: '/categories',
  router: categoryRouter,
};
