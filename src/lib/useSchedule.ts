import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiRequestError, apiFetch, apiPost } from './api';
import { timeToMinutes } from './education';
import type {
  ScheduleItem,
  ScheduleItemInput,
  ScheduleResponse,
  ScheduleSettings,
} from '@shared/types';

const DEFAULT_SETTINGS: ScheduleSettings = {
  periodsPerDay: 7,
  startTime: '07:00',
  periodMinutes: 45,
};

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiRequestError ? error.message : fallback;
}

/**
 * حالة الجدول الأسبوعي: تحميل، حفظ، وأخطاء.
 *
 * الخادم هو مصدر الحقيقة: كل عملية تُرجع الصف المحدَّث ونعكسه محلياً بدل
 * إعادة جلب الجدول كاملاً، فتبقى الواجهة سريعة على الجوال.
 */
export function useSchedule() {
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SETTINGS);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const response = await apiFetch<ScheduleResponse>('/api/schedule');
      setSettings(response.settings);
      setItems(response.items);
      setStatus('ready');
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(messageOf(error, 'تعذّر تحميل جدولك.'));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const saveSettings = useCallback(async (next: ScheduleSettings) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiPost<{ settings: ScheduleSettings }>(
        '/api/schedule/settings',
        next,
      );
      setSettings(response.settings);
      return true;
    } catch (error) {
      setErrorMessage(messageOf(error, 'تعذّر حفظ إعدادات الجدول.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const addItem = useCallback(async (input: ScheduleItemInput) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiPost<{ item: ScheduleItem }>('/api/schedule/items', input);
      setItems((current) => [...current, response.item]);
      return true;
    } catch (error) {
      setErrorMessage(messageOf(error, 'تعذّر إضافة الحصة.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const updateItem = useCallback(async (id: string, input: ScheduleItemInput) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const response = await apiPost<{ item: ScheduleItem }>('/api/schedule/items/update', {
        ...input,
        id,
      });
      setItems((current) =>
        current.map((item) => (item.id === id ? response.item : item)),
      );
      return true;
    } catch (error) {
      setErrorMessage(messageOf(error, 'تعذّر حفظ التعديل.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const removeItem = useCallback(async (id: string) => {
    setBusy(true);
    setErrorMessage(null);
    try {
      await apiPost('/api/schedule/items/delete', { id });
      setItems((current) => current.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      setErrorMessage(messageOf(error, 'تعذّر حذف الحصة.'));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const clearDay = useCallback(
    async (day: number | null) => {
      setBusy(true);
      setErrorMessage(null);
      try {
        await apiPost('/api/schedule/clear', { day });
        setItems((current) => (day === null ? [] : current.filter((item) => item.day !== day)));
        return true;
      } catch (error) {
        setErrorMessage(messageOf(error, 'تعذّر مسح الجدول.'));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return {
    settings,
    items,
    status,
    errorMessage,
    busy,
    reload: load,
    saveSettings,
    addItem,
    updateItem,
    removeItem,
    clearDay,
  };
}

/** يرتّب حصص يوم معيّن حسب رقم الحصة. */
export function itemsForDay(items: ScheduleItem[], day: number): ScheduleItem[] {
  return items.filter((item) => item.day === day).sort((a, b) => a.period - b.period);
}

/**
 * الحصة القادمة اليوم: أول حصة لم ينتهِ وقتها بعد.
 * إن انتهى اليوم الدراسي نُرجع null ليعرض الواجهة رسالة مناسبة.
 */
export function nextPeriod(
  items: ScheduleItem[],
  day: number,
  now = new Date(),
): ScheduleItem | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const today = itemsForDay(items, day).filter((item) => item.status !== 'cancelled');

  for (const item of today) {
    const end = timeToMinutes(item.endTime);
    if (end === null || end > minutesNow) return item;
  }
  return null;
}

/** ملخّص الأسبوع: عدد الحصص، والتحضير الناقص، والمتابعات المعلّقة. */
export function useWeekSummary(items: ScheduleItem[]) {
  return useMemo(() => {
    const active = items.filter((item) => item.status !== 'cancelled');
    return {
      total: active.length,
      needsPreparation: active.filter((item) => item.preparationStatus !== 'ready').length,
      pendingFollowups: active.filter((item) => item.followupStatus === 'pending').length,
      withHomework: active.filter((item) => !!item.homework).length,
    };
  }, [items]);
}
