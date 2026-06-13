import type { AppModule } from '../../core/registry/types';
import { ticketRouter } from './ticket.routes';

export const ticketsModule: AppModule = {
  name: 'tickets',
  basePath: '/tickets',
  router: ticketRouter,
};
