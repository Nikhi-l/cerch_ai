import { Issuer } from 'openid-client';

export const googleIssuerPromise = Issuer.discover('https://accounts.google.com');

export async function getGoogleClient() {
  const issuer = await googleIssuerPromise;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth credentials');
  }
  return new issuer.Client({
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [getRedirectUri()],
    response_types: ['code'],
  });
}

export function getRedirectUri() {
  return process.env.GOOGLE_REDIRECT_URI || '/api/gmail/callback';
}

export const GOOGLE_SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
];
