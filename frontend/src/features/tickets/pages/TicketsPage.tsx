import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Ticket as TicketIcon } from 'lucide-react';
import {
  Button,
  type Column,
  DataTable,
  EmptyState,
  FilterBar,
  Input,
  PageHeader,
  Pagination,
  PriorityBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from '@/design-system';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/auth';
import { Role, type TicketSummary } from '@/types';
import { formatRelativeTime } from '@/lib/utils/format';
import { useTickets, type TicketFilters } from '../api';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export default function TicketsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const userId = useAuthStore((s) => s.user?.id);
  const isEngineer = role === Role.Engineer;

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [myQueue, setMyQueue] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);

  const filters: TicketFilters = {
    page,
    limit: 20,
    sort: '-createdAt',
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    priority: priority === 'all' ? undefined : priority,
    assignee: isEngineer && myQueue ? userId : undefined,
  };

  const { data, isLoading, isError, refetch } = useTickets(filters);
  const tickets = data?.items ?? [];
  const pagination = data?.pagination;

  const columns = useMemo<Column<TicketSummary>[]>(() => {
    const base: Column<TicketSummary>[] = [
      {
        key: 'ticketNumber',
        header: 'Ticket',
        className: 'whitespace-nowrap font-medium',
        render: (t) => t.ticketNumber,
      },
      {
        key: 'title',
        header: 'Title',
        render: (t) => (
          <span className="line-clamp-1">
            {t.title}
            {t.isInternal ? (
              <span className="ml-2 text-xs text-muted-foreground">(internal)</span>
            ) : null}
          </span>
        ),
      },
      { key: 'status', header: 'Status', render: (t) => <StatusBadge status={t.status} /> },
      {
        key: 'priority',
        header: 'Priority',
        render: (t) => <PriorityBadge priority={t.priority} />,
      },
    ];
    const engineerColumns: Column<TicketSummary>[] = [
      { key: 'requester', header: 'Requester', render: (t) => t.requester?.name ?? '—' },
      {
        key: 'assignee',
        header: 'Assignee',
        render: (t) =>
          t.assignee?.name ?? <span className="text-muted-foreground">Unassigned</span>,
      },
    ];
    const created: Column<TicketSummary> = {
      key: 'createdAt',
      header: 'Created',
      hideOnMobileCard: true,
      render: (t) => (
        <span className="text-muted-foreground">{formatRelativeTime(t.createdAt)}</span>
      ),
    };
    return isEngineer ? [...base, ...engineerColumns, created] : [...base, created];
  }, [isEngineer]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Tickets"
        description={
          isEngineer ? 'All support tickets across the organization.' : 'Your support tickets.'
        }
        actions={
          <Button onClick={() => navigate('/tickets/new')}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      <FilterBar>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priority}
          onValueChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isEngineer ? (
          <Button
            variant={myQueue ? 'primary' : 'outline'}
            onClick={() => {
              setMyQueue((v) => !v);
              setPage(1);
            }}
          >
            My queue
          </Button>
        ) : null}
      </FilterBar>

      {isError ? (
        <EmptyState
          icon={TicketIcon}
          title="Couldn't load tickets"
          description="Something went wrong while fetching tickets."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={tickets}
            rowKey={(t) => t.id}
            loading={isLoading}
            onRowClick={(t) => navigate(`/tickets/${t.id}`)}
            empty={
              <EmptyState
                icon={TicketIcon}
                title="No tickets"
                description={
                  isEngineer
                    ? 'No tickets match your filters.'
                    : "You haven't raised any tickets yet."
                }
                action={
                  <Button onClick={() => navigate('/tickets/new')}>
                    <Plus className="h-4 w-4" /> New ticket
                  </Button>
                }
              />
            }
          />
          {pagination && pagination.total > 0 ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              onPageChange={setPage}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
