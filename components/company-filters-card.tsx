'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UseChatHelpers } from '@ai-sdk/react';

type CompanyFiltersPreset = {
  baseQuery: string;
  inferredFilters?: Record<string, string | number | boolean>;
  hint?: Record<string, string | number | boolean>;
  limit?: number;
};

export function CompanyFiltersCard({
  chatId,
  preset,
  append,
}: {
  chatId: string;
  preset?: CompanyFiltersPreset;
  append: UseChatHelpers['append'];
}) {
  const [region, setRegion] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [sizeMin, setSizeMin] = useState<string>('');
  const [sizeMax, setSizeMax] = useState<string>('');

  const baseQuery = preset?.baseQuery || '';

  const companyTitle = useMemo(() => {
    const parts: string[] = [];
    if (industry) parts.push(`industry: ${industry}`);
    if (region) parts.push(`region: ${region}`);
    if (sizeMin || sizeMax) parts.push(`size_range: ${sizeMin || 'any'}-${sizeMax || 'any'}`);
    const suffix = parts.length ? ` — ${parts.join('; ')}` : '';
    return (baseQuery || 'Company search') + suffix;
  }, [baseQuery, industry, region, sizeMax, sizeMin]);

  const handleCreate = async (useFilters: boolean) => {
    const cTitle = useFilters ? companyTitle : baseQuery || 'Company search';
    await append({
      role: 'user',
      content: `Create the company list now: ${cTitle}`,
    });
  };

  return (
    <div className="max-w-xl w-full border rounded-2xl p-4 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">Add filters (optional)</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Region / HQ</label>
          <Input placeholder="San Francisco Bay Area" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Industry</label>
          <Input placeholder="Software, FinTech, AI" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Size min</label>
            <Input type="number" min={0} placeholder="50" value={sizeMin} onChange={(e) => setSizeMin(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Size max</label>
            <Input type="number" min={0} placeholder="500" value={sizeMax} onChange={(e) => setSizeMax(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-3 text-xs text-muted-foreground">Scanning companies and preparing your list.</div>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => handleCreate(true)}>Create List</Button>
        <Button variant="ghost" onClick={() => handleCreate(false)}>
          Skip filters
        </Button>
      </div>
    </div>
  );
}
