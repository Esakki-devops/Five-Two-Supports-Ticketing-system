export function PageStub({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
      <h1 className="font-display text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted-foreground">{description ?? 'Coming in a later phase.'}</p>
    </div>
  );
}
