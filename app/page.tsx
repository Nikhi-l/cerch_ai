import Spline from '@splinetool/react-spline/next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="relative w-full h-dvh">
      <Spline
        scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode"
        className="absolute inset-0"
      />
      <div className="absolute inset-0 flex items-end justify-center pb-12">
        <Link href="/chat">
          <Button className="bg-[var(--deep-sea-green)] hover:bg-[var(--mountain-meadow)] text-white">
            Try Demo
          </Button>
        </Link>
      </div>
    </main>
  );
}
