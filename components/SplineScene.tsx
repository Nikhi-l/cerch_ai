'use client';

import dynamic from 'next/dynamic';

interface SplineSceneProps {
  className?: string;
}

// eslint-disable-next-line import/no-unresolved
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
});

export default function SplineScene({ className }: SplineSceneProps) {
  return (
    <Spline
      scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode"
      className={className}
    />
  );
}
