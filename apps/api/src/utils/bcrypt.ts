/**
 * src/utils/bcrypt.ts — Password hashing wrapper.
 */

import bcrypt from 'bcryptjs';
import { config } from '../config';

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, config.bcrypt.costFactor);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/** Generate a cryptographically random password */
export function generateRandomPassword(length = 12): string {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const specials = '!@#$%^&*';
  const all = uppercase + lowercase + digits + specials;

  // Ensure at least one of each class
  const out: string[] = [];
  out.push(uppercase[Math.floor(Math.random() * uppercase.length)]);
  out.push(digits[Math.floor(Math.random() * digits.length)]);
  out.push(specials[Math.floor(Math.random() * specials.length)]);

  for (let i = 3; i < length; i++) {
    out.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out.join('');
}
