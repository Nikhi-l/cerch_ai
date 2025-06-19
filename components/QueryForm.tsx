'use client';

import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { parseCriteria, type ParsedCriteria } from '@/lib/parseCriteria';
import { CriteriaDialog } from './CriteriaDialog';

/**
 * Collects a natural language query and converts it to searchable criteria.
 */
export function QueryForm() {
  const [query, setQuery] = useState('');
  const [parsed, setParsed] = useState<ParsedCriteria | null>(null);
  const [open, setOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!query) return;
    const result = await parseCriteria(query);
    setParsed(result);
    setOpen(true);
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex gap-2 w-full max-w-xl mx-auto p-4"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search companies, people..."
        />
        <Button type="submit">Search</Button>
      </form>
      {parsed && (
        <CriteriaDialog
          open={open}
          onOpenChange={setOpen}
          category={parsed.category}
          criteria={parsed.criteria}
          onConfirm={() => setOpen(false)}
        />
      )}
    </>
  );
}
