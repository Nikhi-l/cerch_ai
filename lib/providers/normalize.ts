import type { Company, Person } from './types';

export function toCSV(headers: string[], rows: Array<Record<string, any>>): string {
  const escapeCsv = (v: any) => {
    const s = v == null ? '' : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.join(',');
  const lines = rows.map((r) => headers.map((h) => escapeCsv(r[h])).join(','));
  return [headerLine, ...lines].join('\n');
}

export function normalizePeopleRows(rows: any[]): Person[] {
  return rows.map((r) => {
    const currentEmp = Array.isArray(r.current_employers) && r.current_employers.length > 0 ? r.current_employers[0] : undefined;
    const title = r.default_position_title || currentEmp?.title || r.title || r.role || r.job_title || '';
    const company = currentEmp?.name || r.company || r.organization || r.employer || '';
    const linkedin = r.linkedin_profile_url || r.flagship_profile_url || r.linkedin_url || r.linkedin || '';
    const profileImg = r.profile_picture_url || r.profile_image_url || r.avatar || r.image || '';
    const description = r.headline || r.summary || r.description || '';
    const location = r.region || r.location || r.city || '';

    return {
      name: r.name || r.full_name || r.person_name || '',
      title,
      company,
      industry: r.industry || '',
      location,
      linkedin_url: linkedin,
      website: r.website || r.url || '',
      profile_image_url: profileImg,
      description,
      tags: r.tags || '',
    };
  });
}

export function normalizeCompanyRows(rows: any[]): Company[] {
  return rows.map((r) => {
    const name = r.company_name || r.name || '';
    const industries = r.taxonomy?.linkedin_industries || r.industries || r.industry;
    const industry = Array.isArray(industries) ? industries.join(', ') : industries || '';
    const website = r.company_website || (r.company_website_domain ? `https://${r.company_website_domain}` : '') || r.website || r.url || '';
    const location = r.headquarters || r.hq_country || r.largest_headcount_country || r.location || '';
    const size = r.linkedin_headcount || r.headcount || '';
    const funding = r.crunchbase_total_investment_usd || r.last_funding_round_investment_usd || r.funding || '';
    const logo_url = r.linkedin_logo_url || r.logo_url || r.logo || r.image || '';
    const description = r.linkedin_company_description || r.description || '';

    return {
      name,
      industry,
      company_url: website,
      linkedin_url: r.linkedin_profile_url || r.linkedin_url || r.linkedin || '',
      location,
      size,
      funding,
      logo_url,
      description,
      tags: r.tags || '',
    };
  });
}
