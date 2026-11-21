import { API_BASE_URL } from '../constants/api';
import { authStorage } from './authStorage';

type UnauthorizedHandler = () => void;
const unauthorizedHandlers: Set<UnauthorizedHandler> = new Set();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

export async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await authStorage.getToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!headers.has('Content-Type') && !isFormData && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${normalizedEndpoint}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    await authStorage.clear();
    unauthorizedHandlers.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        console.error('[apiClient] Error executing unauthorized handler:', err);
      }
    });
  }

  return response;
}
