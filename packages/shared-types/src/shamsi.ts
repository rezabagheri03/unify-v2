/**
 * @unify/shared-types — Shamsi (Jalali) Calendar Utilities
 * ALL rules for date handling across the entire codebase (Agent Guide §6.4):
 *   STORAGE:  UTC DateTime in PostgreSQL
 *   DISPLAY:  Shamsi before rendering in UI
 *   INPUT:    Accept Shamsi input, convert to UTC before storage
 *   API:      Return BOTH formats
 */

import jalaali from 'jalaali-js';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** Convert Latin digits to Persian digits */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[parseInt(d, 10)]);
}

/** Convert UTC Date → Shamsi "YYYY/MM/DD" string */
export function toShamsi(date: Date): string {
  const j = jalaali.toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${j.jy}/${pad(j.jm)}/${pad(j.jd)}`;
}

/** Convert UTC Date → Shamsi "YYYY/MM/DD HH:MM" string with Persian digits */
export function toShamsiDateTime(date: Date): string {
  const j = jalaali.toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return toPersianDigits(`${j.jy}/${pad(j.jm)}/${pad(j.jd)} - ${hours}:${minutes}`);
}

/** Convert Shamsi "YYYY/MM/DD" string → UTC Date (interpreted as midnight UTC) */
export function fromShamsi(shamsi: string): Date {
  const parts = shamsi.split('/').map((p) => parseInt(p.trim(), 10));
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid Shamsi date format: "${shamsi}". Expected "YYYY/MM/DD".`);
  }
  const [jy, jm, jd] = parts;
  const g = jalaali.toGregorian(jy, jm, jd);
  return new Date(Date.UTC(g.gy, g.gm - 1, g.gd));
}

/** Compare two Dates ignoring time — true if same Shamsi day */
export function isSameShamsiDay(a: Date, b: Date): boolean {
  return toShamsi(a) === toShamsi(b);
}

/** Persian month names */
export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

/** Persian weekday names (Saturday → Friday) */
export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
] as const;

/** Returns human-readable Shamsi with month name, e.g. "۱ فروردین ۱۴۰۳" */
export function toShamsiLong(date: Date): string {
  const j = jalaali.toJalaali(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
  return toPersianDigits(`${j.jd} ${PERSIAN_MONTHS[j.jm - 1]} ${j.jy}`);
}

/** Convert "HH:MM" 24h string to Persian display */
export function toPersianTime(time24: string): string {
  const parts = time24.split(':');
  if (parts.length !== 2) return toPersianDigits(time24);
  return toPersianDigits(`${parts[0]}:${parts[1]}`);
}

/** Days between two dates (inclusive of start, exclusive of end) */
export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Add days to a date (returns new Date, doesn't mutate) */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
