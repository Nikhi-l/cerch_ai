export const CRUSTDATA_API_BASE_URL = 'https://api.crustdata.com';
const COMPANY_ENDPOINT = '/screener/company';
const PEOPLE_ENDPOINT = '/screener/company/people';

function buildQuery(params: Record<string, string | number | boolean | string[] | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      searchParams.set(key, value.join(','));
    } else {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const crustdataHeaders = (token: string): HeadersInit => ({
  Authorization: `Token ${token}`,
});

export interface CompanyProfile {
  company_id: number;
  company_name: string;
  company_website_domain?: string;
  company_website?: string;
  linkedin_profile_url?: string;
  linkedin_id?: string;
  hq_country?: string;
  headquarters?: string;
  employee_count_range?: string;
  [key: string]: unknown;
}

export type CompanyProfileResponse = CompanyProfile[];

export interface CompanyPeopleResponse {
  s3_uri: string;
}

export interface CompanyProfileParams {
  company_domain?: string | string[];
  company_name?: string | string[];
  company_linkedin_url?: string | string[];
  company_id?: number | number[];
  fields?: string | string[];
  enrich_realtime?: boolean;
  exact_match?: boolean;
}

export interface CompanyPeopleParams {
  company_linkedin_id?: string | number;
  company_id?: string | number;
  company_name?: string;
  s3_username: string;
  version?: string;
  job_id?: string;
}

export async function fetchCompanyProfile(
  token: string,
  params: CompanyProfileParams
): Promise<CompanyProfileResponse> {
  const res = await fetch(
    `${CRUSTDATA_API_BASE_URL}${COMPANY_ENDPOINT}${buildQuery(params)}`,
    { headers: crustdataHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch company profile: ${res.status}`);
  }
  return res.json();
}

export async function fetchCompanyPeople(
  token: string,
  params: CompanyPeopleParams
): Promise<CompanyPeopleResponse> {
  const res = await fetch(
    `${CRUSTDATA_API_BASE_URL}${PEOPLE_ENDPOINT}${buildQuery(params)}`,
    { headers: crustdataHeaders(token) }
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch company people: ${res.status}`);
  }
  return res.json();
}
