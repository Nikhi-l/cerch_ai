export type FilterOperator =
  | '='
  | '!='
  | 'in'
  | 'not_in'
  | '>'
  | '<'
  | '=>'
  | '=<'
  | '(.)';

export type CrustFilterCondition = {
  column: string;
  type: FilterOperator;
  value: string | number | boolean | Array<string | number | boolean>;
};

export type CrustFilterGroup = {
  op: 'and' | 'or';
  conditions: CrustFilterNode[];
};

export type CrustFilterNode = CrustFilterCondition | CrustFilterGroup;

export type SearchQuery = {
  q?: string;
  filters?: Record<string, string | number | boolean> | CrustFilterNode;
  limit?: number;
  cursor?: string | null;
};

export type Person = {
  id?: string;
  name?: string;
  title?: string;
  company?: string;
  industry?: string;
  location?: string;
  linkedin_url?: string;
  website?: string;
  profile_image_url?: string;
  description?: string;
  tags?: string;
  [key: string]: unknown;
};

export type Company = {
  id?: string;
  name?: string;
  industry?: string;
  company_url?: string;
  linkedin_url?: string;
  location?: string;
  size?: string | number;
  funding?: string | number;
  logo_url?: string;
  description?: string;
  tags?: string;
  [key: string]: unknown;
};

export type CreditCost = {
  provider: 'crustdata' | 'xi' | 'llm' | 'validator';
  estimated: number; // abstract credits, not provider-native
};

export type ProviderResult<T> = {
  rows: T[];
  creditCost?: CreditCost;
  source: 'crustdata' | 'xi' | 'llm';
  nextCursor?: string | null;
};

export interface PeopleProvider {
  getPeople(query: SearchQuery): Promise<ProviderResult<Person>>;
}

export interface CompanyProvider {
  getCompanies(query: SearchQuery): Promise<ProviderResult<Company>>;
}

// Web Search Types
export type WebSearchSource =
  | 'news'
  | 'web'
  | 'scholar-articles'
  | 'scholar-articles-enriched'
  | 'scholar-author';

export type WebSearchGeolocation =
  | 'US' | 'CA' | 'MX' | 'BR' | 'AR' | 'CL' | 'CO' | 'PE' | 'VE'  // Americas
  | 'GB' | 'DE' | 'FR' | 'IT' | 'ES' | 'PT' | 'NL' | 'BE' | 'CH' | 'AT' | 'PL' | 'SE' | 'NO' | 'DK' | 'FI' | 'IE' | 'RU' | 'UA' | 'CZ' | 'GR' | 'TR' | 'RO' | 'HU'  // Europe
  | 'JP' | 'CN' | 'KR' | 'IN' | 'ID' | 'TH' | 'VN' | 'MY' | 'SG' | 'PH' | 'TW' | 'HK'  // Asia-Pacific
  | 'SA' | 'AE' | 'IL' | 'EG'  // Middle East
  | 'AU' | 'NZ'  // Oceania
  | 'ZA' | 'NG' | 'KE';  // Africa

export interface WebSearchParams {
  query: string;
  geolocation?: WebSearchGeolocation;
  sources?: WebSearchSource[];
  site?: string;
  startDate?: number;  // Unix timestamp
  endDate?: number;    // Unix timestamp
  fetchContent?: boolean;
}

export interface WebSearchResultItem {
  source?: string;
  title: string;
  url: string;
  snippet: string;
  position: number;
  authors?: string[];  // For scholar results
  date?: string;
}

export interface WebFetchResult {
  success: boolean;
  url: string;
  timestamp: number;
  pageTitle: string;
  content: string;  // HTML content
  error?: string;
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  sanitizedQuery?: string;
  engine?: string;
  timestamp?: number;
  pageTitle?: string;
  results: WebSearchResultItem[];
  contents?: WebFetchResult[];  // Present when fetchContent=true
  metadata: {
    totalResults: number;
  };
}

export interface WebSearchProvider {
  search(params: WebSearchParams): Promise<ProviderResult<WebSearchResultItem>>;
  fetch(urls: string[]): Promise<WebFetchResult[]>;
}
