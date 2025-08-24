import { tool } from 'ai';
import { z } from 'zod';
// eslint-disable-next-line import/no-unresolved
import OpenAI from 'openai';
import { getFreshAccessToken } from '@/lib/googleTokens';

export function gmailQueryTool({ apiKey }: { apiKey?: string }) {
  const client = new OpenAI({ apiKey: apiKey || process.env.OPENAI_API_KEY });

  return tool({
    description: 'Query Gmail using the connector',
    parameters: z.object({ query: z.string().describe('Search terms or request') }),
    execute: async ({ query }) => {
      const accessToken = await getFreshAccessToken();
      if (!accessToken) {
        throw new Error('Gmail not connected');
      }

      const resp = await client.responses.create({
        model: 'gpt-4.1',
        input: query,
        tools: [
          {
            type: 'mcp',
            connector_id: 'connector_gmail',
            authorization: accessToken,
            require_approval: 'never',
          },
        ],
      });

      return (resp as any).output_text ?? resp;
    },
  });
}
