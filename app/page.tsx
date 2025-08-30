import Link from 'next/link';
import Spline from '@splinetool/react-spline/next';

export default function Home() {
  return (
    <main className="relative h-screen w-screen">
      <Spline scene="https://prod.spline.design/DS0UgrDOifhNt9T6/scene.splinecode" />
      <div className="absolute inset-0 flex items-end justify-center pb-10">
        <Link
          href="/chat"
          className="px-6 py-3 rounded-lg bg-[var(--deep-sea-green)] text-white"
        >
          Try Demo
        </Link>
      </div>
    </main>
  );
}
