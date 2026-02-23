const TicketDetailLoading = () => (
  <div className="min-h-screen bg-light">
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* Back link skeleton */}
      <div className="h-5 w-24 animate-pulse rounded bg-white" />

      {/* Header skeleton */}
      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-white" />
          <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-full bg-white" />
      </div>

      {/* Content grid skeleton */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 animate-pulse rounded-xl bg-white" />
          <div className="h-48 animate-pulse rounded-xl bg-white" />
          <div className="h-56 animate-pulse rounded-xl bg-white" />
        </div>
        <div className="space-y-6">
          <div className="h-40 animate-pulse rounded-xl bg-white" />
          <div className="h-48 animate-pulse rounded-xl bg-white" />
          <div className="h-32 animate-pulse rounded-xl bg-white" />
        </div>
      </div>
    </div>
  </div>
);

export default TicketDetailLoading;
