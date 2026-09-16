import { Link } from 'react-router-dom';
import { Alert, EmptyState, Spinner } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { useSession } from '@/lib/useSession';
import { useCatalog } from '@/lib/useCatalog';
import { itemsForDay, nextPeriod, useSchedule } from '@/lib/useSchedule';
import { useTools } from '@/lib/useTools';
import { greeting, subjectName, todayLabel, todayScheduleDay } from '@/lib/education';

const QUICK_ACTIONS: { to: string; label: string; icon: IconName }[] = [
  { to: '/schedule', label: 'جدولي', icon: 'calendar' },
  { to: '/tools/study-plan', label: 'خطة المذاكرة', icon: 'book' },
  { to: '/tools/homework-organizer', label: 'واجباتي', icon: 'clipboard' },
  { to: '/tools/exam-prep', label: 'قبل الاختبار', icon: 'target' },
];

/**
 * لوحة الطالب — مختلفة تماماً عن لوحة المعلم.
 * تجيب: ماذا عندي اليوم، وما الواجبات، وماذا أذاكر الآن.
 */
export function StudentDashboard() {
  const { data } = useSession();
  const catalog = useCatalog();
  const schedule = useSchedule();
  const tools = useTools();

  const today = todayScheduleDay();
  const todayItems = itemsForDay(schedule.items, today);
  const upcoming = nextPeriod(schedule.items, today);
  const homework = schedule.items.filter((item) => !!item.homework);
  const suggested = tools.items.filter((tool) => tool.audience !== 'teacher').slice(0, 4);

  return (
    <div className="container page-section">
      <header className="page-head">
        <div className="dash-greeting">
          <h1 className="title-lg">{greeting(data?.user.name)}</h1>
          <p className="muted small">{todayLabel()}</p>
        </div>
      </header>

      <div className="dash-cards">
        <section className="card card-lg next-period">
          <h2 className="title-sm">
            <Icon name="clock" size={18} /> حصّتك القادمة
          </h2>

          {schedule.status === 'loading' ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <Spinner label="جارٍ قراءة جدولك…" />
            </div>
          ) : todayItems.length === 0 ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <p className="muted">ليس لديك جدول بعد.</p>
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
              {upcoming.lessonTitle ? <p className="muted">{upcoming.lessonTitle}</p> : null}
            </div>
          ) : (
            <p className="muted" style={{ marginBlockStart: 'var(--sp-4)' }}>
              انتهت حصص اليوم. وقت مناسب للمراجعة.
            </p>
          )}
        </section>

        <section className="card card-lg">
          <h2 className="title-sm">واجباتي</h2>
          {schedule.status === 'loading' ? (
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <Spinner label="جارٍ التحميل…" />
            </div>
          ) : homework.length === 0 ? (
            <p className="muted" style={{ marginBlockStart: 'var(--sp-4)' }}>
              لا توجد واجبات مسجّلة. أضفها من الجدول لتظهر هنا.
            </p>
          ) : (
            <ul className="stack-sm" style={{ marginBlockStart: 'var(--sp-4)', paddingInlineStart: '1.1rem' }}>
              {homework.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.subjectLabel || subjectName(catalog.data, item.subjectId) || 'مادة'}:
                  </strong>{' '}
                  {item.homework}
                </li>
              ))}
            </ul>
          )}
          <Link
            className="btn btn-secondary btn-sm"
            to="/tools/homework-organizer"
            style={{ marginBlockStart: 'var(--sp-4)' }}
          >
            منظّم الواجبات
          </Link>
        </section>
      </div>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">ابدأ من هنا</h2>
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
        <h2 className="title-md">أدواتك</h2>
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
              description="حدّث مرحلتك وموادك من صفحة حسابي."
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
