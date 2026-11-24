'use client';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  message = 'Could not load content. Check your connection.',
  onRetry,
}: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 my-3">
      <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-red-600 underline font-medium hover:text-red-800"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
}
