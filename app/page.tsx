"use client";

import { useEffect, useState } from 'react';
import Spline from '@splinetool/react-spline/next';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const handleWheel = () => setShowLanding(true);
    window.addEventListener('wheel', handleWheel, { once: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <section
        className={`absolute inset-0 transition-all duration-700 ${showLanding ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}
      >
        <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <Button
            onClick={() => setShowLanding(true)}
            className="bg-[hsl(246,82%,60%)] text-white hover:opacity-90"
          >
            search now
          </Button>
        </div>
      </section>
      <section
        className={`absolute inset-0 transition-all duration-700 ${showLanding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <iframe
          src="/landing/index.html"
          title="Cerch landing"
          className="h-full w-full border-none"
        />
      </section>
    </main>
  );
}
