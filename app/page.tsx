'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false });

export default function LandingPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-between overflow-hidden bg-background p-6 text-foreground">
      <div className="z-10 max-w-xl space-y-6">
        <h1 className="text-5xl font-bold leading-tight">
          Search that feels like a{' '}
          <span className="bg-gradient-to-r from-[#14b8a6] to-white bg-clip-text text-transparent">
            conversation
          </span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Autonomous agents entry fit, dedupe, enrich contacts, and score likelihood—so you get a list you can actually use.
        </p>
        <Link
          href="/chat"
          className="inline-block rounded-md bg-primary px-5 py-2 text-lg font-medium text-primary-foreground hover:opacity-90"
        >
          Try Demo
        </Link>
      </div>
      <div className="pointer-events-none absolute right-0 top-1/2 h-[400px] w-1/2 -translate-y-1/2">
        <Spline scene="/spline/landing.splinecode" />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-full bg-gradient-to-t from-background to-transparent" />
    </main>
  );
}

