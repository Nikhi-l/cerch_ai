import { tool, DataStreamWriter } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';

interface GetProfilesProps {
  session: Session;
  dataStream: DataStreamWriter;
}

export const getProfiles = ({ dataStream }: GetProfilesProps) =>
  tool({
    description: 'Fetch profile information for people or companies',
    parameters: z.object({
      query: z.string().describe('search query'),
      limit: z.number().min(1).max(3).default(1),
    }),
    execute: async ({ query, limit }) => {
      // TODO: replace with real data fetching
      const results = Array.from({ length: limit }).map((_, idx) => ({
        name: `Result ${idx + 1}`,
        title: 'Unknown',
        company: query,
        matchScore: 1,
      }));

      results.forEach((profile) => {
        dataStream.writeData({
          type: 'profile-card-delta',
          content: JSON.stringify(profile),
        });
      });

      return { results };
    },
  });
