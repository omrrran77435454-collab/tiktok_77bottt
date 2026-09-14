/**
 * أدوات تشفير صغيرة تعتمد على Web Crypto المتوفّر في Workers.
 * لا نستخدم Math.random أبداً للقيم الأمنية.
 */

/** يولّد توكن عشوائي آمن بصيغة base64url (لا يحتاج ترميز في الروابط). */
export function generateSecureToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** يُرجع بصمة SHA-256 بصيغة hex — نخزّن البصمة فقط وليس التوكن نفسه. */
export async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * مقارنة ثابتة الزمن لمنع هجمات التوقيت (timing attacks).
 * تُستخدم للتحقق من سرّ الـ Webhook.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // نوحّد الطول أولاً حتى لا يكشف الفرق في الطول عن معلومة عبر زمن التنفيذ.
  const length = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < length; i += 1) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}
