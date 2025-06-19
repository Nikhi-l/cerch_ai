import 'server-only';

import axios from 'axios';

/**
 * Shared Axios instance for communicating with the Exa Websets API.
 */
const exaClient = axios.create({
  baseURL: process.env.EXA_BASE ?? 'https://api.exa.ai',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.EXA_API_KEY ?? '',
  },
});

export interface CreateWebsetBody {
  category: string;
  criteria: Array<string>;
}

/**
 * Create a new Webset with the given category and criteria.
 */
export async function createWebset(body: CreateWebsetBody) {
  const { data } = await exaClient.post<{ id: string }>('/v1/websets', body);
  return data;
}

/**
 * Fetch all items for the specified Webset ID.
 */
export async function getWebsetItems(id: string) {
  const { data } = await exaClient.get(`/v1/websets/${id}/items`);
  return data;
}

/**
 * Enrich a Webset with additional attributes.
 */
export async function enrichWebset<T extends Record<string, unknown>>(
  id: string,
  body: T,
) {
  const { data } = await exaClient.post(`/v1/websets/${id}/enrich`, body);
  return data;
}

/**
 * Search within a Webset using the provided filters.
 */
export async function searchWebset<T extends Record<string, unknown>>(
  id: string,
  body: T,
) {
  const { data } = await exaClient.post(`/v1/websets/${id}/search`, body);
  return data;
}

/**
 * Export a Webset as CSV data.
 */
export async function exportWebset(id: string) {
  const { data } = await exaClient.get(`/v1/websets/${id}/export`);
  return data;
}
