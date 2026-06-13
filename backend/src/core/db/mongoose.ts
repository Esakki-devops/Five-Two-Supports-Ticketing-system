import mongoose from 'mongoose';
import { config } from '../config/index';
import { logger } from '../logger/index';

mongoose.set('strictQuery', true);

let registered = false;
function registerConnectionListeners(): void {
  if (registered) return;
  registered = true;
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
}

export async function connectMongo(): Promise<typeof mongoose> {
  registerConnectionListeners();
  await mongoose.connect(config.mongo.uri, {
    serverSelectionTimeoutMS: 10000, // tolerant of Atlas SRV lookup + TLS handshake
    autoIndex: !config.isProduction, // build indexes in dev/test; manage explicitly in prod
  });
  logger.info('MongoDB connected');
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}

/** Lightweight readiness probe used by GET /ready. */
export async function pingMongo(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1) return false;
    const admin = mongoose.connection.db?.admin();
    if (!admin) return false;
    await admin.ping();
    return true;
  } catch {
    return false;
  }
}
