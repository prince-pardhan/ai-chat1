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
