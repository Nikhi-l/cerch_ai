'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { LandingGlobe } from '@/components/landing-globe';
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
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 p-4 text-center">
      <LandingGlobe />
      <motion.h1
        className="text-5xl font-bold"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        Cerch AI
      </motion.h1>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {useCases.map((c) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
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
      <Link href="/chat">
        <Button size="lg">Try Demo</Button>
      </Link>
    </main>
  );
}

