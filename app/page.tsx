'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Spline from '@splinetool/react-spline/next';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [transitioning, setTransitioning] = useState(false);
  const router = useRouter();

  const startTransition = () => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      router.push('/landing.html');
    }, 700);
  };

  useEffect(() => {
    const handleWheel = () => startTransition();
    window.addEventListener('wheel', handleWheel, { once: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [transitioning]);

  return (
    <main
      className={`relative h-screen w-screen transition-opacity duration-700 ${
        transitioning ? 'opacity-0' : 'opacity-100'
      }`}
      onWheel={startTransition}
    >
      <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button
          onClick={startTransition}
          className="bg-[hsl(246,82%,60%)] text-white hover:opacity-90"
        >
          cerch now
        </Button>
      </div>
    </main>
  );
}
