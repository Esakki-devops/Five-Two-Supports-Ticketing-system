import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import { usePublicDepartments } from '@/features/departments/api';
import { useRegister } from '../api';
import { registerSchema, type RegisterInput } from '../schemas';

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMut = useRegister();
  const { data: departments, isLoading: deptsLoading } = usePublicDepartments();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', department: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerMut.mutateAsync(values);
      navigate('/pending-approval', { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Register to raise and track support tickets.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <FormField htmlFor="name" label="Full name" error={errors.name?.message} required>
            <Input
              id="name"
              autoComplete="name"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
          </FormField>
          <FormField htmlFor="email" label="Work email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>
          <FormField
            htmlFor="password"
            label="Password"
            description="At least 8 characters."
            error={errors.password?.message}
            required
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>
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
                  <SelectTrigger id="department" aria-invalid={Boolean(errors.department)}>
                    <SelectValue
                      placeholder={deptsLoading ? 'Loading…' : 'Select your department'}
                    />
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
          <Button type="submit" className="w-full" loading={registerMut.isPending}>
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
