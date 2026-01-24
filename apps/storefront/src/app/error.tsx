"use client";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">Something Went Wrong</h1>
      <p className="mb-8 text-lg text-gray-600">
        We're experiencing technical difficulties. Please try again.
      </p>
      <button
        onClick={reset}
        className="rounded bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
      >
        Retry
      </button>
    </div>
  );
}
