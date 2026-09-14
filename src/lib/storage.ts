/**
 * حفظ محلي على جهاز المستخدم فقط.
 *
 * قرار خصوصية أساسي: بيانات الطلاب (أسماء، درجات، ملاحظات) لا تُرسل إلى
 * الخادم إطلاقاً. تبقى هنا في LocalStorage الخاص بمتصفّح المعلم فقط،
 * ويستطيع مسحها بضغطة زر من داخل الأداة.
 */

const PREFIX = 'teacher-tools:';

function key(name: string): string {
  return `${PREFIX}${name}`;
}

function isAvailable(): boolean {
  try {
    const probe = `${PREFIX}__probe__`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    // وضع التصفّح الخاص أو تعطيل التخزين — نعمل بدون حفظ.
    return false;
  }
}

export const storageAvailable = isAvailable();

export function loadLocal<T>(name: string, fallback: T): T {
  if (!storageAvailable) return fallback;
  try {
    const raw = localStorage.getItem(key(name));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveLocal(name: string, value: unknown): void {
  if (!storageAvailable) return;
  try {
    localStorage.setItem(key(name), JSON.stringify(value));
  } catch {
    // تجاوز حصة التخزين — نتجاهل بهدوء بدل كسر الواجهة.
  }
}

export function removeLocal(name: string): void {
  if (!storageAvailable) return;
  try {
    localStorage.removeItem(key(name));
  } catch {
    /* لا شيء */
  }
}

/** يمسح كل بيانات أداة معيّنة من الجهاز. */
export function clearToolData(toolId: string): void {
  removeLocal(`tool:${toolId}`);
}

export function toolStorageKey(toolId: string): string {
  return `tool:${toolId}`;
}
