import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';

interface SessionData {
  tokens?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

const store = new Map<string, SessionData>();

export function getSession() {
  const cookieStore = cookies();
  let id = cookieStore.get('gc_session_id')?.value;
  if (!id) {
    id = randomUUID();
    cookieStore.set('gc_session_id', id, { httpOnly: true, path: '/' });
  }
  let data = store.get(id);
  if (!data) {
    data = {};
    store.set(id, data);
  }
  return { id, data };
}
