import type { CompanyPeopleResponse, CompanyProfile } from './client';

export interface FlattenCompany {
  company_name?: string;
  company_id?: number;
  linkedin_headcount?: number;
  decision_maker_names?: string;
  [key: string]: unknown;
}

export function flattenCompany(profile: CompanyProfile): FlattenCompany {
  const flattened: FlattenCompany = {
    company_name: profile.company_name,
    company_id: profile.company_id,
  };

  const headcount: any = (profile as any).headcount;
  if (headcount && typeof headcount === 'object') {
    flattened.linkedin_headcount = headcount.linkedin_headcount;
  }

  const decisionMakers: any = (profile as any).decision_makers;
  if (Array.isArray(decisionMakers)) {
    flattened.decision_maker_names = decisionMakers
      .map((dm: any) => dm?.name)
      .filter(Boolean)
      .join(';');
  }

  return flattened;
}

export function flattenPeople(res: CompanyPeopleResponse): Record<string, string> {
  return { people_s3_uri: res.s3_uri };
}

export function toCsv(objects: Array<Record<string, unknown>>): string {
  if (!objects.length) return '';
  const headers = Object.keys(objects[0]);
  const rows = objects.map((obj) =>
    headers
      .map((h) => {
        const val = obj[h];
        if (val === undefined || val === null) return '';
        return String(val).replace(/"/g, '""');
      })
      .join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export function companyToCsv(profiles: CompanyProfile[]): string {
  const rows = profiles.map(flattenCompany);
  return toCsv(rows);
}

export function peopleToCsv(res: CompanyPeopleResponse): string {
  return toCsv([flattenPeople(res)]);
}

