export interface ExaResult {
  title: string;
  url: string;
  author?: string;
  published?: string;
}

export async function searchExa({
  query,
  category = 'company',
  numResults = 10,
}: {
  query: string;
  category?: string;
  numResults?: number;
}): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('Missing EXA_API_KEY');
  }

  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({ query, category, numResults }),
  });

  if (!response.ok) {
    throw new Error(`Exa API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

export function resultsToCSV(results: ExaResult[]): string {
  const headers = ['Title', 'URL', 'Author', 'Published'];
  const rows = results.map((r) => [
    r.title?.replace(/"/g, '""') || '',
    r.url || '',
    r.author || '',
    r.published || '',
  ]);
  const csvRows = rows.map((row) => row.map((c) => `"${c}"`).join(','));
  return [headers.join(','), ...csvRows].join('\n');
}
