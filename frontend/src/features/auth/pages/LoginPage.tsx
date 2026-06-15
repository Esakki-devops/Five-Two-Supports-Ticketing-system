import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import { useLogin } from '../api';
import { loginSchema, type LoginInput } from '../schemas';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login.mutateAsync(values);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wellcome back</CardTitle>
        <CardDescription>Sign in to the Five Two Supports ticketing platform.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError ? <Alert variant="error">{formError}</Alert> : null}
          <FormField htmlFor="email" label="Email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              {...register('email')}
            />
          </FormField>
          <FormField htmlFor="password" label="Password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
          </FormField>
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" loading={login.isPending}>
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New to the platform?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
