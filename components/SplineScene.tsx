'use client';

// eslint-disable-next-line import/no-unresolved
import Spline from '@splinetool/react-spline/next';

interface SplineSceneProps {
  className?: string;
}

export default function SplineScene({ className }: SplineSceneProps) {
  return (
    <Spline
      scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode"
      className={className}
    />
  );
}
