import { cookies } from 'next/headers';
import { getGoogleClient } from './googleClient';
import { getSession } from './session';

export async function getFreshAccessToken() {
  const cookieStore = cookies();
  const now = Date.now();
  const { data } = getSession();

  let accessToken = cookieStore.get('gc_access_token')?.value || data.tokens?.accessToken;
  let expiresAt = Number(cookieStore.get('gc_expires_at')?.value || data.tokens?.expiresAt);
  const refreshToken = cookieStore.get('gc_refresh_token')?.value || data.tokens?.refreshToken;

  if (accessToken && expiresAt && expiresAt > now + 60 * 1000) {
    return accessToken;
  }

  if (!refreshToken) return null;

  const client = await getGoogleClient();
  const tokenSet = await client.refresh(refreshToken);

  accessToken = tokenSet.access_token;
  const newRefresh = tokenSet.refresh_token || refreshToken;
  expiresAt = now + (tokenSet.expires_in || 3600) * 1000;

  cookieStore.set('gc_access_token', accessToken, { httpOnly: true, path: '/' });
  cookieStore.set('gc_refresh_token', newRefresh, { httpOnly: true, path: '/' });
  cookieStore.set('gc_expires_at', String(expiresAt), { httpOnly: true, path: '/' });

  data.tokens = {
    accessToken,
    refreshToken: newRefresh,
    expiresAt,
  };

  return accessToken;
}
