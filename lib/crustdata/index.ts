import { cookies } from 'next/headers';

export * from './client';
export * from './transform';

export async function getCrustdataApiKey() {
  const cookieStore = await cookies();
  return cookieStore.get('crustdata-api-key')?.value;
}
