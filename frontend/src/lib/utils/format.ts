export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(diffSec)) return '';
  if (diffSec < 45) return 'just now';
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(input?: string | Date | null): string {
  if (!input) return '—';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function initialsOf(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0] ?? '')
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}
