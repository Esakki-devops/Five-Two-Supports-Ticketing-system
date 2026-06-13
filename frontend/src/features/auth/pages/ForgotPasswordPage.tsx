import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
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
import { useForgotPassword } from '../api';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas';

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await forgot.mutateAsync(values);
    } catch {
      // Always show the same neutral message (don't reveal whether the account exists).
    }
    setSubmitted(true);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>We will email you a link to set a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4">
            <Alert variant="success">
              If an account exists for that email, a password reset link is on its way.
            </Alert>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField htmlFor="email" label="Email" error={errors.email?.message} required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
            </FormField>
            <Button type="submit" className="w-full" loading={forgot.isPending}>
              Send reset link
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
