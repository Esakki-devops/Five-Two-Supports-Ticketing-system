import { useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PageHeader,
  Skeleton,
  toast,
} from '@/design-system';
import { useDashboardSummary } from '@/features/dashboard/api';
import { STATUS_LABELS } from '@/features/tickets/transitions';
import { exportTickets, type ExportFormat } from '../api';

const STATUS_LABEL_MAP: Record<string, string> = { ...STATUS_LABELS };
const STATUS_ORDER = ['new', 'open', 'in_progress', 'on_hold', 'resolved', 'closed', 'reopened'];

function CountRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
      <span>{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

export default function ReportsPage() {
  const { data, isLoading } = useDashboardSummary();
  const [downloading, setDownloading] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    setDownloading(format);
    try {
      await exportTickets(format);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & export"
        description="Download the ticket dataset and review a summary snapshot."
      />

      <Card>
        <CardHeader>
          <CardTitle>Export tickets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => void handleExport('csv')}
            loading={downloading === 'csv'}
          >
            <FileText className="h-4 w-4" /> Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleExport('xlsx')}
            loading={downloading === 'xlsx'}
          >
            <FileSpreadsheet className="h-4 w-4" /> Export Excel
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tickets by status</CardTitle>
            </CardHeader>
            <CardContent>
              {STATUS_ORDER.filter((key) => (data.byStatus[key] ?? 0) > 0).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                STATUS_ORDER.filter((key) => (data.byStatus[key] ?? 0) > 0).map((key) => (
                  <CountRow
                    key={key}
                    label={STATUS_LABEL_MAP[key] ?? key}
                    value={data.byStatus[key] ?? 0}
                  />
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets by department</CardTitle>
            </CardHeader>
            <CardContent>
              {data.byDepartment.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets yet.</p>
              ) : (
                data.byDepartment.map((dept) => (
                  <CountRow key={dept.department} label={dept.name} value={dept.count} />
                ))
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
