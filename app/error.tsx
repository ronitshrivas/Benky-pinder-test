'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Unhandled application error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 bg-surface text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="font-serif text-3xl text-primary mb-3">Something went wrong</h2>
      <p className="text-text-light mb-8 max-w-md">
        We encountered an unexpected error while loading this page. We apologize for the inconvenience.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="btn-primary"
        >
          Try again
        </button>
        <Link href="/" className="btn-outline">
          Return Home
        </Link>
      </div>
    </div>
  );
}
