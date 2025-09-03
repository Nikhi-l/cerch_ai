import { tool } from 'ai';
import { z } from 'zod';
import { aggregatePeople } from '@/lib/providers';
import { crustPeopleProvider } from '@/lib/providers/crustdata/client';
import type { SearchQuery } from '@/lib/providers/types';

export const searchPeople = tool({
  description:
    'Search for people profiles using the Crustdata API. Useful for finding professionals by title, company, or location.',
  parameters: z.object({
    query: z.string().describe('Text query to search for'),
    limit: z.number().optional().describe('Max number of results'),
    filters: z
      .object({
        title: z.string().optional(),
        company: z.string().optional(),
        region: z.string().optional(),
        location: z.string().optional(),
        languages: z.array(z.string()).optional(),
        min_connections: z.number().optional(),
      })
      .optional(),
  }),
  execute: async ({ query, limit, filters }) => {
    const search: SearchQuery = { q: query, limit: limit ?? 50 };
    if (filters) search.filters = filters as any;
    const result = await aggregatePeople(search, [crustPeopleProvider]);
    return result.rows;
  },
});
