/**
 * فهرس الأعمال المحفوظة على الجهاز.
 *
 * الأدوات تحفظ بياناتها في LocalStorage تحت المفتاح `tool:<id>`. هذا الملف
 * يقرأ تلك المفاتيح ليبني قائمة «مستنداتي» — بلا إرسال أي شيء إلى الخادم.
 *
 * ما يُقرأ هنا: معرّف الأداة ووقت آخر تعديل فقط. لا نقرأ محتوى المستند
 * ولا نعرضه في القائمة، فبيانات الطلاب لا تغادر الأداة نفسها.
 */
import { loadLocal, removeLocal, saveLocal, storageAvailable, toolStorageKey } from './storage';

const INDEX_KEY = 'documents-index';

export interface SavedWork {
  toolId: string;
  updatedAt: string;
}

type IndexShape = Record<string, string>;

function readIndex(): IndexShape {
  return loadLocal<IndexShape>(INDEX_KEY, {});
}

/** يسجّل أن أداة حُفظ فيها عمل الآن. تستدعيها الأداة عند الحفظ التلقائي. */
export function touchSavedWork(toolId: string, when = new Date()): void {
  if (!storageAvailable) return;
  const index = readIndex();
  index[toolId] = when.toISOString();
  saveLocal(INDEX_KEY, index);
}

/** قائمة الأعمال المحفوظة، الأحدث أولاً. */
export function listSavedWork(): SavedWork[] {
  if (!storageAvailable) return [];

  const index = readIndex();
  return Object.entries(index)
    .filter(([toolId]) => {
      // نعرض الأداة فقط إن كانت بياناتها ما زالت موجودة فعلاً على الجهاز.
      try {
        return localStorage.getItem(`teacher-tools:${toolStorageKey(toolId)}`) !== null;
      } catch {
        return false;
      }
    })
    .map(([toolId, updatedAt]) => ({ toolId, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** يحذف عمل أداة من الجهاز ويزيلها من الفهرس. */
export function removeSavedWork(toolId: string): void {
  removeLocal(toolStorageKey(toolId));
  const index = readIndex();
  delete index[toolId];
  saveLocal(INDEX_KEY, index);
}
