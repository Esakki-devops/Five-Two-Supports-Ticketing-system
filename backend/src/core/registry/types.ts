import type { Router } from 'express';

/**
 * A self-contained feature module. Adding a feature means creating a module and
 * registering it here — never editing existing modules. Cross-module behavior
 * goes through services and the domain event bus, not direct imports.
 */
export interface AppModule {
  /** Stable identifier for logging/diagnostics. */
  name: string;
  /** Path appended to the API prefix (e.g. '/tickets'); '' for the prefix root. */
  basePath: string;
  /** The module's Express router. */
  router: Router;
  /** When true, mount at the server root (e.g. '/health') instead of under the API prefix. */
  root?: boolean;
  /** Optional async initialization run once at boot (e.g. event subscriptions). */
  init?: () => void | Promise<void>;
}
