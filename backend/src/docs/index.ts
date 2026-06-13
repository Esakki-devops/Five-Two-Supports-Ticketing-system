import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { AppModule } from '../core/registry/types';
import { openapiDocument } from './openapi';

const docsRouter: Router = Router();

// Swagger UI relies on inline styles/scripts — relax CSP for the /docs subtree only.
docsRouter.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:",
  );
  next();
});

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(openapiDocument);
});

docsRouter.use(swaggerUi.serve);
docsRouter.get(
  '/',
  swaggerUi.setup(openapiDocument as unknown as Parameters<typeof swaggerUi.setup>[0], {
    customSiteTitle: 'Five Two Ticketing API',
  }),
);

export const docsModule: AppModule = {
  name: 'docs',
  basePath: '/docs',
  root: true,
  router: docsRouter,
};
