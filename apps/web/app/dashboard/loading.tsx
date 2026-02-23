const DashboardLoading = () => (
  <div className="min-h-screen bg-light">
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-40 animate-pulse rounded-lg bg-white" />
          <div className="mt-2 h-4 w-56 animate-pulse rounded bg-white" />
        </div>
        <div className="h-11 w-44 animate-pulse rounded-lg bg-white" />
      </div>

      {/* Stats cards skeleton */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>

      {/* Tickets & Map skeleton */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className="h-[600px] animate-pulse rounded-2xl bg-white" />
        <div className="h-[600px] animate-pulse rounded-2xl bg-white" />
      </div>

      {/* Analytics skeleton */}
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  </div>
);

export default DashboardLoading;
