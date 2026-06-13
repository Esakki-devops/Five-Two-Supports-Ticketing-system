import { type ReactNode } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Skeleton } from '@/design-system/primitives/Skeleton';
import { cn } from '@/lib/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  /** Hide this column in the mobile card view. */
  hideOnMobileCard?: boolean;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  onRowClick?: (row: T) => void;
  sort?: SortState;
  onSortChange?: (key: string) => void;
  empty?: ReactNode;
  className?: string;
}

function cellValue<T>(row: T, col: Column<T>): ReactNode {
  if (col.render) return col.render(row);
  return (row as Record<string, ReactNode>)[col.key];
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 6,
  onRowClick,
  sort,
  onSortChange,
  empty,
  className,
}: DataTableProps<T>) {
  const showEmpty = !loading && data.length === 0;
  const fallbackEmpty = (
    <p className="text-center text-sm text-muted-foreground">No results found.</p>
  );

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn('h-11 px-3 font-medium text-muted-foreground', col.headerClassName)}
                >
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        sort.dir === 'asc' ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {columns.map((col) => (
                      <td key={col.key} className="px-3 py-3">
                        <Skeleton className="h-4 w-full max-w-[160px]" />
                      </td>
                    ))}
                  </tr>
                ))
              : data.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border transition-colors last:border-0',
                      onRowClick && 'cursor-pointer hover:bg-muted/40',
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-3 py-3 align-middle', col.className)}>
                        {cellValue(row, col)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
        {showEmpty ? <div className="p-8">{empty ?? fallbackEmpty}</div> : null}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: Math.min(skeletonRows, 4) }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : showEmpty ? (
          <div className="rounded-xl border border-dashed border-border p-8">
            {empty ?? fallbackEmpty}
          </div>
        ) : (
          data.map((row) => (
            <div
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'rounded-xl border border-border bg-surface p-4',
                onRowClick && 'cursor-pointer transition-colors hover:bg-muted/40',
              )}
            >
              <dl className="space-y-1.5">
                {columns
                  .filter((col) => !col.hideOnMobileCard)
                  .map((col) => (
                    <div key={col.key} className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-medium text-muted-foreground">{col.header}</dt>
                      <dd className="text-right text-sm">{cellValue(row, col)}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
