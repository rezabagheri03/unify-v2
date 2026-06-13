'use client';

/**
 * src/lib/sanitize.tsx — XSS-safe rendering of user-generated content.
 *
 * Golden Doc §F.2: "Sanitize all user-generated content before rendering in the browser"
 *
 * React escapes by default but rich-text fields (message bodies, ticket
 * content, FAQ answers, notice board content) may contain pasted HTML
 * from external sources. Use these helpers to render any content that
 * could possibly contain HTML.
 */

import DOMPurify from 'isomorphic-dompurify';

const ALLOWED_TAGS = ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'ul', 'ol', 'li', 'a', 'code', 'pre'];
const ALLOWED_ATTR = ['href', 'title'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Render user-generated content as safe HTML.
 * Used for message bodies, ticket content, FAQ answers, notice board content.
 */
export function SafeHtml({ html }: { html: string }) {
  // eslint-disable-next-line react/no-danger
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

/**
 * Render plain text safely (escapes all HTML).
 * Use this when the content should NEVER be HTML.
 */
export function SafeText({ text }: { text: string }) {
  return <span>{text}</span>;
}
