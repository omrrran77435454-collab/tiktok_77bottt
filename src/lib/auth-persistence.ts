/**
 * تثبيت بقاء جلسة Firebase على القرص.
 *
 * لماذا ملف مستقل؟ لأن هذا المنطق هو سبب المشكلة الحقيقية ويجب أن يكون
 * قابلاً للاختبار بلا تحميل حزمة Firebase كاملة. الدوال هنا لا تستورد
 * Firebase إطلاقاً — تستقبل ما تحتاجه كوسائط (Dependency Injection).
 *
 * المشكلة التي يعالجها: getAuth() يهيّئ سلسلة تخزين تنتهي بـ
 *   [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
 * فإذا تعذّرت تهيئة IndexedDB و localStorage معاً — وهو وارد على Android داخل
 * WebView أو مع تقسيم التخزين — تهبط Firebase بصمت إلى تخزين الجلسة، فتُفقد
 * الجلسة عند إغلاق التبويب ويُطلب تسجيل الدخول من جديد.
 */

/** أين استقرّ تخزين الجلسة فعلياً. */
export type PersistenceOutcome = 'indexeddb' | 'local' | 'none';

export interface PersistenceDeps<TAuth, TPersistence> {
  setPersistence: (auth: TAuth, persistence: TPersistence) => Promise<void>;
  /** التخزين المفضّل: IndexedDB. */
  indexedDB: TPersistence;
  /** البديل: localStorage. */
  local: TPersistence;
  /** يُستدعى عندما يمنع المتصفّح كل تخزين دائم. */
  onUnavailable?: (error: unknown) => void;
}

/**
 * يطلب IndexedDB أولاً ثم localStorage. لا يقبل تخزين الجلسة إطلاقاً،
 * ولا يرمي خطأً: منع التخزين لا يجوز أن يمنع تسجيل الدخول نفسه.
 */
export async function applyLocalPersistence<TAuth, TPersistence>(
  auth: TAuth,
  deps: PersistenceDeps<TAuth, TPersistence>,
): Promise<PersistenceOutcome> {
  try {
    await deps.setPersistence(auth, deps.indexedDB);
    return 'indexeddb';
  } catch {
    // IndexedDB غير متاح (وضع خاص، WebView مقيَّد، حصة ممتلئة) — نجرّب البديل.
  }

  try {
    await deps.setPersistence(auth, deps.local);
    return 'local';
  } catch (error) {
    deps.onUnavailable?.(error);
    return 'none';
  }
}
