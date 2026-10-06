/**
 * FinTrack Universal Currency Formatter
 * Supports configurable currency symbol and ISO currency code (Default: INR ₹)
 */

export const CURRENCY_CONFIG = {
  code: 'INR',
  symbol: '₹',
  locale: 'en-IN',
};

/**
 * Format a numeric amount into a localized currency string.
 * e.g. formatCurrency(1250.50) -> "₹1,250.50"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return `${CURRENCY_CONFIG.symbol}0.00`;

  return `${CURRENCY_CONFIG.symbol}${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
