import { Link } from 'react-router-dom';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { useSession } from '@/lib/useSession';
import { useCatalog } from '@/lib/useCatalog';
import { useSchedule, itemsForDay, nextPeriod, useWeekSummary } from '@/lib/useSchedule';
import { useTools } from '@/lib/useTools';
import {
  dayName,
  gradeName,
  greeting,
  isSchoolDay,
  subjectName,
  todayLabel,
  todayScheduleDay,
} from '@/lib/education';

/** اختصارات ثابتة تشير إلى صفحات موجودة فعلاً — لا أزرار معطّلة. */
const QUICK_ACTIONS: { to: string; label: string; icon: IconName }[] = [
  { to: '/schedule', label: 'جدولي الأسبوعي', icon: 'calendar' },
  { to: '/tools/student-followup', label: 'خطة متابعة', icon: 'clipboard' },
  { to: '/tools/error-map', label: 'تحليل نتائج', icon: 'chart' },
  { to: '/tools', label: 'كل الأدوات', icon: 'tools' },
];

/**
 * لوحة المعلم: ماذا يحدث اليوم، ثم ماذا أفعل الآن.
 * كل بطاقة تجيب سؤالاً واحداً وتنتهي بخطوة تالية واضحة.
 */
export function TeacherDashboard() {
  const { data } = useSession();
  const catalog = useCatalog();
  const schedule = useSchedule();
  const tools = useTools();
  const summary = useWeekSummary(schedule.items);

  const today = todayScheduleDay();
  const upcoming = nextPeriod(schedule.items, today);
  const todayItems = itemsForDay(schedule.items, today);
  const suggested = tools.items.filter((tool) => tool.audience !== 'student').slice(0, 3);

  return (
    <div className="container page-section">
      <header className="page-head">
        <div className="dash-greeting">
          <h1 className="title-lg">{greeting(data?.user.name)}</h1>
          <p className="muted small">{todayLabel()}</p>
        </div>
        {data?.user.role === 'admin' ? (
          <Link className="btn btn-secondary btn-sm" to="/admin">
            <Icon name="settings" size={16} /> لوحة الإدارة
          </Link>
        ) : null}
      </header>

      <div className="dash-cards">
        <section className="card card-lg next-period">
          <h2 className="title-sm">
            <Icon name="clock" size={18} /> {isSchoolDay() ? 'حصّتك القادمة' : `أول يوم دراسي: ${dayName(today)}`}
          </h2>

          {schedule.status === 'loading' ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <Spinner label="جارٍ قراءة جدولك…" />
            </div>
          ) : todayItems.length === 0 ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <p className="muted">جدولك الأسبوعي غير مكتمل.</p>
              <Link
                className="btn btn-primary"
                to="/schedule"
                style={{ marginBlockStart: 'var(--sp-4)' }}
              >
                <Icon name="plus" size={16} /> أضف جدولك
              </Link>
            </div>
          ) : upcoming ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <span className="next-period-time">
                <Icon name="clock" size={16} />
                {upcoming.startTime ?? '—'} – {upcoming.endTime ?? '—'}
              </span>
              <h3 className="title-md" style={{ marginBlockStart: 'var(--sp-2)' }}>
                {upcoming.subjectLabel || subjectName(catalog.data, upcoming.subjectId) || 'حصة'}
              </h3>
              <p className="muted">
                {[gradeName(catalog.data, upcoming.gradeId), upcoming.className]
                  .filter(Boolean)
                  .join(' · ') || 'بلا صف محدّد'}
              </p>
              {upcoming.lessonTitle ? <p>{upcoming.lessonTitle}</p> : null}
              <Link
                className="btn btn-secondary btn-sm"
                to="/schedule"
                style={{ marginBlockStart: 'var(--sp-4)' }}
              >
                فتح الجدول
              </Link>
            </div>
          ) : (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <p className="muted">انتهت حصص اليوم. استرِح — أو حضّر للغد.</p>
              <Link
                className="btn btn-secondary btn-sm"
                to="/schedule"
                style={{ marginBlockStart: 'var(--sp-4)' }}
              >
                مراجعة الجدول
              </Link>
            </div>
          )}
        </section>

        <section className="card card-lg">
          <h2 className="title-sm">هذا الأسبوع</h2>
          <div className="stat-row" style={{ marginBlockStart: 'var(--sp-4)' }}>
            <div className="stat-tile">
              <span className="stat-value">{summary.total}</span>
              <span className="stat-label">حصة</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{summary.needsPreparation}</span>
              <span className="stat-label">بحاجة تحضير</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{summary.pendingFollowups}</span>
              <span className="stat-label">متابعة معلّقة</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{summary.withHomework}</span>
              <span className="stat-label">حصة بواجب</span>
            </div>
          </div>
        </section>
      </div>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">اختصارات سريعة</h2>
        <div className="quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.to} className="quick-action" to={action.to}>
              <span className="icon-wrap">
                <Icon name={action.icon} size={22} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">أدوات مقترحة لك</h2>
        {tools.status === 'loading' ? (
          <div className="card" style={{ marginBlockStart: 'var(--sp-4)' }}>
            <Spinner label="جارٍ تحميل الأدوات…" />
          </div>
        ) : tools.status === 'error' ? (
          <div style={{ marginBlockStart: 'var(--sp-4)' }}>
            <Alert tone="error" title="تعذّر تحميل الأدوات">
              {tools.errorMessage ?? 'حدّث الصفحة وحاول مرة أخرى.'}
            </Alert>
          </div>
        ) : suggested.length === 0 ? (
          <div style={{ marginBlockStart: 'var(--sp-4)' }}>
            <EmptyState
              title="لا توجد أدوات مطابقة لملفك بعد"
              description="حدّث مرحلتك وموادك من صفحة حسابي لنقترح عليك أدوات أنسب."
              action={
                <Link className="btn btn-secondary" to="/account">
                  تعديل ملفي
                </Link>
              }
            />
          </div>
        ) : (
          <div className="tools-grid" style={{ marginBlockStart: 'var(--sp-4)' }}>
            {suggested.map((tool) => (
              <Link key={tool.id} className="tool-card" to={`/tools/${tool.slug}`}>
                <span className="tool-icon">
                  <Icon name={(tool.icon as IconName) ?? 'tools'} size={22} />
                </span>
                <h3 className="tool-name">{tool.nameAr}</h3>
                <p className="tool-desc">{tool.descriptionAr}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
