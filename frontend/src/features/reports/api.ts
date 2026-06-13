import { downloadFile } from '@/lib/api/client';

export type ExportFormat = 'csv' | 'xlsx';

/** Engineer-only: download the full ticket export as CSV or Excel. */
export function exportTickets(format: ExportFormat): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10);
  return downloadFile(`/export?format=${format}`, `tickets-${stamp}.${format}`);
}
