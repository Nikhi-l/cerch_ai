import { useEffect, useState } from 'react';
import Spline from '@splinetool/react-spline/next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [showLanding, setShowLanding] = useState(false);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY > 0) setShowLanding(true);
    };
    window.addEventListener('wheel', onWheel, { once: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <AnimatePresence>
        {!showLanding && (
          <motion.div
            key="hero"
            className="h-full w-full"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
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
          </motion.div>
        )}
        {showLanding && (
          <motion.div
            key="landing"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="h-full w-full"
          >
            <iframe
              src="/landing.html"
              className="h-full w-full border-0"
              title="landing"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
