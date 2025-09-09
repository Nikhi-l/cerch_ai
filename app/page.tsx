'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Spline from '@splinetool/react-spline/next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Home() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  const start = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => {
      router.push('/landing.html');
    }, 500);
  };

  useEffect(() => {
    const onWheel = () => start();
    window.addEventListener('wheel', onWheel, { once: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <main
      className={cn(
        'relative h-screen w-screen overflow-hidden transition-opacity duration-500',
        leaving && 'opacity-0',
      )}
    >
      <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Button
          onClick={start}
          className="bg-[hsl(246,82%,60%)] text-white hover:opacity-90"
        >
          cerch now
        </Button>
      </div>
    </main>
  );
}
