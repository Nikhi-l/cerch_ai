export type SearchQuery = {
  q: string;
  filters?: Record<string, string | number | boolean>;
  limit?: number;
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
};

export interface PeopleProvider {
  getPeople(query: SearchQuery): Promise<ProviderResult<Person>>;
}

export interface CompanyProvider {
  getCompanies(query: SearchQuery): Promise<ProviderResult<Company>>;
}

