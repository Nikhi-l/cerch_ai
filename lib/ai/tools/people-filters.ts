import { tool } from 'ai';
import { z } from 'zod';
import { parsePeopleQuery } from '@/lib/providers/parse';

export const peopleFiltersTool = tool({
  description:
    'Present a minimal UI card to refine People/Company discovery filters before creating artifacts. Use when the user asks to find people or companies.',
  parameters: z.object({
    initialQuery: z
      .string()
      .describe('User intent or query, e.g. "tech folks in SF"'),
  }),
  execute: async ({ initialQuery }) => {
    // Infer conservative defaults for people filters; UI can refine further.
    const inferred = parsePeopleQuery(initialQuery, 50);
    const rawFilters = (inferred.filters || {}) as Record<string, string | number | boolean>;
    const inferredFilters = { ...rawFilters };

    return {
      baseQuery: initialQuery,
      inferredFilters,
      hint: { ...inferredFilters },
      limit: inferred.limit || 50,
    } as const;
  },
});
