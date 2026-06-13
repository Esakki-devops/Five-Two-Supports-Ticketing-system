import type { Readable } from 'node:stream';

/** S3-compatible object storage abstraction (MinIO today, AWS S3 later — config only). */
export interface StorageService {
  /** Create the bucket if it does not exist (no-op for in-memory). */
  ensureBucket(): Promise<void>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  ping(): Promise<boolean>;
}
