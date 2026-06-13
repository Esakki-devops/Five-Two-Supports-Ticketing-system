import { connectMongo, disconnectMongo, pingMongo } from '../core/db/mongoose';
import { logger } from '../core/logger/index';

/** Standalone MongoDB connectivity check: connect → ping → disconnect. */
async function main(): Promise<void> {
  await connectMongo();
  const ok = await pingMongo();
  logger.info({ ok }, ok ? 'MongoDB reachable ✅' : 'MongoDB ping failed ❌');
  await disconnectMongo();
  process.exit(ok ? 0 : 1);
}

main().catch((err: unknown) => {
  logger.fatal(
    { err: err instanceof Error ? err.message : err },
    'MongoDB connectivity check failed',
  );
  process.exit(1);
});
