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
