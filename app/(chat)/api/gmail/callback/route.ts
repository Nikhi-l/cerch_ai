import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGoogleClient, getRedirectUri } from '@/lib/googleClient';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  const cookieStore = cookies();
  const storedState = cookieStore.get('gc_oauth_state')?.value;
  const codeVerifier = cookieStore.get('gc_code_verifier')?.value;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect('/?connected=0');
  }

  const client = await getGoogleClient();
  const tokenSet = await client.callback(getRedirectUri(), { code, state }, { code_verifier: codeVerifier });

  const access = tokenSet.access_token;
  const refresh = tokenSet.refresh_token;
  if (!access || !refresh) {
    return NextResponse.redirect('/?connected=0');
  }

  const { data } = getSession();
  const expiresAt = Date.now() + (tokenSet.expires_in || 3600) * 1000;
  data.tokens = {
    accessToken: access,
    refreshToken: refresh,
    expiresAt,
  };

  cookieStore.set('gc_access_token', access, { httpOnly: true, path: '/' });
  cookieStore.set('gc_refresh_token', refresh, { httpOnly: true, path: '/' });
  cookieStore.set('gc_expires_at', String(expiresAt), { httpOnly: true, path: '/' });

  cookieStore.delete('gc_oauth_state');
  cookieStore.delete('gc_code_verifier');

  return NextResponse.redirect('/?connected=1');
}
