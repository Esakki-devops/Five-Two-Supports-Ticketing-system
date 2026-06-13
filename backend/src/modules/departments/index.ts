import type { AppModule } from '../../core/registry/types';
import { departmentRouter } from './department.routes';

export const departmentsModule: AppModule = {
  name: 'departments',
  basePath: '/departments',
  router: departmentRouter,
};
