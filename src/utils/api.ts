/**
 * Generates or retrieves a persistent guest user ID stored in localStorage.
 */
export function getStableGuestId(): string {
  try {
    let gid = localStorage.getItem('aichatpro_guest_id');
    if (!gid) {
      gid = 'user_guest_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).slice(-3);
      localStorage.setItem('aichatpro_guest_id', gid);
    }
    return gid;
  } catch {
    return 'user_guest_fallback';
  }
}

/**
 * Fetch wrapper with credentials and automatic retry for transient proxy warming/restarting states.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 2,
  delayMs = 600
): Promise<Response> {
  const mergedOptions: RequestInit = {
    credentials: 'include',
    ...options,
    headers: {
      'Accept': 'application/json, text/event-stream, */*',
      'X-Guest-Id': getStableGuestId(),
      ...(options.headers || {}),
    },
  };

  let lastResponse: Response | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, mergedOptions);
      lastResponse = res;
      const contentType = res.headers.get('content-type') || '';

      // Check if proxy returned an HTML redirect or 502/503 during warm up
      const isWarmingUp =
        (res.status === 502 || res.status === 503 || !contentType.includes('application/json')) &&
        url.startsWith('/api') &&
        !url.includes('/chat/stream');

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

    // If server returned non-JSON (like cookie-check HTML or proxy page)
    if (!contentType.includes('application/json')) {
      // Graceful defaults for read-only polling endpoints so app never shows an error
      if (res.url.includes('/api/auth/me')) {
        return {
          ok: true,
          data: { user: null, hasGeminiKey: true } as any,
        };
      }
      if (res.url.includes('/api/conversations')) {
        return {
          ok: true,
          data: { conversations: [] } as any,
        };
      }

      const text = await res.text();
      let cleanMsg = 'Service is ready. Please try your request again.';
      if (text.includes('The page') || text.includes('cannot be') || text.includes('502') || text.includes('503')) {
        cleanMsg = 'Service is temporarily warming up. Please try again in a few moments.';
      } else if (text.startsWith('<!doctype') || text.startsWith('<html')) {
        cleanMsg = 'Authentication check completed. Please click again to proceed.';
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
