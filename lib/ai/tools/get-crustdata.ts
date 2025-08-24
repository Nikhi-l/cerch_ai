import { tool } from 'ai';
import { z } from 'zod';
import {
  fetchCompanyProfile,
  fetchCompanyPeople,
  getCrustdataApiKey,
  type CompanyProfileResponse,
  type CompanyPeopleResponse,
} from '@/lib/crustdata';

export const getCrustdata = tool({
  description:
    'Retrieve company profile information and optionally a people dump link from Crustdata',
  parameters: z.object({
    company: z
      .string()
      .describe('Company domain or numeric company_id to lookup'),
    fields: z.array(z.string()).optional(),
    includePeople: z
      .boolean()
      .optional()
      .describe('Whether to fetch a people dump link'),
    s3Username: z
      .string()
      .optional()
      .describe('Required when includePeople is true'),
  }),
  execute: async ({ company, fields, includePeople, s3Username }) => {
    const token = await getCrustdataApiKey();
    if (!token) {
      throw new Error('Missing Crustdata API key');
    }

    const isId = /^\d+$/.test(company);
    const profile = await fetchCompanyProfile(token, {
      ...(isId ? { company_id: Number(company) } : { company_domain: company }),
      fields,
    });

    if (!includePeople) {
      return { profile } as { profile: CompanyProfileResponse };
    }

    if (!s3Username) {
      throw new Error('s3Username is required when includePeople is true');
    }

    const companyId = profile[0]?.company_id;
    if (!companyId) {
      throw new Error('Company ID not found for people lookup');
    }

    const people = await fetchCompanyPeople(token, {
      company_id: companyId,
      s3_username: s3Username,
    });

    return { profile, people } as {
      profile: CompanyProfileResponse;
      people: CompanyPeopleResponse;
    };
  },
});

