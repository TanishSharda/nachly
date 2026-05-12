/**
 * API Client utilities for standardized request/response handling
 * Provides typed API calls with automatic error handling and loading states
 */

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Parse error from response
 */
export function parseApiError(response: Response, data: unknown): ApiError {
  // Handle standard error format
  if (data && typeof data === 'object' && 'error' in data) {
    return {
      code: 'API_ERROR',
      message: String(data.error),
      statusCode: response.status,
      details: typeof data === 'object' ? data : undefined,
    };
  }

  // Handle Supabase errors
  if (data && typeof data === 'object' && 'message' in data) {
    return {
      code: String((data as any).code || 'DB_ERROR'),
      message: String((data as any).message),
      statusCode: response.status,
      details: data as Record<string, unknown>,
    };
  }

  return {
    code: `HTTP_${response.status}`,
    message: response.statusText || 'An error occurred',
    statusCode: response.status,
  };
}

interface FetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * Typed fetch wrapper with error handling
 */
export async function fetchAPI<T>(
  url: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: ApiError | null }> {
  const { timeout = 30000, ...fetchOpts } = options;

  try {
    // Add default headers
    const headers = new Headers(fetchOpts.headers);
    if (!headers.has('Content-Type') && fetchOpts.body) {
      headers.set('Content-Type', 'application/json');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOpts,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const error = parseApiError(response, data);
        return { data: null, error };
      }

      return { data: data?.data || data, error: null };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      return {
        data: null,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network request failed. Please check your connection.',
          statusCode: 0,
        },
      };
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        data: null,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: 'Request timeout',
          statusCode: 0,
        },
      };
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      data: null,
      error: {
        code: 'UNKNOWN_ERROR',
        message: errorMessage,
        statusCode: 0,
      },
    };
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(
  url: string,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  return fetchAPI<T>(url, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  url: string,
  body?: Record<string, unknown>,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  return fetchAPI<T>(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  url: string,
  body?: Record<string, unknown>,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  return fetchAPI<T>(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
  url: string,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  return fetchAPI<T>(url, { ...options, method: 'DELETE' });
}

/**
 * PATCH request helper
 */
export async function apiPatch<T>(
  url: string,
  body?: Record<string, unknown>,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  return fetchAPI<T>(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}
