import type { UsageEventInput } from '@shared/types';
import { apiPost } from './api';

/**
 * تسجيل أحداث الاستخدام (Metadata فقط).
 *
 * قواعد مهمة:
 *  - لا نسجّل أي محتوى من النموذج (اسم طالب/درجة/ملاحظة) — أبداً.
 *  - لا نسجّل حدثاً عند كل ضغطة مفتاح؛ فقط الأحداث المهمة.
 *  - نمنع التكرار خلال نافذة قصيرة لتقليل الكتابة في D1.
 */

const DEDUPE_WINDOW_MS = 30_000;
const lastSent = new Map<string, number>();

function dedupeKey(event: UsageEventInput): string {
  return [event.eventType, event.toolId ?? '', event.templateId ?? ''].join('|');
}

export function trackEvent(event: UsageEventInput): void {
  const key = dedupeKey(event);
  const previous = lastSent.get(key) ?? 0;
  if (Date.now() - previous < DEDUPE_WINDOW_MS) return;
  lastSent.set(key, Date.now());

  // fire-and-forget: فشل التتبّع يجب ألا يعطّل عمل المعلم إطلاقاً.
  void apiPost('/api/events', event).catch(() => undefined);
}

/** يُستخدم في الاختبارات لإعادة ضبط ذاكرة منع التكرار. */
export function resetAnalyticsDedupe(): void {
  lastSent.clear();
}
