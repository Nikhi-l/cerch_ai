import Link from 'next/link';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 p-8 text-center">
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-6"
      >
        <h1 className="text-4xl font-bold">Cerch Ai</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Unify your personal knowledge and company data in a single stylish
          chat experience.
        </p>
        <Button asChild size="lg" className="mt-4">
          <Link href="/chat">Try Demo</Link>
        </Button>
      </motion.section>
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-3"
      >
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <h3 className="mb-2 text-xl font-semibold">Personal</h3>
          <p className="text-sm text-muted-foreground">
            Plan trips, summarise articles, and manage your day with an AI
            companion.
          </p>
        </div>
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <h3 className="mb-2 text-xl font-semibold">Team</h3>
          <p className="text-sm text-muted-foreground">
            Share project context, brainstorm ideas, and collaborate in real
            time.
          </p>
        </div>
        <div className="rounded-xl border bg-background p-6 shadow-sm">
          <h3 className="mb-2 text-xl font-semibold">Company Data</h3>
          <p className="text-sm text-muted-foreground">
            Explore documents, spreadsheets, and knowledge bases with natural
            language.
          </p>
        </div>
      </motion.section>
    </main>
  );
}
