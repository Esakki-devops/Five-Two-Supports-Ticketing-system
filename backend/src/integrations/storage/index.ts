import { config } from '../../core/config/index';
import type { StorageService } from './storage-service';
import { MemoryStorage } from './memory-storage';

let storagePromise: Promise<StorageService> | undefined;

/**
 * Lazily resolves the storage driver. The S3 driver (and the AWS SDK) is only
 * imported when selected, so dev/test (in-memory) never loads it.
 */
export function getStorage(): Promise<StorageService> {
  if (!storagePromise) {
    storagePromise = (async (): Promise<StorageService> => {
      if (config.storage.driver === 's3') {
        const { S3Storage } = await import('./s3-storage');
        return new S3Storage();
      }
      return new MemoryStorage();
    })();
  }
  return storagePromise;
}

export async function pingStorage(): Promise<boolean> {
  try {
    return await (await getStorage()).ping();
  } catch {
    return false;
  }
}

export type { StorageService } from './storage-service';
