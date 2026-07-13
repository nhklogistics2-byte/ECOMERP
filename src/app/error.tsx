'use client';

import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useEffect } from 'react';

/**
 * Next.js App Router error boundary.
 * Catches any unhandled errors in the route and shows a friendly fallback
 * instead of the scary "Application error: a client-side exception has occurred".
 *
 * https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error so it shows up in the browser console / Vercel logs
    console.error('Route error caught by error.tsx:', error);
  }, [error]);

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleRetry = () => {
    reset();
    // Also reload to clear any stale client state
    setTimeout(() => window.location.reload(), 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-lg p-6 text-center space-y-4">
        <div className="size-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="size-7" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Page failed to load</h1>
          <p className="text-sm text-gray-500 mt-1">
            This page encountered an error while loading. This is often temporary —
            the server may be starting up or a data source may be unavailable.
          </p>
        </div>

        {error?.message && (
          <details className="text-left bg-gray-50 rounded-md p-3 text-[11px] text-gray-600">
            <summary className="cursor-pointer font-medium text-gray-700">
              Error details
            </summary>
            <pre className="mt-1 whitespace-pre-wrap break-all font-mono">
              {error.message}
            </pre>
            {error.digest && (
              <p className="mt-1 text-gray-400">Digest: {error.digest}</p>
            )}
          </details>
        )}

        <div className="flex gap-2 justify-center">
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            <RefreshCw className="size-4" />
            Try again
          </button>
          <button
            onClick={handleGoHome}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            <Home className="size-4" />
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
