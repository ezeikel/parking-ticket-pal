const TicketsLoading = () => (
  <div className="min-h-screen bg-light">
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-white" />
        <div className="h-10 w-28 animate-pulse rounded-lg bg-white" />
      </div>

      {/* Filter bar skeleton */}
      <div className="mt-6 flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-28 animate-pulse rounded-lg bg-white"
          />
        ))}
      </div>

      {/* Ticket list skeleton */}
      <div className="mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  </div>
);

export default TicketsLoading;
