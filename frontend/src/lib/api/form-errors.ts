import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api/client';

interface FieldDetail {
  path?: string;
  message?: string;
}

/**
 * Maps a thrown ApiError onto a form: 422 validation details become per-field
 * errors; anything else is returned as a form-level message (or null if fields
 * were set).
 */
export function applyApiError<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (error instanceof ApiError) {
    if (error.status === 422 && Array.isArray(error.details)) {
      let applied = false;
      for (const detail of error.details as FieldDetail[]) {
        if (detail.path && detail.message) {
          setError(detail.path as Path<T>, { message: detail.message });
          applied = true;
        }
      }
      if (applied) return null;
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}
