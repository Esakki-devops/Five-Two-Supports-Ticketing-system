import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus, Tags } from 'lucide-react';
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
  FilterBar,
  FormField,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  toast,
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import { usePublicDepartments } from '@/features/departments/api';
import type { Category } from '@/types';
import { useCategories, useCreateCategory, useUpdateCategory } from '../api';

const NONE = '__none';

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  department: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function departmentId(category: Category): string {
  return typeof category.department === 'object' && category.department
    ? category.department.id
    : NONE;
}
function departmentLabel(category: Category): string {
  return typeof category.department === 'object' && category.department
    ? category.department.name
    : 'All departments';
}

function CategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
}) {
  const isEdit = Boolean(category);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const { data: departments } = usePublicDepartments();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: { name: category?.name ?? '', department: category ? departmentId(category) : NONE },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const departmentValue =
      values.department && values.department !== NONE ? values.department : null;
    try {
      if (category) {
        await updateCategory.mutateAsync({
          id: category.id,
          name: values.name,
          department: departmentValue,
        });
        toast.success('Category updated');
      } else {
        await createCategory.mutateAsync({
          name: values.name,
          ...(departmentValue ? { department: departmentValue } : {}),
        });
        toast.success('Category created');
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
          <DialogTitle>{isEdit ? 'Edit category' : 'Add category'}</DialogTitle>
          <DialogDescription>
            Categories classify tickets. Leave the department unset to make it available everywhere.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <FormField htmlFor="c-name" label="Name" error={errors.name?.message} required>
            <Input id="c-name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          </FormField>
          <FormField htmlFor="c-dept" label="Department" error={errors.department?.message}>
            <Controller
              control={control}
              name="department"
              render={({ field }) => (
                <Select value={field.value || NONE} onValueChange={field.onChange}>
                  <SelectTrigger id="c-dept">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>All departments</SelectItem>
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={createCategory.isPending || updateCategory.isPending}>
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ActiveSwitch({ category }: { category: Category }) {
  const update = useUpdateCategory();
  return (
    <Switch
      checked={category.isActive}
      disabled={update.isPending}
      aria-label={`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}`}
      onCheckedChange={(checked) =>
        update.mutate(
          { id: category.id, isActive: checked },
          { onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed') },
        )
      }
    />
  );
}

export default function CategoriesPage() {
  const { data: departments } = usePublicDepartments();
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const { data, isLoading, isError, refetch } = useCategories(
    departmentFilter === 'all' ? undefined : departmentFilter,
    true,
  );
  const categories = data ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    setDialogOpen(true);
  };

  const columns: Column<Category>[] = [
    { key: 'name', header: 'Name', className: 'font-medium', render: (c) => c.name },
    {
      key: 'department',
      header: 'Department',
      render: (c) => <span className="text-muted-foreground">{departmentLabel(c)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (
        <Badge variant={c.isActive ? 'success' : 'muted'}>
          {c.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <div className="flex items-center justify-end gap-3">
          <ActiveSwitch category={c} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Edit ${c.name}`}
            onClick={() => openEdit(c)}
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
        title="Categories"
        description="Classify tickets so they reach the right queue."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        }
      />

      <FilterBar>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments?.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {isError ? (
        <EmptyState
          icon={Tags}
          title="Couldn't load categories"
          description="Something went wrong while fetching categories."
          action={
            <Button variant="outline" onClick={() => void refetch()}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          rowKey={(c) => c.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={Tags}
              title="No categories yet"
              description="Create a category to classify incoming tickets."
              action={
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Add category
                </Button>
              }
            />
          }
        />
      )}

      <CategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} category={editing} />
    </div>
  );
}
