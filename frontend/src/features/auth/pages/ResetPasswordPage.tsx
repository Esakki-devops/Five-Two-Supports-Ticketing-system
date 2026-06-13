import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  toast,
} from '@/design-system';
import { applyApiError } from '@/lib/api/form-errors';
import { useResetPassword } from '../api';
import { resetPasswordSchema, type ResetPasswordInput } from '../schemas';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const reset = useResetPassword();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await reset.mutateAsync({ token, password: values.password });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(applyApiError(err, setError));
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!token ? (
          <div className="space-y-4">
            <Alert variant="error">This password reset link is invalid or has expired.</Alert>
            <Link
              to="/forgot-password"
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {formError ? <Alert variant="error">{formError}</Alert> : null}
            <FormField
              htmlFor="password"
              label="New password"
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
              htmlFor="confirmPassword"
              label="Confirm password"
              error={errors.confirmPassword?.message}
              required
            >
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={Boolean(errors.confirmPassword)}
                {...register('confirmPassword')}
              />
            </FormField>
            <Button type="submit" className="w-full" loading={reset.isPending}>
              Update password
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
