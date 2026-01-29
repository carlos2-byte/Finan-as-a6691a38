/**
 * Formatting utilities for currency and dates
 */

export function formatCurrency(
  amount: number,
  currency: string = 'BRL',
  locale: string = 'pt-BR'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(
  dateString: string,
  locale: string = 'pt-BR',
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, options);
}

export function formatFullDate(
  dateString: string,
  locale: string = 'pt-BR'
): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatMonthYear(
  month: string,
  locale: string = 'pt-BR'
): string {
  const date = new Date(`${month}-01`);
  return date.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getPreviousMonth(month: string): string {
  const date = new Date(`${month}-01`);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getNextMonth(month: string): string {
  const date = new Date(`${month}-01`);
  date.setMonth(date.getMonth() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthsInRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let current = startMonth;
  
  while (current <= endMonth) {
    months.push(current);
    current = getNextMonth(current);
  }
  
  return months;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
