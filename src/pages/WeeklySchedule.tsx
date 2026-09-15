import { useMemo, useState } from 'react';
import { Alert, EmptyState, Field, SelectField, Spinner, TextInput } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ErrorPage } from '@/pages/ErrorPage';
import { useCatalog } from '@/lib/useCatalog';
import { useSession } from '@/lib/useSession';
import { itemsForDay, useSchedule, useWeekSummary } from '@/lib/useSchedule';
import { WEEK_DAYS, gradeName, subjectName, todayScheduleDay } from '@/lib/education';
import type { ScheduleItem, ScheduleItemInput } from '@shared/types';

/**
 * الجدول الأسبوعي.
 *
 * على الجوال: تبويبات للأيام (لا شبكة عريضة تُجبر على التمرير الأفقي).
 * على سطح المكتب: نفس التبويبات مع مساحة أوسع لكل بطاقة.
 */
export function WeeklySchedulePage() {
  const { data } = useSession();
  const catalog = useCatalog();
  const schedule = useSchedule();
  const summary = useWeekSummary(schedule.items);

  const [activeDay, setActiveDay] = useState(() => todayScheduleDay());
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmClear, setConfirmClear] = useState<'day' | 'week' | null>(null);

  const dayItems = useMemo(
    () => itemsForDay(schedule.items, activeDay),
    [schedule.items, activeDay],
  );

  const profileSubjects = data?.profile.subjects ?? [];

  if (schedule.status === 'error') {
    return (
      <ErrorPage
        title="تعذّر تحميل جدولك"
        message={schedule.errorMessage ?? 'حاول تحديث الصفحة.'}
        onRetry={() => void schedule.reload()}
      />
    );
  }

  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const submitItem = async (input: ScheduleItemInput) => {
    const ok = editing
      ? await schedule.updateItem(editing.id, input)
      : await schedule.addItem(input);
    if (ok) closeForm();
  };

  /** ينسخ حصّة إلى أول رقم حصة فارغ في نفس اليوم. */
  const duplicateItem = async (item: ScheduleItem) => {
    const used = new Set(dayItems.map((entry) => entry.period));
    let period = item.period;
    while (used.has(period) && period < schedule.settings.periodsPerDay) period += 1;
    if (used.has(period)) {
      return;
    }
    await schedule.addItem({ ...toInput(item), period });
  };

  /** ينسخ كل حصص اليوم السابق إلى اليوم الحالي. */
  const copyPreviousDay = async () => {
    const order = WEEK_DAYS.map((day) => day.index);
    const position = order.indexOf(activeDay);
    const previous = order[position - 1];
    if (previous === undefined) return;

    const source = itemsForDay(schedule.items, previous);
    const used = new Set(dayItems.map((item) => item.period));
    for (const item of source) {
      if (used.has(item.period)) continue;
      await schedule.addItem({ ...toInput(item), day: activeDay });
    }
  };

  return (
    <div className="container page-section">
      <header className="page-head no-print">
        <div>
          <h1 className="title-lg">جدولي الأسبوعي</h1>
          <p className="muted small">
            {summary.total > 0
              ? `${summary.total} حصة هذا الأسبوع · ${summary.needsPreparation} بحاجة تحضير`
              : 'رتّب أسبوعك في دقائق، ثم اطبعه أو صدّره.'}
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowSettings((open) => !open)}
            aria-expanded={showSettings}
          >
            <Icon name="settings" size={16} /> إعدادات الجدول
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
            طباعة
          </button>
        </div>
      </header>

      {schedule.errorMessage ? (
        <div className="no-print" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <Alert tone="error" title="تعذّر إتمام العملية">
            {schedule.errorMessage}
          </Alert>
        </div>
      ) : null}

      {showSettings ? (
        <ScheduleSettingsCard
          settings={schedule.settings}
          busy={schedule.busy}
          onSave={async (next) => {
            const ok = await schedule.saveSettings(next);
            if (ok) setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      ) : null}

      <nav className="day-tabs no-print" aria-label="أيام الأسبوع">
        {WEEK_DAYS.map((day) => {
          const count = itemsForDay(schedule.items, day.index).length;
          return (
            <button
              key={day.index}
              type="button"
              className={`day-tab${activeDay === day.index ? ' is-active' : ''}`}
              aria-current={activeDay === day.index ? 'true' : undefined}
              onClick={() => setActiveDay(day.index)}
            >
              <span className="day-tab-name">{day.nameAr}</span>
              <span className="day-tab-count numeric">{count}</span>
            </button>
          );
        })}
      </nav>

      {schedule.status === 'loading' ? (
        <div className="card"><Spinner label="جارٍ تحميل جدولك…" /></div>
      ) : (
        <>
          <div className="schedule-list">
            {dayItems.length === 0 ? (
              <EmptyState
                title="ليس لديك حصص في هذا اليوم بعد"
                description="أضف أول حصة لتبدأ، أو انسخ حصص اليوم السابق."
              />
            ) : (
              dayItems.map((item) => (
                <ScheduleCard
                  key={item.id}
                  item={item}
                  subjectLabel={
                    item.subjectLabel || subjectName(catalog.data, item.subjectId) || 'بلا مادة'
                  }
                  gradeLabel={gradeName(catalog.data, item.gradeId)}
                  onEdit={() => {
                    setEditing(item);
                    setCreating(false);
                  }}
                  onDuplicate={() => void duplicateItem(item)}
                  onDelete={() => void schedule.removeItem(item.id)}
                  busy={schedule.busy}
                />
              ))
            )}
          </div>

          <div className="row no-print" style={{ marginBlockStart: 'var(--sp-5)' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setCreating(true);
                setEditing(null);
              }}
              disabled={schedule.busy}
            >
              <Icon name="check" size={16} /> إضافة حصة
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => void copyPreviousDay()}
              disabled={schedule.busy || WEEK_DAYS[0].index === activeDay}
            >
              نسخ اليوم السابق
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmClear('day')}
              disabled={schedule.busy || dayItems.length === 0}
            >
              مسح اليوم
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => setConfirmClear('week')}
              disabled={schedule.busy || schedule.items.length === 0}
            >
              مسح الأسبوع
            </button>
          </div>
        </>
      )}

      {confirmClear ? (
        <div className="card no-print" style={{ marginBlockStart: 'var(--sp-4)' }}>
          <Alert tone="warn" title="تأكيد المسح">
            {confirmClear === 'day'
              ? 'سيُحذف كل ما في هذا اليوم ولا يمكن التراجع.'
              : 'سيُحذف كل ما في الأسبوع ولا يمكن التراجع.'}
          </Alert>
          <div className="row" style={{ marginBlockStart: 'var(--sp-4)' }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={async () => {
                await schedule.clearDay(confirmClear === 'day' ? activeDay : null);
                setConfirmClear(null);
              }}
              disabled={schedule.busy}
            >
              نعم، امسح
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setConfirmClear(null)}
            >
              تراجع
            </button>
          </div>
        </div>
      ) : null}

      {creating || editing ? (
        <ScheduleForm
          key={editing?.id ?? 'new'}
          item={editing}
          day={activeDay}
          periodsPerDay={schedule.settings.periodsPerDay}
          usedPeriods={dayItems.map((item) => item.period)}
          subjects={catalog.data.subjects.filter(
            (subject) => !profileSubjects.length || profileSubjects.includes(subject.id),
          )}
          grades={catalog.data.grades}
          busy={schedule.busy}
          onSubmit={submitItem}
          onCancel={closeForm}
        />
      ) : null}
    </div>
  );
}

function toInput(item: ScheduleItem): ScheduleItemInput {
  return {
    day: item.day,
    period: item.period,
    subjectId: item.subjectId,
    subjectLabel: item.subjectLabel,
    gradeId: item.gradeId,
    className: item.className,
    lessonTitle: item.lessonTitle,
    notes: item.notes,
    homework: item.homework,
    status: item.status,
    preparationStatus: item.preparationStatus,
    followupStatus: item.followupStatus,
  };
}

const PREPARATION_LABELS: Record<ScheduleItem['preparationStatus'], string> = {
  not_started: 'لم يبدأ التحضير',
  in_progress: 'التحضير جارٍ',
  ready: 'جاهز',
};

function ScheduleCard({
  item,
  subjectLabel,
  gradeLabel,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
}: {
  item: ScheduleItem;
  subjectLabel: string;
  gradeLabel: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <article className={`schedule-card${item.status === 'cancelled' ? ' is-cancelled' : ''}`}>
      <div className="schedule-card-time">
        <span className="schedule-period numeric">الحصة {item.period}</span>
        {item.startTime ? (
          <span className="muted small numeric">
            {item.startTime} – {item.endTime}
          </span>
        ) : null}
      </div>

      <div className="schedule-card-body">
        <h3 className="schedule-subject">{subjectLabel}</h3>
        <p className="muted small">
          {[gradeLabel, item.className].filter(Boolean).join(' · ') || 'بلا صف محدّد'}
        </p>
        {item.lessonTitle ? <p className="schedule-lesson">{item.lessonTitle}</p> : null}
        {item.homework ? (
          <p className="small">
            <strong>واجب:</strong> {item.homework}
          </p>
        ) : null}
        <div className="schedule-tags">
          <span className={`tag tag-${item.preparationStatus}`}>
            {PREPARATION_LABELS[item.preparationStatus]}
          </span>
          {item.followupStatus === 'pending' ? <span className="tag tag-pending">متابعة معلّقة</span> : null}
          {item.status === 'done' ? <span className="tag tag-ready">تمّت</span> : null}
        </div>
      </div>

      <div className="schedule-card-actions no-print">
        <button type="button" className="btn btn-ghost btn-sm" onClick={onEdit} disabled={busy}>
          تعديل
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDuplicate} disabled={busy}>
          نسخ
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onDelete} disabled={busy}>
          حذف
        </button>
      </div>
    </article>
  );
}

function ScheduleSettingsCard({
  settings,
  busy,
  onSave,
  onCancel,
}: {
  settings: { periodsPerDay: number; startTime: string; periodMinutes: number };
  busy: boolean;
  onSave: (next: { periodsPerDay: number; startTime: string; periodMinutes: number }) => void;
  onCancel: () => void;
}) {
  const [periodsPerDay, setPeriods] = useState(String(settings.periodsPerDay));
  const [startTime, setStartTime] = useState(settings.startTime);
  const [periodMinutes, setMinutes] = useState(String(settings.periodMinutes));

  return (
    <div className="card no-print" style={{ marginBlockEnd: 'var(--sp-5)' }}>
      <h2 className="title-sm">إعدادات الجدول</h2>
      <div className="grid grid-3" style={{ marginBlockStart: 'var(--sp-4)' }}>
        <TextInput
          label="عدد الحصص في اليوم"
          type="number"
          min={1}
          max={12}
          value={periodsPerDay}
          onValueChange={setPeriods}
        />
        <Field label="وقت بداية اليوم" htmlFor="schedule-start">
          <input
            id="schedule-start"
            className="input"
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </Field>
        <TextInput
          label="مدة الحصة (دقيقة)"
          type="number"
          min={15}
          max={120}
          value={periodMinutes}
          onValueChange={setMinutes}
        />
      </div>
      <div className="row" style={{ marginBlockStart: 'var(--sp-4)' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            onSave({
              periodsPerDay: Number(periodsPerDay) || settings.periodsPerDay,
              startTime: startTime || settings.startTime,
              periodMinutes: Number(periodMinutes) || settings.periodMinutes,
            })
          }
        >
          حفظ الإعدادات
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          إغلاق
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({
  item,
  day,
  periodsPerDay,
  usedPeriods,
  subjects,
  grades,
  busy,
  onSubmit,
  onCancel,
}: {
  item: ScheduleItem | null;
  day: number;
  periodsPerDay: number;
  usedPeriods: number[];
  subjects: { id: string; nameAr: string }[];
  grades: { id: string; nameAr: string }[];
  busy: boolean;
  onSubmit: (input: ScheduleItemInput) => void;
  onCancel: () => void;
}) {
  const firstFree = useMemo(() => {
    for (let period = 1; period <= periodsPerDay; period += 1) {
      if (!usedPeriods.includes(period)) return period;
    }
    return 1;
  }, [periodsPerDay, usedPeriods]);

  const [period, setPeriod] = useState(String(item?.period ?? firstFree));
  const [subjectId, setSubjectId] = useState(item?.subjectId ?? '');
  const [subjectLabel, setSubjectLabel] = useState(item?.subjectLabel ?? '');
  const [gradeId, setGradeId] = useState(item?.gradeId ?? '');
  const [className, setClassName] = useState(item?.className ?? '');
  const [lessonTitle, setLessonTitle] = useState(item?.lessonTitle ?? '');
  const [homework, setHomework] = useState(item?.homework ?? '');
  const [preparationStatus, setPreparation] = useState(item?.preparationStatus ?? 'not_started');
  const [status, setStatus] = useState(item?.status ?? 'planned');

  const periodOptions = Array.from({ length: periodsPerDay }, (_value, index) => {
    const value = index + 1;
    const taken = usedPeriods.includes(value) && value !== item?.period;
    return { value: String(value), label: taken ? `الحصة ${value} (محجوزة)` : `الحصة ${value}` };
  });

  return (
    <div className="card card-lg no-print" style={{ marginBlockStart: 'var(--sp-5)' }}>
      <h2 className="title-sm">{item ? 'تعديل الحصة' : 'إضافة حصة'}</h2>

      <div className="grid grid-2" style={{ marginBlockStart: 'var(--sp-4)' }}>
        <SelectField
          label="رقم الحصة"
          value={period}
          options={periodOptions}
          onValueChange={setPeriod}
        />
        <SelectField
          label="المادة"
          value={subjectId}
          options={[
            { value: '', label: 'اختر المادة' },
            ...subjects.map((subject) => ({ value: subject.id, label: subject.nameAr })),
          ]}
          onValueChange={setSubjectId}
        />
        <TextInput
          label="اسم المادة (إن لم تكن في القائمة)"
          value={subjectLabel}
          placeholder="مثال: التربية الفنية"
          onValueChange={setSubjectLabel}
        />
        <SelectField
          label="الصف"
          value={gradeId}
          options={[
            { value: '', label: 'اختر الصف' },
            ...grades.map((grade) => ({ value: grade.id, label: grade.nameAr })),
          ]}
          onValueChange={setGradeId}
        />
        <TextInput
          label="الفصل"
          value={className}
          placeholder="مثال: أ"
          onValueChange={setClassName}
        />
        <TextInput
          label="عنوان الدرس"
          value={lessonTitle}
          placeholder="مثال: جمع الكسور"
          onValueChange={setLessonTitle}
        />
        <TextInput
          label="الواجب"
          value={homework}
          placeholder="مثال: تمارين صفحة 42"
          onValueChange={setHomework}
        />
        <SelectField
          label="حالة التحضير"
          value={preparationStatus}
          options={[
            { value: 'not_started', label: 'لم يبدأ' },
            { value: 'in_progress', label: 'جارٍ' },
            { value: 'ready', label: 'جاهز' },
          ]}
          onValueChange={(value) => setPreparation(value as ScheduleItem['preparationStatus'])}
        />
        <SelectField
          label="حالة الحصة"
          value={status}
          options={[
            { value: 'planned', label: 'مجدولة' },
            { value: 'done', label: 'تمّت' },
            { value: 'cancelled', label: 'ملغاة' },
          ]}
          onValueChange={(value) => setStatus(value as ScheduleItem['status'])}
        />
      </div>

      <div className="row" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() =>
            onSubmit({
              day,
              period: Number(period) || 1,
              subjectId: subjectId || null,
              subjectLabel: subjectLabel || null,
              gradeId: gradeId || null,
              className: className || null,
              lessonTitle: lessonTitle || null,
              homework: homework || null,
              preparationStatus,
              status,
            })
          }
        >
          {busy ? <Spinner label="جارٍ الحفظ…" /> : item ? 'حفظ التعديل' : 'إضافة الحصة'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          إلغاء
        </button>
      </div>
    </div>
  );
}
