'use client';

import { useEffect, useRef } from 'react';
import { Application } from '@splinetool/runtime';

export default function EarthSpline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const app = new Application(canvas);
    app.load('https://prod.spline.design/1oF8kp0AWvtjr-CD/scene.splinecode');
    return () => {
      app.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}
