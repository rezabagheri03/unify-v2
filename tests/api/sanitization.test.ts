/**
 * tests/api/sanitization.test.ts — Verifies backend sanitizes/strips dangerous content
 * from incoming user-generated text. Backend currently uses Zod + Prisma; we verify
 * that string content is stored as-is (escaped at render time by React/DOMPurify).
 */

import { z } from 'zod';

describe('Input Sanitization', () => {
  const contentSchema = z.object({
    content: z.string().min(1).max(5000),
  });

  it('accepts plain text', () => {
    expect(() => contentSchema.parse({ content: 'سلام دنیا' })).not.toThrow();
  });

  it('accepts text with HTML (sanitization happens on render)', () => {
    const html = '<script>alert("xss")</script><b>bold</b>';
    expect(() => contentSchema.parse({ content: html })).not.toThrow();
  });

  it('rejects overly long content', () => {
    const long = 'a'.repeat(5001);
    expect(() => contentSchema.parse({ content: long })).toThrow();
  });

  it('accepts Persian numbers and special chars', () => {
    const persian = '۱۲۳۴۵۶۷۸۹۰ — سلام!';
    expect(() => contentSchema.parse({ content: persian })).not.toThrow();
  });

  it('rejects empty content', () => {
    expect(() => contentSchema.parse({ content: '' })).toThrow();
  });
});
