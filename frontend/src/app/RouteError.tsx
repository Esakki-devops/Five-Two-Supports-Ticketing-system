import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

export function RouteError() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : undefined;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      <div>
        <p className="font-display text-5xl font-bold text-primary">{status ?? 'Error'}</p>
        <h1 className="mt-3 text-xl font-semibold">
          {status === 404 ? 'Page not found' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {status === 404
            ? "The page you're looking for doesn't exist."
            : 'Please try again or head back to your dashboard.'}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
