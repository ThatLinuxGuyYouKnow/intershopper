/** Static shell shown while the dashboard's link history loads. */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading">
      <section className="max-w-2xl space-y-3">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-5 w-full max-w-lg animate-pulse rounded-lg bg-slate-200" />
      </section>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}
