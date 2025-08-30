import Link from 'next/link';

import { Button } from '@/components/ui/button';
import SplineScene from '@/components/SplineScene';

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <SplineScene className="absolute inset-0" />
      <div className="absolute left-16 top-1/4 max-w-xl space-y-6">
        <h1 className="text-5xl font-bold leading-tight">
          Search that{' '}
          <span className="text-primary">feels like a conversation</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Autonomous agents entity fit, dedupe, enrich contacts, and score leads—so you get data you can actually
          use.
        </p>
        <Link href="/chat">
          <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/80">
            Try Demo
          </Button>
        </Link>
      </div>
    </main>
  );
}
