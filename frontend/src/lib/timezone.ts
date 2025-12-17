/**
 * Timezone utility functions for consistent JST handling
 */

// Japan Standard Time offset (UTC+9)
const JST_OFFSET_HOURS = 9;

/**
 * Convert UTC date string to JST Date object
 */
export function toJSTDate(utcDateString: string): Date {
  const safeStr = utcDateString.endsWith('Z') || utcDateString.includes('+') ? utcDateString : `${utcDateString}Z`;
  return new Date(safeStr);
}

/**
 * Get the date string (YYYY-MM-DD) in JST from a UTC timestamp
 */
export function toJSTDateString(utcDateString: string): string {
  // Ensure strict UTC parsing
  const safeStr = utcDateString.endsWith('Z') || utcDateString.includes('+') ? utcDateString : `${utcDateString}Z`;
  const date = new Date(safeStr);

  // Add JST offset to get JST time, then extract date
  const jstTime = new Date(date.getTime() + JST_OFFSET_HOURS * 60 * 60 * 1000);
  return jstTime.toISOString().split('T')[0];
}

/**
 * Format a UTC timestamp as JST date string for display
 * @param utcDateString - ISO timestamp string
 * @param format - Format string: 'date' | 'time' | 'datetime' | 'full'
 */
export function formatJSTDateTime(
  utcDateString: string,
  format: 'date' | 'time' | 'datetime' | 'full' = 'datetime'
): string {
  const safeStr = utcDateString.endsWith('Z') || utcDateString.includes('+') ? utcDateString : `${utcDateString}Z`;
  const date = new Date(safeStr);

  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Tokyo',
  };

  switch (format) {
    case 'date':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      break;
    case 'time':
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'datetime':
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
    case 'full':
      options.year = 'numeric';
      options.month = 'long';
      options.day = 'numeric';
      options.weekday = 'short';
      options.hour = '2-digit';
      options.minute = '2-digit';
      break;
  }

  return date.toLocaleString('ja-JP', options);
}

/**
 * Get current date in JST as YYYY-MM-DD string
 */
export function getJSTToday(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
}

/**
 * Check if a UTC timestamp is "today" in JST
 */
export function isJSTToday(utcDateString: string): boolean {
  return toJSTDateString(utcDateString) === getJSTToday();
}
