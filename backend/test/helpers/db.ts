import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mem: MongoMemoryServer | undefined;

/** Spin up an isolated in-memory MongoDB and connect the default Mongoose connection. */
export async function setupTestDb(): Promise<void> {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri('ticketing_test'));
}

export async function teardownTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (mem) await mem.stop();
}

/** Wipe all collections between tests (keeps indexes). */
export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}
