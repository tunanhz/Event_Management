/**
 * In-memory MongoDB lifecycle shared by every integration suite.
 *
 * Each suite gets its own mongod instance (Jest isolates module registries per
 * file), so suites can run in parallel without colliding on collection state.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as databaseModule from '../../config/database';

let mongod: MongoMemoryServer | null = null;

/**
 * Boot mongod and connect mongoose. Call from `beforeAll`.
 *
 * `config/database` exports a mutable `isDbConnected` flag that the user
 * repository/service branch on: when it is false they serve an in-RAM mock
 * store instead of touching Mongo. Tests bypass `connectDatabase()` (they dial
 * the ephemeral server directly), so the flag would stay false and the suites
 * would silently exercise the mock branch rather than the real persistence
 * code. Flipping it here keeps the integration tests honest.
 */
export async function connectInMemoryDatabase(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'event_management_test' });
  (databaseModule as { isDbConnected: boolean }).isDbConnected = true;
}

/** Drop every document but keep indexes — cheaper than recreating the db. */
export async function clearDatabase(): Promise<void> {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

/** Disconnect and stop mongod. Call from `afterAll` or handles leak. */
export async function closeInMemoryDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  (databaseModule as { isDbConnected: boolean }).isDbConnected = false;
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
