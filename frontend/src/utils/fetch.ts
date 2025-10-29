/**
 * Centralized fetch utility for API calls
 * In development: uses relative URLs (proxied by Vite)
 * In production: uses relative URLs (proxied by Nginx) OR absolute URL from VITE_API_URL
 */

// Get base URL: empty in dev (uses proxy), can be absolute in prod
const getBaseUrl = (): string => {
  // In production, you can use VITE_API_URL if you want absolute URLs
  // Otherwise, leave empty to use relative URLs with Nginx proxy
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    // Only use absolute URL if explicitly set and different from current origin
    const apiUrl = import.meta.env.VITE_API_URL;
    // If VITE_API_URL points to a different origin, use it
    // Otherwise, use relative URLs (empty string)
    try {
      const url = new URL(apiUrl);
      const currentOrigin = window.location.origin;
      if (url.origin !== currentOrigin) {
        return apiUrl;
      }
    } catch {
      // Invalid URL, use relative
    }
  }
  return '';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Enhanced fetch with automatic base URL handling
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;
  
  // Add ngrok header by default
  const headers = new Headers(init?.headers || {});
  if (!headers.has('ngrok-skip-browser-warning')) {
    headers.set('ngrok-skip-browser-warning', 'true');
  }
  
  return fetch(url, {
    ...init,
    headers,
  });
}

/**
 * JSON fetch helper with error handling
 */
export async function apiFetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(path, init);
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const errorMessage = errorData.message || `HTTP ${res.status}: ${res.statusText}`;
    throw new Error(errorMessage);
  }
  
  return res.json();
}

