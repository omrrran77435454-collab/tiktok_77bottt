/** تنسيق التواريخ والأرقام بالعربية (أرقام لاتينية لسهولة القراءة في الجداول). */

const dateFormatter = new Intl.DateTimeFormat('ar', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  numberingSystem: 'latn',
});

/**
 * الوقت بنظام 24 ساعة وبدون علامة «ص/م».
 * السبب: دمج تاريخ رقمي + وقت + علامة عربية في نص واحد يجعل ترتيب
 * المقاطع يبدو مقلوباً داخل واجهة RTL (مشكلة Bidi معروفة).
 * لذلك نبني النص من اسم شهر عربي + وقت 24 ساعة، وهو واضح بلا لبس.
 */
const timeFormatter = new Intl.DateTimeFormat('ar', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  numberingSystem: 'latn',
});

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return dateFormatter.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return `${dateFormatter.format(date)} — ${timeFormatter.format(date)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar', { numberingSystem: 'latn' }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** تاريخ اليوم بصيغة YYYY-MM-DD لحقول <input type="date">. */
export function todayInputValue(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
