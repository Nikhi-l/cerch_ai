'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LandingGlobe } from '@/components/landing-globe';
import { ParticlesBackground } from '@/components/particles-background';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';

const useCases = [
  {
    title: 'Company insights',
    description:
      'Access fresh company profiles, funding rounds, and market signals.'
  },
  {
    title: 'People intelligence',
    description: 'Discover up-to-date profiles and professional history.'
  },
  {
    title: 'Workflow ready',
    description: 'Integrate real-time data into your applications instantly.'
  }
];

export default function Page() {
  return (
    <main className="relative flex h-screen flex-col items-center justify-center overflow-hidden p-4 text-center">
      <ParticlesBackground />
      <LandingGlobe />
      <motion.h1
        className="mt-4 text-4xl font-bold md:text-5xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Cerch AI
      </motion.h1>
      <div className="mt-4 flex w-full max-w-4xl flex-col items-center gap-4 md:flex-row md:justify-center">
        {useCases.map((c) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card className="w-64">
              <CardHeader>
                <CardTitle>{c.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{c.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
      <Link href="/chat" className="mt-6">
        <Button size="lg">Try Demo</Button>
      </Link>
    </main>
  );
}

