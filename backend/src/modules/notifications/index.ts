import type { AppModule } from '../../core/registry/types';
import { notificationRouter } from './notification.routes';

export const notificationsModule: AppModule = {
  name: 'notifications',
  basePath: '/notifications',
  router: notificationRouter,
};
