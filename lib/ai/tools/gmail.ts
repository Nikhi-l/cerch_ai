import { tool } from 'ai';
import { z } from 'zod';
import { getFreshAccessToken } from '@/lib/googleTokens';
import { fetchWithTimeout } from '@/lib/network';

type ResponsesResult = any;

export function gmailQueryTool({ apiKey }: { apiKey?: string }) {
  return tool({
    description:
      "Use the Gmail connector via OpenAI Responses to read the user's inbox or search messages. Provide a clear query, and the tool will return summarized results.",
    parameters: z.object({
      task: z
        .string()
        .describe(
          'A concise instruction describing what to read or search in Gmail, e.g. "List my 5 most recent emails (from, subject, date)."',
        ),
    }),
    execute: async ({ task }): Promise<ResponsesResult> => {
      const { accessToken } = await getFreshAccessToken();
      if (!accessToken) {
        return {
          error:
            'Gmail is not connected. Ask the user to click the Gmail button and complete Google sign-in.',
        };
      }

      const key = apiKey || process.env.OPENAI_API_KEY;
      if (!key) {
        return { error: 'OPENAI_API_KEY is not configured on the server.' };
      }

      const body = {
        model: 'gpt-4.1',
        input: task,
        tools: [
          {
            type: 'mcp',
            server_label: 'GoogleMail',
            connector_id: 'connector_gmail',
            authorization: accessToken,
            require_approval: 'never',
          },
        ],
      } as const;

      try {
        const response = await fetchWithTimeout('https://api.openai.com/v1/responses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify(body),
          timeoutMs: 60000,
        });

        if (!response.ok) {
          const text = await response.text();
          return { error: `Responses API error: ${response.status} ${text}` };
        }

        const json = await response.json();

      const outputText = (json as any).output_text || null;
      return outputText ? { output_text: outputText } : json;
      } catch (err: any) {
        return { error: `Responses API network error: ${err?.message || 'timeout'}` };
      }
    },
  });
}
