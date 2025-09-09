import type { Person } from './types';

function hasNonEmptyUrl(url?: string): boolean {
  if (!url) return false;
  const t = String(url).trim();
  if (!t) return false;
  const lowered = t.toLowerCase();
  if (lowered === 'null' || lowered === 'undefined') return false;
  return true;
}

/**
 * Returns a new array with rows sorted so that entries with a non-empty
 * profile_image_url appear first. Stable for rows with same image presence.
 */
export function sortPeopleByImage<T extends { profile_image_url?: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aHas = hasNonEmptyUrl(a.profile_image_url);
    const bHas = hasNonEmptyUrl(b.profile_image_url);
    if (aHas === bHas) return 0;
    return aHas ? -1 : 1;
  });
}

export type { Person };

