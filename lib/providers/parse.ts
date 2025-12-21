// Lightweight parser to extract common people filters from freeform text.
// Intentionally conservative; improves over time.

import type { SearchQuery } from './types';

const TITLE_SUFFIXES = [
  'developer',
  'engineer',
  'specialist',
  'expert',
  'architect',
  'designer',
  'scientist',
  'manager',
  'lead',
  'consultant',
  'analyst',
  'head',
  'director',
  'founder',
];

const INDUSTRY_KEYWORDS: Array<{ pattern: RegExp; value: string }> = [
  { pattern: /(augmented reality|virtual reality|\bar\/vr\b|mixed reality|extended reality|\bxr\b)/i, value: 'Augmented Reality' },
  { pattern: /(artificial intelligence|\bai\b|machine learning|ml\b)/i, value: 'Artificial Intelligence' },
  { pattern: /(fintech|financial technology|financial services)/i, value: 'Financial Services' },
  { pattern: /(healthtech|health tech|medical|health care|healthcare|medtech)/i, value: 'Healthcare' },
  { pattern: /(e-?commerce|retail|marketplace)/i, value: 'E-commerce' },
  { pattern: /(marketing|martech|advertising|adtech)/i, value: 'Marketing & Advertising' },
  { pattern: /(gaming|game studio|game development)/i, value: 'Gaming' },
  { pattern: /(blockchain|crypto|web3)/i, value: 'Blockchain' },
];

const LANGUAGE_KEYWORDS = [
  'english',
  'spanish',
  'french',
  'german',
  'hindi',
  'mandarin',
  'portuguese',
  'japanese',
  'korean',
  'arabic',
  'italian',
];

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function titleCase(value: string): string {
  if (!value) return value;
  return value
    .split(' ')
    .map((word) => {
      if (word.toUpperCase() === word) return word;
      if (word.includes('/')) return word; // keep tokens like AR/VR
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

function captureRegion(text: string): string | undefined {
  const normalized = text.replace(/\s+/g, ' ');
  const prepositionRegex = /\b(?:in|within|based in|from|around|near|located in)\s+([A-Za-z][A-Za-z\s&.'-]{2,})/i;
  const match = normalized.match(prepositionRegex);
  if (match) {
    let candidate = match[1]
      .split(/(?=\bwith\b|\bwho\b|\bthat\b|\bfor\b|\bworking\b|\blooking\b|,|\.)/i)[0]
      .trim();
    candidate = candidate.replace(/^(the\s+)/i, '').trim();
    if (candidate) return titleCase(candidate);
  }

  const fallback = inferLocationKeyword(text.toLowerCase());
  return fallback ? titleCase(fallback) : undefined;
}

function inferLocationKeyword(text: string): string | undefined {
  const lookup: Record<string, string> = {
    'san francisco bay area': 'San Francisco Bay Area',
    'san francisco': 'San Francisco',
    sf: 'San Francisco',
    sfo: 'San Francisco',
    seattle: 'Seattle',
    london: 'London',
    toronto: 'Toronto',
    nyc: 'New York',
    'new york': 'New York',
    'washington dc': 'Washington, District of Columbia',
    'district of columbia': 'Washington, District of Columbia',
    bangalore: 'Bangalore',
    bengaluru: 'Bangalore',
    mumbai: 'Mumbai',
    delhi: 'Delhi',
    berlin: 'Berlin',
    paris: 'Paris',
  };

  for (const key of Object.keys(lookup)) {
    if (text.includes(key)) {
      return lookup[key];
    }
  }
  return undefined;
}

// Well-known company names for case-insensitive matching
const KNOWN_COMPANIES = [
  'Google', 'Microsoft', 'Apple', 'Amazon', 'Meta', 'Facebook', 'Netflix', 'Tesla',
  'Uber', 'Lyft', 'Airbnb', 'Stripe', 'Shopify', 'Salesforce', 'Oracle', 'IBM',
  'Intel', 'AMD', 'Nvidia', 'Adobe', 'Spotify', 'Twitter', 'LinkedIn', 'Snap',
  'Pinterest', 'Reddit', 'Discord', 'Slack', 'Zoom', 'Dropbox', 'GitHub', 'GitLab',
  'Atlassian', 'Notion', 'Figma', 'Canva', 'Asana', 'Monday', 'Trello', 'Jira',
  'OpenAI', 'Anthropic', 'DeepMind', 'Databricks', 'Snowflake', 'Palantir',
  'Coinbase', 'Robinhood', 'Square', 'Block', 'PayPal', 'Plaid', 'Klarna',
  'DoorDash', 'Instacart', 'Grubhub', 'Postmates', 'SpaceX', 'Neuralink',
  'ByteDance', 'TikTok', 'Alibaba', 'Tencent', 'Baidu', 'Samsung', 'Sony',
  'Dell', 'HP', 'Cisco', 'VMware', 'ServiceNow', 'Workday', 'Twilio', 'Cloudflare',
];

function inferCompany(text: string): string | undefined {
  const trimmed = text.trim();

  // Pattern 1: "employees/people/folks at/from/of [Company]"
  let match = trimmed.match(/\b(?:employees|people|folks)\s+(?:at|from|of)\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})\b/);
  if (match) return match[1].trim();

  // Pattern 2: "[Company] employees/people/folks"
  match = trimmed.match(/\b([A-Z][A-Za-z0-9&.'\- ]{1,60})\s+(?:employees|people|folks)\b/);
  if (match) return match[1].trim();

  // Pattern 3: "at [Company]" (original)
  match = trimmed.match(/\bat\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})\b/);
  if (match) return match[1].trim();

  // Pattern 4: "working at/in/for [Company]"
  match = trimmed.match(/\bworking\s+(?:at|in|for)\s+([A-Za-z][A-Za-z0-9&.'\- ]{1,60})\b/i);
  if (match) return titleCase(match[1].trim());

  // Pattern 5: "who work at/in/for [Company]"
  match = trimmed.match(/\bwho\s+work\s+(?:at|in|for)\s+([A-Za-z][A-Za-z0-9&.'\- ]{1,60})\b/i);
  if (match) return titleCase(match[1].trim());

  // Pattern 6: "from [Company]"
  match = trimmed.match(/\bfrom\s+([A-Z][A-Za-z0-9&.'\- ]{1,60})(?:\s|$)/);
  if (match) return match[1].trim();

  // Pattern 7: Case-insensitive matching for known companies
  const lowerText = text.toLowerCase();
  for (const company of KNOWN_COMPANIES) {
    const lowerCompany = company.toLowerCase();
    // Check for various patterns with the company name
    const patterns = [
      new RegExp(`\\b(?:at|in|from|for)\\s+${lowerCompany}\\b`, 'i'),
      new RegExp(`\\b${lowerCompany}\\s+(?:employees|people|team|engineers)\\b`, 'i'),
      new RegExp(`\\bworking\\s+(?:at|in|for)\\s+${lowerCompany}\\b`, 'i'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(lowerText)) {
        return company; // Return the properly cased version
      }
    }
  }

  return undefined;
}

function extractTitleCandidates(text: string): string[] {
  const titles = new Set<string>();
  const regex = new RegExp(
    `([A-Za-z0-9+/&'\\- ]{2,})\\s+(${TITLE_SUFFIXES.join('|')})s?`,
    'gi',
  );
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const descriptor = titleCase(match[1].trim());
    const suffix = titleCase(match[2]);
    const combined = descriptor ? `${descriptor} ${suffix}` : suffix;
    titles.add(combined.replace(/\s+/g, ' ').trim());
  }

  const genericRegex = new RegExp(`\b(${TITLE_SUFFIXES.join('|')})s?\b`, 'gi');
  while ((match = genericRegex.exec(text))) {
    titles.add(titleCase(match[1]));
  }

  return Array.from(titles);
}

function extractIndustry(text: string): string | undefined {
  for (const { pattern, value } of INDUSTRY_KEYWORDS) {
    if (pattern.test(text)) return value;
  }
  return undefined;
}

function extractSkills(text: string): string[] {
  const skills = new Set<string>();
  if (/(\b| )(ar\/vr|augmented reality|virtual reality|xr|mixed reality)(\b| )/i.test(text)) {
    skills.add('AR/VR');
    skills.add('Augmented Reality');
    skills.add('Virtual Reality');
  }
  if (/(machine learning|ml\b|artificial intelligence|\bai\b)/i.test(text)) {
    skills.add('Machine Learning');
  }
  if (/(computer vision)/i.test(text)) skills.add('Computer Vision');
  if (/(unity3d?|unreal engine)/i.test(text)) skills.add('Game Engines');
  return Array.from(skills);
}

function extractLanguages(text: string): string[] {
  const matches = new Set<string>();
  for (const lang of LANGUAGE_KEYWORDS) {
    const regex = new RegExp(`\\b${lang}\\b`, 'i');
    if (regex.test(text)) matches.add(titleCase(lang));
  }
  return Array.from(matches);
}

export function parsePeopleQuery(text: string, limit = 50): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};
  const normalizedText = normalize(text);
  const lower = normalizedText.toLowerCase();

  const region = captureRegion(text);
  if (region) filters.region = region;

  const titles = extractTitleCandidates(normalizedText);
  if (titles.length) {
    filters.title = titles[0];
  }

  const company = inferCompany(text);
  if (company) filters.company = company;

  const industry = extractIndustry(lower);
  if (industry) filters.industry = industry;

  const skills = extractSkills(lower);
  if (skills.length) filters.skills = skills.join(', ');

  const languages = extractLanguages(lower);
  if (languages.length) filters.languages = languages.join(', ');

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}

function inferIndustryCompany(text: string): string | undefined {
  for (const { pattern, value } of INDUSTRY_KEYWORDS) {
    if (pattern.test(text)) return value;
  }
  return undefined;
}

function inferCountry(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/(^|\b)(usa|us|united states)(\b|$)/.test(lower)) return 'United States';
  if (/(^|\b)(canada|ca)(\b|$)/.test(lower)) return 'Canada';
  if (/(^|\b)(uk|united kingdom|england|london)(\b|$)/.test(lower)) return 'United Kingdom';
  if (/(^|\b)(india|indian)(\b|$)/.test(lower)) return 'India';
  return undefined;
}

function inferSizeRange(text: string): { size_min?: number; size_max?: number } {
  const lower = text.toLowerCase();
  const between = lower.match(/(\d{1,6})\s*[-–to]{1,3}\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (between) {
    const a = Number(between[1]);
    const b = Number(between[2]);
    const [min, max] = a <= b ? [a, b] : [b, a];
    return { size_min: min, size_max: max };
  }
  const minMatch = lower.match(/(at least|min(?:imum)?|over|>=?)\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (minMatch) return { size_min: Number(minMatch[2]) };
  const maxMatch = lower.match(/(at most|max(?:imum)?|under|<=?)\s*(\d{1,6})\s*(employees|people|headcount)?/i);
  if (maxMatch) return { size_max: Number(maxMatch[2]) };
  return {};
}

function inferYearFounded(text: string): { year_founded_min?: number; year_founded_max?: number } {
  const lower = text.toLowerCase();
  const after = lower.match(/(after|since|post)\s*(\d{4})/i);
  if (after) return { year_founded_min: Number(after[2]) };
  const before = lower.match(/(before|pre)\s*(\d{4})/i);
  if (before) return { year_founded_max: Number(before[2]) };
  return {};
}

export function parseCompanyQuery(text: string, limit = 100): SearchQuery {
  const filters: Record<string, string | number | boolean> = {};
  const industry = inferIndustryCompany(text);
  const hq = captureRegion(text) || inferLocationKeyword(text.toLowerCase());
  const country = inferCountry(text);
  const size = inferSizeRange(text);
  const founded = inferYearFounded(text);

  if (industry) filters.industry = industry;
  if (hq) filters.hq = titleCase(hq);
  if (country) filters.country = country;
  if (size.size_min != null) filters.size_min = size.size_min;
  if (size.size_max != null) filters.size_max = size.size_max;
  if (founded.year_founded_min != null)
    filters.year_founded_min = founded.year_founded_min;
  if (founded.year_founded_max != null)
    filters.year_founded_max = founded.year_founded_max;

  return {
    q: text,
    filters: Object.keys(filters).length ? filters : undefined,
    limit,
  };
}
