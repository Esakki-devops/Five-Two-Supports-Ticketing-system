import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/design-system';

export default function PendingApprovalPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Clock className="h-6 w-6" />
        </div>
        <CardTitle>Account pending approval</CardTitle>
        <CardDescription>Your registration is awaiting review by the IT team.</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground">
          You will receive an email as soon as your account is approved. After that, you can sign in
          and start raising tickets.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
