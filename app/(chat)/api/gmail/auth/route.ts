import { NextResponse } from 'next/server';
import { generators } from 'openid-client';
import { GOOGLE_SCOPES, getGoogleClient } from '@/lib/googleClient';
import { getSession } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET() {
  // Ensure session cookie exists
  getSession();

  const client = await getGoogleClient();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();

  const authUrl = client.authorizationUrl({
    scope: GOOGLE_SCOPES.join(' '),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  const cookieStore = cookies();
  cookieStore.set('gc_code_verifier', codeVerifier, { httpOnly: true, path: '/' });
  cookieStore.set('gc_oauth_state', state, { httpOnly: true, path: '/' });

  return NextResponse.redirect(authUrl);
}
