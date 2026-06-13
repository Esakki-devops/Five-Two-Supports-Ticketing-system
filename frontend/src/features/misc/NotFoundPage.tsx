import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      <div>
        <p className="font-display text-5xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">The page you’re looking for doesn’t exist.</p>
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
