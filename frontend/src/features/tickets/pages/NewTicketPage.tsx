import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  FormField,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import { useAuthStore } from '@/stores/auth';
import { Role } from '@/types';
import { usePublicDepartments } from '@/features/departments/api';
import { usePublicCategories } from '@/features/categories/api';
import { useUsers } from '@/features/users/api';
import { useCreateTicket, type CreateTicketInput } from '../api';
import { createTicketSchema, type CreateTicketForm } from '../schemas';

export default function NewTicketPage() {
  const navigate = useNavigate();
  const isEngineer = useAuthStore((s) => s.user?.role) === Role.Engineer;
  const createTicket = useCreateTicket();
  const { data: departments } = usePublicDepartments();
  const { data: categories } = usePublicCategories();
  const { data: employees } = useUsers(
    { role: 'employee', status: 'active', limit: 100 },
    { enabled: isEngineer },
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateTicketForm>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: '',
      description: '',
      department: '',
      category: '',
      priority: 'medium',
      mode: 'self',
      requester: '',
    },
  });

  const mode = watch('mode');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const input: CreateTicketInput = {
      title: values.title,
      description: values.description,
      department: values.department,
      category: values.category,
      priority: values.priority,
      ...(isEngineer && values.mode === 'onBehalf' && values.requester
        ? { requester: values.requester }
        : {}),
      ...(isEngineer && values.mode === 'internal' ? { isInternal: true } : {}),
    };
    try {
      const result = await createTicket.mutateAsync(input);
      navigate(`/tickets/${result.ticket.id}`);
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="New ticket" description="Describe the issue and we'll route it." />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formError ? <Alert variant="error">{formError}</Alert> : null}

            {isEngineer ? (
              <FormField label="Raise as">
                <Controller
                  control={control}
                  name="mode"
                  render={({ field }) => (
                    <Tabs value={field.value} onValueChange={field.onChange}>
                      <TabsList>
                        <TabsTrigger value="self">Myself</TabsTrigger>
                        <TabsTrigger value="onBehalf">On behalf of</TabsTrigger>
                        <TabsTrigger value="internal">Internal</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                />
              </FormField>
            ) : null}

            {isEngineer && mode === 'onBehalf' ? (
              <FormField
                htmlFor="requester"
                label="Requester"
                error={errors.requester?.message}
                required
              >
                <Controller
                  control={control}
                  name="requester"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="requester">
                        <SelectValue placeholder="Select an employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.items.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} · {u.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            ) : null}

            <FormField htmlFor="title" label="Title" error={errors.title?.message} required>
              <Input id="title" aria-invalid={Boolean(errors.title)} {...register('title')} />
            </FormField>

            <FormField
              htmlFor="description"
              label="Description"
              error={errors.description?.message}
              required
            >
              <Textarea
                id="description"
                rows={5}
                aria-invalid={Boolean(errors.description)}
                {...register('description')}
              />
            </FormField>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                htmlFor="department"
                label="Department"
                error={errors.department?.message}
                required
              >
                <Controller
                  control={control}
                  name="department"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField
                htmlFor="category"
                label="Category"
                error={errors.category?.message}
                required
              >
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <FormField
              htmlFor="priority"
              label="Priority"
              error={errors.priority?.message}
              required
            >
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={createTicket.isPending}>
                Create ticket
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
