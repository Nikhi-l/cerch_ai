"use client";

import type { Document } from '@/lib/db/schema';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { Search as SearchIcon, User as UserIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export default function Dashboard({
  people,
  company,
}: {
  people: Array<Document>;
  company: Array<Document>;
}) {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'people' | 'company'>('all');

  const items = useMemo(() => {
    const all = [
      ...people.map((d) => ({ ...d, _kind: 'people' as const })),
      ...company.map((d) => ({ ...d, _kind: 'company' as const })),
    ];
    return all.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [people, company]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = items;
    if (kindFilter !== 'all') next = next.filter((d) => d._kind === kindFilter);
    if (q) next = next.filter((d) => d.title.toLowerCase().includes(q));
    return next;
  }, [items, query, kindFilter]);

  return (
    <div className="w-full">
      {/* Title and Search */}
      <div className="text-center mb-5 sm:mb-7">
        <h1 className="text-[1.35rem] sm:text-[1.7rem] font-semibold text-foreground mb-5">
          Search History
        </h1>

        <div className="max-w-md mx-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search your datasets..."
              className="pl-9 h-9 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Kind filter */}
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant={kindFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setKindFilter('all')}
            className="text-xs sm:text-sm"
          >
            All
          </Button>
          <Button
            variant={kindFilter === 'people' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setKindFilter('people')}
            className="text-xs sm:text-sm"
          >
            People
          </Button>
          <Button
            variant={kindFilter === 'company' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setKindFilter('company')}
            className="text-xs sm:text-sm"
          >
            Companies
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-4xl mx-auto">
        <h2 className="text-sm sm:text-base font-medium text-foreground mb-3">Older</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((d) => (
            <Link
              key={`${d.id}-${d.createdAt}`}
              href={`/artifact/${d.id}`}
              className="block rounded-md border p-4 sm:p-5 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-muted-foreground">
                  {d._kind === 'people' ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-medium text-foreground mb-1 truncate">
                    {d.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={
                        d._kind === 'people'
                          ? 'px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300'
                          : 'px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                      }
                    >
                      {d._kind === 'people' ? 'People' : 'Companies'}
                    </span>
                    <span className="text-muted-foreground">
                      {format(new Date(d.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No datasets found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
