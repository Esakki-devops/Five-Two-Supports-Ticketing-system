import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, Plus, Search, Users as UsersIcon } from 'lucide-react';
import {
  Alert,
  Badge,
  type BadgeProps,
  Button,
  type Column,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  FilterBar,
  FormField,
  Input,
  PageHeader,
  Pagination,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@/design-system';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePublicDepartments } from '@/features/departments/api';
import { applyApiError } from '@/lib/api/form-errors';
import { formatDateTime } from '@/lib/utils/format';
import type { Role, User } from '@/types';
import {
  useApproveUser,
  useCreateUser,
  useRejectUser,
  useUpdateUserStatus,
  useUsers,
  type CreateUserInput,
  type UserFilters,
} from '../api';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'rejected', label: 'Rejected' },
];
const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'employee', label: 'Employee' },
  { value: 'engineer', label: 'Engineer' },
];

const STATUS_BADGE: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  pending: { label: 'Pending', variant: 'warning' },
  active: { label: 'Active', variant: 'success' },
  disabled: { label: 'Disabled', variant: 'muted' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

function departmentName(user: User): string {
  return typeof user.department === 'object' && user.department ? user.department.name : '—';
}

// ── Create-user dialog ──────────────────────────────────────────────────────
const createUserSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(120),
    email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['employee', 'engineer']),
    department: z.string().optional(),
  })
  .refine((data) => data.role !== 'employee' || Boolean(data.department), {
    message: 'Department is required for employees',
    path: ['department'],
  });
type CreateUserForm = z.infer<typeof createUserSchema>;

function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createUser = useCreateUser();
  const { data: departments } = usePublicDepartments();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', email: '', password: '', role: 'employee', department: '' },
  });
  const role = watch('role');

  const close = (next: boolean) => {
    if (!next) {
      reset();
      setFormError(null);
    }
    onOpenChange(next);
  };

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input: CreateUserInput = {
      name: values.name,
      email: values.email,
      password: values.password,
      role: values.role,
      ...(values.role === 'employee' && values.department ? { department: values.department } : {}),
    };
    try {
      await createUser.mutateAsync(input);
      toast.success('User created');
      close(false);
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
          <DialogDescription>
            Create an account directly. The user must reset the temporary password at first login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <FormField htmlFor="u-name" label="Name" error={errors.name?.message} required>
            <Input id="u-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField htmlFor="u-email" label="Email" error={errors.email?.message} required>
            <Input
              id="u-email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>
          <FormField
            htmlFor="u-password"
            label="Temporary password"
            error={errors.password?.message}
            required
          >
            <Input
              id="u-password"
              type="text"
              autoComplete="off"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField htmlFor="u-role" label="Role" error={errors.role?.message} required>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="u-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="engineer">Engineer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            {role === 'employee' ? (
              <FormField
                htmlFor="u-dept"
                label="Department"
                error={errors.department?.message}
                required
              >
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="u-dept">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createUser.isPending}>
              Create user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Row actions ─────────────────────────────────────────────────────────────
function RowActions({ user }: { user: User }) {
  const approve = useApproveUser();
  const reject = useRejectUser();
  const updateStatus = useUpdateUserStatus();
  const onError = (err: unknown) =>
    toast.error(err instanceof Error ? err.message : 'Action failed');

  const nextRole: Role = user.role === 'engineer' ? 'employee' : 'engineer';
  const hasActions =
    user.status === 'pending' ||
    user.status === 'rejected' ||
    user.status === 'active' ||
    user.status === 'disabled';

  if (!hasActions) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for ${user.name}`}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {user.status === 'pending' || user.status === 'rejected' ? (
          <DropdownMenuItem
            onSelect={() =>
              approve.mutate(user.id, {
                onError,
                onSuccess: () => toast.success('User approved'),
              })
            }
          >
            Approve
          </DropdownMenuItem>
        ) : null}
        {user.status === 'pending' ? (
          <DropdownMenuItem
            destructive
            onSelect={() =>
              reject.mutate(user.id, {
                onError,
                onSuccess: () => toast.success('Registration rejected'),
              })
            }
          >
            Reject
          </DropdownMenuItem>
        ) : null}
        {user.status === 'active' ? (
          <>
            <DropdownMenuItem
              onSelect={() => updateStatus.mutate({ id: user.id, role: nextRole }, { onError })}
            >
              Make {nextRole === 'engineer' ? 'engineer' : 'employee'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              destructive
              onSelect={() => updateStatus.mutate({ id: user.id, status: 'disabled' }, { onError })}
            >
              Disable account
            </DropdownMenuItem>
          </>
        ) : null}
        {user.status === 'disabled' ? (
          <DropdownMenuItem
            onSelect={() => updateStatus.mutate({ id: user.id, status: 'active' }, { onError })}
          >
            Enable account
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [role, setRole] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);

  const filters: UserFilters = {
    page,
    limit: 20,
    q: debouncedSearch || undefined,
    status: status === 'all' ? undefined : status,
    role: role === 'all' ? undefined : role,
  };
  const { data, isLoading, isError, refetch } = useUsers(filters);
  const users = data?.items ?? [];
  const pagination = data?.pagination;

  const columns = useMemo<Column<User>[]>(
    () => [
      {
        key: 'name',
        header: 'Name',
        render: (user) => (
          <div className="min-w-0">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => (
          <Badge variant={user.role === 'engineer' ? 'primary' : 'outline'}>
            {user.role === 'engineer' ? 'Engineer' : 'Employee'}
          </Badge>
        ),
      },
      { key: 'department', header: 'Department', render: departmentName },
      {
        key: 'status',
        header: 'Status',
        render: (user) => {
          const badge = STATUS_BADGE[user.status] ?? {
            label: user.status,
            variant: 'muted' as const,
          };
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        key: 'createdAt',
        header: 'Joined',
        hideOnMobileCard: true,
        render: (user) => (
          <span className="text-muted-foreground">{formatDateTime(user.createdAt)}</span>
        ),
      },
      {
        key: 'actions',
        header: '',
        className: 'w-10 text-right',
        render: (user) => <RowActions user={user} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users & approvals"
        description="Approve registrations, manage roles, and control access."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Add user
          </Button>
        }
      />

      <FilterBar>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name or email…"
            className="pl-9"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={role}
          onValueChange={(value) => {
            setRole(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <EmptyState
          icon={UsersIcon}
          title="Couldn't load users"
          description="Something went wrong while fetching users."
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
            data={users}
            rowKey={(user) => user.id}
            loading={isLoading}
            empty={
              <EmptyState
                icon={UsersIcon}
                title="No users found"
                description="No users match your filters."
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

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
