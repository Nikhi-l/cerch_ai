import { expect, test } from '@playwright/test';
import { companyToCsv, peopleToCsv } from '@/lib/crustdata/transform';
import type { CompanyPeopleResponse, CompanyProfile } from '@/lib/crustdata';

test('companyToCsv flattens company name, headcount and decision makers', () => {
  const profile: CompanyProfile = {
    company_id: 1,
    company_name: 'Acme Inc',
    headcount: { linkedin_headcount: 123 },
    decision_makers: [{ name: 'Alice' }, { name: 'Bob' }],
  } as any;

  const csv = companyToCsv([profile]);
  expect(csv).toBe(
    'company_name,company_id,linkedin_headcount,decision_maker_names\nAcme Inc,1,123,Alice;Bob'
  );
});

test('peopleToCsv outputs s3 link row', () => {
  const res: CompanyPeopleResponse = { s3_uri: 's3://bucket/file.jsonl.gz' };
  const csv = peopleToCsv(res);
  expect(csv).toBe('people_s3_uri\ns3://bucket/file.jsonl.gz');
});

