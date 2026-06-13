import { type ReactNode } from 'react';
import { Label } from '@/design-system/primitives/Label';
import { cn } from '@/lib/utils/cn';

interface FormFieldProps {
  /** id of the control this field labels (wire the same id onto your input). */
  htmlFor?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  htmlFor,
  label,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <Label htmlFor={htmlFor}>
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-0.5 text-danger">
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      {children}
      {description && !error ? (
        <p
          id={htmlFor ? `${htmlFor}-description` : undefined}
          className="text-xs text-muted-foreground"
        >
          {description}
        </p>
      ) : null}
      {error ? (
        <p
          id={htmlFor ? `${htmlFor}-error` : undefined}
          role="alert"
          className="text-xs font-medium text-danger"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
