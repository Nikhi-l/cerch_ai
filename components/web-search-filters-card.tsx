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
import type { WebSearchSource, WebSearchGeolocation } from '@/lib/providers/types';
import { SearchIcon } from '@/components/icons';

type WebSearchFiltersPreset = {
  baseQuery: string;
  originalQuery?: string;
  inferredFilters?: {
    sources?: WebSearchSource[];
    geolocation?: WebSearchGeolocation;
    site?: string;
  };
  hint?: {
    sources?: WebSearchSource[];
    geolocation?: WebSearchGeolocation;
    site?: string;
  };
};

const SOURCE_OPTIONS: { value: WebSearchSource; label: string; description: string }[] = [
  { value: 'web', label: 'Web', description: 'General web pages' },
  { value: 'news', label: 'News', description: 'News articles' },
  { value: 'scholar-articles', label: 'Scholar', description: 'Academic papers' },
  { value: 'scholar-author', label: 'Authors', description: 'Academic authors' },
];

const GEOLOCATION_OPTIONS: { value: WebSearchGeolocation; label: string }[] = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'JP', label: 'Japan' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'SG', label: 'Singapore' },
];

export function WebSearchFiltersCard({
  chatId,
  preset,
  append,
  setMessages,
  skeleton = false,
}: {
  chatId: string;
  preset?: WebSearchFiltersPreset;
  append: UseChatHelpers['append'];
  setMessages?: UseChatHelpers['setMessages'];
  skeleton?: boolean;
}) {
  const { setArtifact, setMetadata } = useArtifact() as any;

  // Initialize state from preset
  const [query, setQuery] = useState<string>(preset?.baseQuery || '');
  const [selectedSources, setSelectedSources] = useState<WebSearchSource[]>(
    preset?.hint?.sources || preset?.inferredFilters?.sources || ['web', 'news']
  );
  const [geolocation, setGeolocation] = useState<WebSearchGeolocation>(
    preset?.hint?.geolocation || preset?.inferredFilters?.geolocation || 'US'
  );
  const [site, setSite] = useState<string>(
    preset?.hint?.site || preset?.inferredFilters?.site || ''
  );
  const [isSearching, setIsSearching] = useState(false);
  const [errorText, setErrorText] = useState('');

  const baseQuery = preset?.baseQuery || query;

  const searchTitle = useMemo(() => {
    const parts: string[] = [];
    if (selectedSources.length > 0 && selectedSources.length < 4) {
      parts.push(`sources: ${selectedSources.join(', ')}`);
    }
    if (site) parts.push(`site: ${site}`);
    if (geolocation) parts.push(`geo: ${geolocation}`);
    const suffix = parts.length ? ` — ${parts.join('; ')}` : '';
    return (query || baseQuery || 'Web search') + suffix;
  }, [baseQuery, query, selectedSources, site, geolocation]);

  const handleSourceToggle = (source: WebSearchSource) => {
    setSelectedSources((prev) =>
      prev.includes(source)
        ? prev.filter((s) => s !== source)
        : [...prev, source]
    );
  };

  const handleSearch = async (mode: 'custom' | 'auto' = 'custom') => {
    setErrorText('');
    setIsSearching(true);

    try {
      const searchQuery = query || baseQuery;
      if (!searchQuery.trim()) {
        setErrorText('Please enter a search query.');
        setIsSearching(false);
        return;
      }

      const filters =
        mode === 'custom'
          ? {
              sources: selectedSources.length > 0 ? selectedSources : undefined,
              geolocation,
              site: site || undefined,
            }
          : preset?.inferredFilters || {};

      const res = await fetch('/api/cerch/web-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          baseQuery: searchQuery,
          title: searchTitle,
          filters,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setErrorText(json?.error || 'No results were found. Try different keywords.');
        setIsSearching(false);
        return;
      }

      const id = json.id as string;
      const titleOut = (json.title as string) || searchTitle;

      setArtifact({
        documentId: id,
        kind: 'web-search',
        title: titleOut,
        content: '',
        isVisible: true,
        status: 'idle',
        boundingBox: { top: 0, left: 0, width: 320, height: 48 },
      });

      // Optimistically append a tool result message to chat
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
                result: { id, title: titleOut, kind: 'web-search' },
              },
            },
          ],
        } as any;
        setMessages((msgs) => [...msgs, uiMsg]);
      }

      setIsSearching(false);
    } catch (e) {
      setErrorText('Search failed. Please try again.');
      setIsSearching(false);
    }
  };

  if (skeleton) {
    return (
      <div className="max-w-xl w-full border rounded-2xl p-4 bg-card text-card-foreground shadow-sm animate-pulse">
        <div className="h-4 bg-muted rounded w-32 mb-4" />
        <div className="space-y-3">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl w-full border rounded-2xl p-4 bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <SearchIcon size={18} />
        <div className="text-sm font-medium">Web Search</div>
      </div>

      <div className="space-y-4">
        {/* Search Query */}
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            Search Query
          </label>
          <Input
            placeholder="Enter your search query..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Sources */}
        <div>
          <label className="block text-xs text-muted-foreground mb-2">
            Search Sources
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SOURCE_OPTIONS.map((source) => (
              <label
                key={source.value}
                className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSources.includes(source.value)}
                  onChange={() => handleSourceToggle(source.value)}
                  className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium">{source.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {source.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Geolocation */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Region
            </label>
            <Select value={geolocation} onValueChange={(v) => setGeolocation(v as WebSearchGeolocation)}>
              <SelectTrigger>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                {GEOLOCATION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Site Restriction */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Site (optional)
            </label>
            <Input
              placeholder="e.g., github.com"
              value={site}
              onChange={(e) => setSite(e.target.value)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center flex-wrap pt-2">
          <Button onClick={() => handleSearch('custom')} disabled={isSearching}>
            {isSearching ? 'Searching…' : 'Search with filters'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleSearch('auto')}
            disabled={isSearching}
          >
            {isSearching ? 'Searching…' : 'Quick search'}
          </Button>
          {isSearching && (
            <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
              <div className="h-full w-1/3 bg-primary animate-pulse" />
            </div>
          )}
        </div>

        {/* Error Message */}
        {!!errorText && (
          <div className="text-xs text-red-500 mt-2">{errorText}</div>
        )}
      </div>
    </div>
  );
}
