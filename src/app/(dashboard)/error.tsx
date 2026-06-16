"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// =============================================================================
// Global error boundary — catches unhandled errors in the dashboard route tree
// =============================================================================

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-900">Something went wrong</h2>
        <p className="text-sm text-slate-500 mt-2">
          An unexpected error occurred while loading this page. Please try again.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-4 text-left text-xs bg-slate-50 p-3 rounded-lg overflow-x-auto text-red-600">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm
                     rounded-lg py-2.5 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
