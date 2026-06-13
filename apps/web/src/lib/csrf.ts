/**
 * src/lib/csrf.ts — Read CSRF cookie set by the server.
 * The server's csrf.middleware.ts issues a 'unify-csrf' cookie on first visit
 * and validates that the request sends back the same value in the
 * `X-CSRF-Token` header for all state-changing methods.
 */

export const CSRF_COOKIE = 'unify-csrf';
export const CSRF_HEADER = 'X-CSRF-Token';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.substring(CSRF_COOKIE.length + 1));
}
