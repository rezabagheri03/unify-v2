/**
 * src/lib/api-client.ts — Centralized axios client.
 * - Adds Authorization header from auth store
 * - Adds X-CSRF-Token from cookie on state-changing methods
 * - Refreshes access token on 401
 * - Emits Socket.io-style events for downstream UI consumers
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getCsrfToken } from '@/lib/csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for CSRF cookie to be sent
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // CSRF token for state-changing methods
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      config.headers['X-CSRF-Token'] = csrf;
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (!refreshToken) {
          useAuthStore.getState().logout();
          return Promise.reject(error);
        }
        refreshPromise = axios
          .post(`${API_URL}/api/auth/refresh`, { refreshToken }, { withCredentials: true })
          .then((res) => {
            const newAccessToken = res.data.data.accessToken;
            useAuthStore.getState().setAccessToken(newAccessToken);
            return newAccessToken;
          })
          .catch(() => {
            useAuthStore.getState().logout();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      const newToken = await refreshPromise;
      if (newToken && originalRequest.headers) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        const csrf = getCsrfToken();
        if (csrf) originalRequest.headers['X-CSRF-Token'] = csrf;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  },
);
