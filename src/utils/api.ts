/**
 * Fetch wrapper with automatic retry for transient proxy warming/restarting states (502/503 or HTML errors).
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  delayMs = 700
): Promise<Response> {
  let lastResponse: Response | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';

      // If this is an API call that returned a 502/503 or non-JSON HTML error page (proxy warming up)
      const isWarmingUp =
        (res.status === 502 || res.status === 503 || !contentType.includes('application/json')) &&
        url.startsWith('/api');

      if (isWarmingUp && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
        continue;
      }
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Network connection failed. Please check your connection.');
}

/**
 * Safely parse JSON from a fetch Response, protecting against HTML error pages
 * or proxy responses like "The page cannot be found..." which cause SyntaxError.
 */
export async function safeParseJson<T = any>(
  res: Response
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      let cleanMsg = 'Invalid server response format.';
      if (text.includes('The page') || text.includes('cannot be') || text.includes('502') || text.includes('503')) {
        cleanMsg = 'Service is temporarily warming up or unavailable. Please try again in a few seconds.';
      } else if (text.startsWith('<!doctype') || text.startsWith('<html')) {
        cleanMsg = 'Server returned a web page instead of data.';
      } else if (text.trim().length > 0 && text.length < 150) {
        cleanMsg = text.trim();
      }
      return {
        ok: false,
        data: null,
        error: cleanMsg,
      };
    }

    const data = await res.json();
    return {
      ok: res.ok,
      data,
      error: data?.error,
    };
  } catch (err: any) {
    return {
      ok: false,
      data: null,
      error: 'Unable to parse server response. Please try again.',
    };
  }
}
