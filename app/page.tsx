import Link from 'next/link';
import Spline from '@splinetool/react-spline/next';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="relative h-screen w-screen">
      <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
      <div className="absolute top-4 right-4">
        <Link href="/chat">
          <Button>Try Demo</Button>
        </Link>
      </div>
    </main>
  );
}
