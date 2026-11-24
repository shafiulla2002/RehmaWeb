'use client';

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-gray-100 rounded mb-2"
          style={{ width: `${80 - i * 15}%` }}
        />
      ))}
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
