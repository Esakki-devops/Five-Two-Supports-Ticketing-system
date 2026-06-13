import { Readable } from 'node:stream';
import type { StorageService } from './storage-service';

/**
 * In-memory storage for development/tests. Single-process only (the API and worker
 * do not share it) — use the S3 driver for anything multi-process or persistent.
 */
export class MemoryStorage implements StorageService {
  private readonly store = new Map<string, { body: Buffer; contentType: string }>();

  async ensureBucket(): Promise<void> {
    /* no-op */
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    this.store.set(key, { body: Buffer.from(body), contentType });
  }

  async getSignedUrl(key: string): Promise<string> {
    return `memory://${key}`;
  }

  async getStream(key: string): Promise<Readable> {
    const entry = this.store.get(key);
    if (!entry) throw new Error(`Object not found: ${key}`);
    return Readable.from(entry.body);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async ping(): Promise<boolean> {
    return true;
  }
}
