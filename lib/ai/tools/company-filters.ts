import { tool } from 'ai';
import { z } from 'zod';
import { parseCompanyQuery } from '@/lib/providers/parse';

export const companyFiltersTool = tool({
  description:
    'Present a minimal UI card to refine Company discovery filters before creating artifacts. Use when the user asks to find companies.',
  parameters: z.object({
    initialQuery: z
      .string()
      .describe('User intent or query, e.g. "AI startups in SF"'),
  }),
  execute: async ({ initialQuery }) => {
    const inferred = parseCompanyQuery(initialQuery, 50);

    return {
      baseQuery: initialQuery,
      inferredFilters: inferred.filters || {},
      hint: {},
      limit: inferred.limit || 50,
    } as const;
  },
});

