import Link from "next/link";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span aria-hidden className="inline-block h-3 w-3 rotate-45 rounded-[2px] bg-rope" />
      Foothold
    </Link>
  );
}

export function Nav({ right }: { right?: React.ReactNode }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
      <Wordmark className="text-lg" />
      <nav className="flex items-center gap-3 text-sm">
        {right ?? (
          <>
            <Link href="/#how" className="hidden text-slate hover:text-granite sm:inline">
              How it works
            </Link>
            <Link href="/start" className="btn btn-rope">
              Start with your URL
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
