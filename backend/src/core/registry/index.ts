import type { Express } from 'express';
import { config } from '../config/index';
import { logger } from '../logger/index';
import type { AppModule } from './types';

/** Mount every module's router (root modules at '/', feature modules under the API prefix). */
export function registerModules(app: Express, modules: AppModule[]): void {
  for (const mod of modules) {
    const base = mod.root ? mod.basePath || '/' : `${config.http.apiPrefix}${mod.basePath}`;
    app.use(base, mod.router);
    logger.debug({ module: mod.name, base }, 'Mounted module');
  }
}

/** Run each module's optional async initializer (event subscriptions, warmups, …). */
export async function initModules(modules: AppModule[]): Promise<void> {
  for (const mod of modules) {
    if (mod.init) await mod.init();
  }
}
