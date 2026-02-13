import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold text-ink">404</h1>
      <p className="mt-2 text-sm text-ink-secondary">Page not found</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
