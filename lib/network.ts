export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit & { timeoutMs?: number } = {},
) {
  const { timeoutMs = 60000, ...rest } = init;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
  try {
    return await fetch(input, { ...rest, signal: controller.signal as any });
  } finally {
    clearTimeout(id);
  }
}
