import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Pencil, Plus } from 'lucide-react';
import {
  Alert,
  Badge,
  Button,
  type Column,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  FormField,
  Input,
  PageHeader,
  Switch,
  toast,
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import type { Department } from '@/types';
import { useCreateDepartment, useDepartments, useUpdateDepartment } from '../api';

const schema = z.object({ name: z.string().min(1, 'Name is required').max(100) });
type FormValues = z.infer<typeof schema>;

function DepartmentDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: Department | null;
}) {
  const isEdit = Boolean(department);
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: department?.name ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      if (department) {
        await updateDepartment.mutateAsync({ id: department.id, name: values.name });
        toast.success('Department updated');
      } else {
        await createDepartment.mutateAsync({ name: values.name });
        toast.success('Department created');
      }
      onOpenChange(false);
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setFormError(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit department' : 'Add department'}</DialogTitle>
          <DialogDescription>Departments group tickets and route employees.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <FormField htmlFor="d-name" label="Name" error={errors.name?.message} required>
            <Input id="d-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createDepartment.isPending || updateDepartment.isPending}
            >
              {isEdit ? 'Save changes' : 'Create department'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveSwitch({ department }: { department: Department }) {
  const update = useUpdateDepartment();
  return (
    <Switch
      checked={department.isActive}
      disabled={update.isPending}
      aria-label={`${department.isActive ? 'Deactivate' : 'Activate'} ${department.name}`}
      onCheckedChange={(checked) =>
        update.mutate(
          { id: department.id, isActive: checked },
          { onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed') },
        )
      }
    />
  );
}

export default function DepartmentsPage() {
  const { data, isLoading, isError, refetch } = useDepartments(true);
  const departments = data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (department: Department) => {
    setEditing(department);
    setDialogOpen(true);
  };

  const columns: Column<Department>[] = [
    { key: 'name', header: 'Name', className: 'font-medium', render: (d) => d.name },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <Badge variant={d.isActive ? 'success' : 'muted'}>
          {d.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (d) => (
        <div className="flex items-center justify-end gap-3">
          <ActiveSwitch department={d} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${d.name}`}
            onClick={() => openEdit(d)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Departments"
        description="Manage the departments employees and tickets belong to."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add department
          </Button>
        }
      />

      {isError ? (
        <EmptyState
          icon={Building2}
          title="Couldn't load departments"
          description="Something went wrong while fetching departments."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={departments}
          rowKey={(d) => d.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={Building2}
              title="No departments yet"
              description="Create your first department to start routing tickets."
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add department
                </Button>
              }
            />
          }
        />
      )}

      <DepartmentDialog open={dialogOpen} onOpenChange={setDialogOpen} department={editing} />
    </div>
  );
}
