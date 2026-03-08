import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOCALE_MAP: Record<string, string> = { en: 'en-GB', bg: 'bg-BG' };

function getIntlLocale(): string {
  if (typeof document !== 'undefined') {
    return LOCALE_MAP[document.documentElement.lang] ?? 'en-GB';
  }
  return 'en-GB';
}

export function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat(getIntlLocale(), { style: 'currency', currency }).format(amount);
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat(getIntlLocale(), { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(date),
  );
}

export function getMonthStr(offset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthsUntil(targetDate: string | Date): number {
  const now = new Date();
  const target = new Date(targetDate);
  return (
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  );
}
