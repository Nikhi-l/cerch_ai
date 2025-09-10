'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useArtifact } from '@/hooks/use-artifact';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { generateUUID } from '@/lib/utils';

type PeopleFiltersPreset = {
  baseQuery: string;
  inferredFilters?: Record<string, string | number | boolean>;
  hint?: Record<string, string | number | boolean>;
  limit?: number;
};

export function PeopleFiltersCard({
  chatId,
  preset,
  append,
  setMessages,
  skeleton = false,
}: {
  chatId: string;
  preset?: PeopleFiltersPreset;
  append: UseChatHelpers['append'];
  setMessages?: UseChatHelpers['setMessages'];
  skeleton?: boolean;
}) {
  const { setArtifact, setMetadata } = useArtifact() as any;
  const [region, setRegion] = useState<string>(
    (preset?.hint?.region as string) || (preset?.inferredFilters?.region as string) || '',
  );
  const [title, setTitle] = useState<string>(
    (preset?.hint?.title as string) || (preset?.inferredFilters?.title as string) || '',
  );
  const [industry, setIndustry] = useState<string>(
    (preset?.hint?.industry as string) || '',
  );
  const [company, setCompany] = useState<string>(
    (preset?.hint?.company as string) || '',
  );
  const [skills, setSkills] = useState<string>(
    (preset?.hint?.skills as string) || '',
  );
  const [languages, setLanguages] = useState<string>(
    (preset?.hint?.languages as string) || '',
  );
  const [minConnections, setMinConnections] = useState<string>(
    preset?.hint?.minConnections ? String(preset.hint.minConnections) : '',
  );
  const [yearsOfExperience, setYearsOfExperience] = useState<string>(
    (preset?.hint?.yearsOfExperience as string) || '',
  );
  const [sizeMin, setSizeMin] = useState<string>(
    preset?.hint?.sizeMin ? String(preset.hint.sizeMin) : '',
  );
  const [sizeMax, setSizeMax] = useState<string>(
    preset?.hint?.sizeMax ? String(preset.hint.sizeMax) : '',
  );
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState('');

  const baseQuery = preset?.baseQuery || '';

  const peopleTitle = useMemo(() => {
    const parts: string[] = [];
    if (title) parts.push(`title: ${title}`);
    if (region) parts.push(`region: ${region}`);
    if (industry) parts.push(`industry: ${industry}`);
    if (company) parts.push(`company: ${company}`);
    if (skills) parts.push(`skills: ${skills}`);
    if (languages) parts.push(`languages: ${languages}`);
    if (minConnections) parts.push(`min_connections: ${minConnections}`);
    if (sizeMin || sizeMax) parts.push(`size_range: ${sizeMin || 'any'}-${sizeMax || 'any'}`);
    if (yearsOfExperience) parts.push(`experience: ${yearsOfExperience}`);
    const suffix = parts.length ? ` — ${parts.join('; ')}` : '';
    return (baseQuery || 'People search') + suffix;
  }, [baseQuery, company, industry, languages, minConnections, region, sizeMax, sizeMin, skills, title, yearsOfExperience]);

  const handleCerchNow = async (mode: 'custom' | 'auto' = 'custom') => {
    setErrorText('');
    setIsSearching(true);
    try {
      const res = await fetch('/api/cerch/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          baseQuery,
          title: peopleTitle,
          filters: {
            ...(mode === 'custom'
              ? { region, title, industry, company, skills, languages, minConnections, yearsOfExperience, sizeMin, sizeMax }
              : (preset?.inferredFilters || {})),
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErrorText(json?.error || 'No profiles were found. Try adjusting filters.');
        setIsSearching(false);
        return;
      }
      const id = json.id as string;
      const titleOut = (json.title as string) || peopleTitle;
      setArtifact({
        documentId: id,
        kind: 'people',
        title: titleOut,
        content: '',
        isVisible: true,
        status: 'idle',
        boundingBox: { top: 0, left: 0, width: 320, height: 48 },
      });
      // Optimistically append a tool result message to chat so the artifact can be reopened later
      if (setMessages) {
        const uiMsg: UIMessage = {
          id: generateUUID(),
          role: 'assistant',
          content: '',
          parts: [
            {
              type: 'tool-invocation',
              toolInvocation: {
                toolName: 'createDocument',
                toolCallId: generateUUID(),
                state: 'result',
                result: { id, title: titleOut, kind: 'people' },
              },
            },
          ],
        } as any;
        setMessages((msgs) => [...msgs, uiMsg]);
      }
      // Save pagination context (cursor/spec) for this artifact id
      const meta = { cursor: json.cursor ?? null, spec: json.spec, limit: 50 };
      setTimeout(() => {
        try { setMetadata(meta); } catch {}
      }, 0);
      setIsSearching(false);
    } catch (e) {
      setErrorText('No profiles were found. Try adjusting filters.');
      setIsSearching(false);
    }
  };

  return (
    <div className="max-w-xl w-full border rounded-2xl p-4 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground">Add filters (optional)</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Region</label>
          <Input placeholder="San Francisco Bay Area" value={region} onChange={(e) => setRegion(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Title</label>
          <Input placeholder="Software Engineer, CTO, Head of Eng" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Industry</label>
          <Input placeholder="Software, FinTech, AI" value={industry} onChange={(e) => setIndustry(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Company</label>
          <Input placeholder="Company name (optional)" value={company} onChange={(e) => setCompany(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Skills</label>
          <Input placeholder="Go, React, ML" value={skills} onChange={(e) => setSkills(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Languages</label>
          <Input placeholder="English, Spanish" value={languages} onChange={(e) => setLanguages(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Min connections</label>
          <Input type="number" min={0} placeholder="100" value={minConnections} onChange={(e) => setMinConnections(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Experience</label>
          <Select value={yearsOfExperience} onValueChange={setYearsOfExperience}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Less than 1 year">Less than 1 year</SelectItem>
              <SelectItem value="1 to 2 years">1 to 2 years</SelectItem>
              <SelectItem value="3 to 5 years">3 to 5 years</SelectItem>
              <SelectItem value="6 to 10 years">6 to 10 years</SelectItem>
              <SelectItem value="More than 10 years">More than 10 years</SelectItem>
            </SelectContent>
          </Select>
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

      <div className="mt-4 flex gap-2 items-center flex-wrap">
        <Button onClick={() => handleCerchNow('custom')} disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search with custom filters'}
        </Button>
        <Button variant="outline" onClick={() => handleCerchNow('auto')} disabled={isSearching}>
          {isSearching ? 'Searching…' : 'Search with automated filters'}
        </Button>
        {isSearching && (
          <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-pulse" />
          </div>
        )}
      </div>

      {!!errorText && (
        <div className="mt-2 text-xs text-red-500">{errorText}</div>
      )}
    </div>
  );
}
