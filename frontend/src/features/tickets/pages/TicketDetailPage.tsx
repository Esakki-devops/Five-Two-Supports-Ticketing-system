import { type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  AttachmentUploader,
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CommentThread,
  EmptyState,
  Label,
  PriorityBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type ThreadComment,
  toast,
} from '@/design-system';
import { useAuthStore } from '@/stores/auth';
import { Role, TicketStatus, type ActivityEntry, type RefUser } from '@/types';
import { formatDateTime, formatRelativeTime, initialsOf } from '@/lib/utils/format';
import { useUsers } from '@/features/users/api';
import {
  downloadAttachment,
  useAddComment,
  useAssignTicket,
  useTicket,
  useUpdateTicket,
  useUploadAttachments,
} from '../api';
import { STATUS_LABELS, nextStatuses } from '../transitions';

function refName(value: RefUser | string | null | undefined): string {
  if (!value) return '—';
  return typeof value === 'string' ? value : value.name;
}
function refId(value: RefUser | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.id;
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function describeAction(entry: ActivityEntry): string {
  switch (entry.action) {
    case 'created':
      return 'created this ticket';
    case 'status_changed':
      return `changed status${entry.from ? ` from ${entry.from}` : ''} to ${entry.to}`;
    case 'priority_changed':
      return `set priority to ${entry.to}`;
    case 'assigned':
      return 'assigned the ticket';
    case 'unassigned':
      return 'removed the assignee';
    case 'auto_closed':
      return 'auto-closed the ticket';
    case 'deleted':
      return 'deleted the ticket';
    default:
      return entry.action.replace(/_/g, ' ');
  }
}

function ActivityTimeline({ activity }: { activity: ActivityEntry[] }) {
  if (activity.length === 0)
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  return (
    <ul className="space-y-3">
      {[...activity].reverse().map((entry, index) => (
        <li key={index} className="flex gap-3 text-sm">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px]">
              {initialsOf(refName(entry.actor))}
            </AvatarFallback>
          </Avatar>
          <div>
            <p>
              <span className="font-medium">{refName(entry.actor)}</span>{' '}
              <span className="text-muted-foreground">{describeAction(entry)}</span>
            </p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(entry.at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function TicketDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isEngineer = currentUser?.role === Role.Engineer;

  const { data: ticket, isLoading, isError } = useTicket(id);
  const updateTicket = useUpdateTicket(id);
  const assignTicket = useAssignTicket(id);
  const addComment = useAddComment(id);
  const uploadAttachments = useUploadAttachments(id);
  const { data: engineers } = useUsers(
    { role: 'engineer', status: 'active', limit: 100 },
    { enabled: isEngineer },
  );

  const onError = (err: unknown) =>
    toast.error(err instanceof Error ? err.message : 'Something went wrong');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <EmptyState
        title="Ticket not found"
        description="This ticket may have been removed, or you don't have access to it."
        action={
          <Button variant="outline" onClick={() => navigate('/tickets')}>
            Back to tickets
          </Button>
        }
      />
    );
  }

  const status = ticket.status;
  const isOwnTicket = currentUser?.id !== undefined && refId(ticket.requester) === currentUser.id;
  const comments: ThreadComment[] = (ticket.comments ?? []).map((c) => ({
    id: c._id,
    authorName: refName(c.author),
    body: c.body,
    createdAt: c.createdAt,
    isMine: typeof c.author === 'object' && c.author?.id === currentUser?.id,
  }));

  const changeStatus = (next: string) => updateTicket.mutate({ status: next }, { onError });
  const changeAssignee = (value: string) =>
    assignTicket.mutate(value === '__unassigned' ? null : value, { onError });
  const changePriority = (value: string) => updateTicket.mutate({ priority: value }, { onError });
  const toggleInternal = (checked: boolean) =>
    updateTicket.mutate({ isInternal: checked }, { onError });

  const submitComment = async (body: string) => {
    try {
      await addComment.mutateAsync(body);
    } catch (err) {
      onError(err);
    }
  };

  const handleUpload = (files: File[]) =>
    uploadAttachments.mutate(files, {
      onError,
      onSuccess: () => toast.success('Attachment uploaded'),
    });

  const handleDownload = (attachmentId: string) => {
    const attachment = ticket.attachments.find((a) => a._id === attachmentId);
    if (attachment) {
      void downloadAttachment(id, attachmentId, attachment.fileName).catch(() =>
        toast.error('Download failed'),
      );
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Link
          to="/tickets"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Tickets
        </Link>
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {ticket.ticketNumber}
            {ticket.isInternal ? ' · Internal' : ''}
          </p>
          <h1 className="font-display text-2xl font-bold tracking-tight">{ticket.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
        </div>
      </div>

      {isOwnTicket && status === TicketStatus.Resolved ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm">This ticket is marked resolved. Is your issue fixed?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => changeStatus(TicketStatus.Reopened)}
                loading={updateTicket.isPending}
              >
                Reopen
              </Button>
              <Button
                onClick={() => changeStatus(TicketStatus.Closed)}
                loading={updateTicket.isPending}
              >
                Confirm &amp; close
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm">{ticket.description}</CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue="comments">
                <TabsList>
                  <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="attachments">
                    Attachments ({ticket.attachments?.length ?? 0})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="comments">
                  <CommentThread
                    comments={comments}
                    onSubmit={submitComment}
                    submitting={addComment.isPending}
                  />
                </TabsContent>
                <TabsContent value="activity">
                  <ActivityTimeline activity={ticket.activity ?? []} />
                </TabsContent>
                <TabsContent value="attachments">
                  <AttachmentUploader
                    attachments={ticket.attachments ?? []}
                    onUpload={handleUpload}
                    uploading={uploadAttachments.isPending}
                    onDownload={handleDownload}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Requester" value={refName(ticket.requester)} />
              <DetailRow
                label="Assignee"
                value={ticket.assignee ? refName(ticket.assignee) : 'Unassigned'}
              />
              <DetailRow label="Department" value={ticket.department?.name ?? '—'} />
              <DetailRow label="Category" value={ticket.category?.name ?? '—'} />
              <DetailRow label="Created" value={formatDateTime(ticket.createdAt)} />
              {ticket.resolvedAt ? (
                <DetailRow label="Resolved" value={formatDateTime(ticket.resolvedAt)} />
              ) : null}
              {ticket.closedAt ? (
                <DetailRow label="Closed" value={formatDateTime(ticket.closedAt)} />
              ) : null}
            </CardContent>
          </Card>

          {isEngineer ? (
            <Card>
              <CardHeader>
                <CardTitle>Manage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={changeStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={status} disabled>
                        {STATUS_LABELS[status]} (current)
                      </SelectItem>
                      {nextStatuses(status).map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  <Select
                    value={refId(ticket.assignee) ?? '__unassigned'}
                    onValueChange={changeAssignee}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {engineers?.items.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={ticket.priority} onValueChange={changePriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Internal ticket</p>
                    <p className="text-xs text-muted-foreground">Hidden from employees</p>
                  </div>
                  <Switch checked={ticket.isInternal} onCheckedChange={toggleInternal} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
