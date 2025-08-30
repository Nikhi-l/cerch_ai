import Link from 'next/link';
import Spline from '@splinetool/react-spline/next';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="relative h-screen w-screen">
      <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button
          asChild
          className="bg-[var(--deep-sea-green)] text-white hover:bg-[var(--blue-chill)]"
        >
          <Link href="/chat">Try Demo</Link>
        </Button>
      </div>
    </main>
  );
}
