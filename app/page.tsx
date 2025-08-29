import Link from 'next/link';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-16 bg-gradient-to-b from-background to-muted p-8 text-center"
    >
      <section className="space-y-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl font-bold tracking-tight"
        >
          Cerch AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mx-auto max-w-2xl text-xl text-muted-foreground"
        >
          Unlock insights from your people and company data with an AI assistant
          built for everyone.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Button asChild size="lg">
            <Link href="/chat">Try Demo</Link>
          </Button>
        </motion.div>
      </section>
      <section className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <FeatureCard
          title="For Individuals"
          description="Research topics and learn faster with a conversational interface."
        />
        <FeatureCard
          title="For Companies"
          description="Connect internal documents and data to streamline everyday work."
        />
      </section>
    </main>
  );
}
