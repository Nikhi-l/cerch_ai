import 'server-only';

/** Structure returned by `parseCriteria`. */
export interface ParsedCriteria {
  category: string;
  criteria: Array<string>;
}

const tool = {
  type: 'function',
  function: {
    name: 'returnCriteria',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string' },
        criteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['category', 'criteria'],
    },
  },
};

/**
 * Calls OpenAI's chat API to parse a research query into structured criteria.
 */
export async function parseCriteria(query: string): Promise<ParsedCriteria> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'Extract a category and list of search criteria from the user request. Respond using the returnCriteria function.',
        },
        { role: 'user', content: query },
      ],
      tools: [tool],
      tool_choice: { type: 'function', function: { name: 'returnCriteria' } },
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to parse criteria');
  }

  const json = await res.json();
  const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error('No tool call found');
  }

  return JSON.parse(toolCall.function.arguments);
}
