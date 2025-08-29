import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Briefcase, FileSearch, Users, Database } from 'lucide-react';

const features = [
  {
    icon: FileSearch,
    title: 'Instant Answers',
    description:
      'Ask questions across documents, sheets, and wikis and get answers in seconds.',
  },
  {
    icon: Users,
    title: 'Team Knowledge',
    description:
      'Share conversations and insights so everyone stays on the same page.',
  },
  {
    icon: Briefcase,
    title: 'Customer Support',
    description:
      'Resolve customer issues quickly with access to internal guides and history.',
  },
  {
    icon: Database,
    title: 'Company Data',
    description:
      'Connect your structured data sources to chat with your numbers naturally.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <section className="flex flex-col items-center justify-center flex-1 px-4 py-24 text-center gap-6 bg-gradient-to-b from-background to-muted">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold tracking-tight"
        >
          Cerch AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="max-w-2xl text-lg text-muted-foreground"
        >
          AI that understands your people and company data so you can work
          smarter.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Button asChild size="lg">
            <Link href="/chat">Try Demo</Link>
          </Button>
        </motion.div>
      </section>

      <section className="py-24 bg-background">
        <div className="max-w-5xl mx-auto px-4 grid gap-8 md:grid-cols-2">
          {features.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
            >
              <Card className="h-full">
                <CardHeader className="space-y-2">
                  <feature.icon className="h-8 w-8 text-primary" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
