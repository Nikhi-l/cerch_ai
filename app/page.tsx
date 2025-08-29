'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Brain, Building2, Users } from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Personal Insight',
    description:
      'Chat with documents, emails, and notes to accelerate everyday tasks.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description:
      'Share conversations and data across your organisation securely.',
  },
  {
    icon: Building2,
    title: 'Company Knowledge',
    description: 'Tap into internal wikis and databases with natural language.',
  },
];

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="mb-4 text-5xl font-bold">Cerch AI</h1>
        <p className="max-w-xl text-lg text-muted-foreground">
          Intelligent chat powered by your personal and company data.
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button asChild size="lg">
          <Link href="/chat">Try Demo</Link>
        </Button>
      </motion.div>
      <div className="grid gap-8 md:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <motion.div
            key={title}
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Icon className="size-12" />
            <h3 className="text-xl font-semibold">{title}</h3>
            <p className="max-w-xs text-sm text-muted-foreground">
              {description}
            </p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
