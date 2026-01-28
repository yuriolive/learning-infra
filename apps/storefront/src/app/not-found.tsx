import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="mb-4 text-4xl font-bold">Store Not Found</h1>
      <p className="mb-8 text-lg text-gray-600">
        The store you&apos;re looking for doesn&apos;t exist or has been
        removed.
      </p>
      <Link
        href="https://vendin.store"
        className="rounded bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
      >
        Back to Home
      </Link>
    </div>
  );
}
