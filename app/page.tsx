import Link from 'next/link';
import Spline from '@splinetool/react-spline/next';

export default function Home() {
  return (
    <main className="w-full h-screen relative bg-white">
      <Spline
        className="size-full"
        scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <Link
          href="/chat"
          className="px-6 py-3 rounded-lg text-white bg-[var(--deep-sea-green)] hover:bg-[var(--tiber)] transition-colors"
        >
          Try Demo
        </Link>
      </div>
    </main>
  );
}
