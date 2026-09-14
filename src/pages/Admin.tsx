import { useEffect, useState } from 'react';
import { ApiRequestError, apiFetch } from '@/lib/api';
import { LoadingScreen } from '@/components/ui';
import { ErrorPage } from './ErrorPage';
import { UnauthorizedPage } from './Unauthorized';
import { BarChart, RankBars } from '@/components/MiniChart';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { DOC_TEMPLATES } from '@/features/document/templates';
import type { AdminStatsResponse, UsageEventType } from '@shared/types';

const EVENT_LABELS: Record<UsageEventType, string> = {
  login: 'تسجيل دخول',
  telegram_linked: 'ربط تيليجرام',
  subscription_verified: 'تأكيد اشتراك',
  subscription_failed: 'فشل تحقّق',
  tool_opened: 'فتح أداة',
  export_pdf: 'تصدير PDF',
  export_png: 'تصدير PNG',
  print: 'طباعة',
  template_selected: 'اختيار قالب',
};

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'brand' | 'good' | 'warn';
}) {
  return (
    <div className={`stat-card${tone ? ` stat-${tone}` : ''}`}>
      <span className="stat-card-value numeric">{value}</span>
      <span className="stat-card-label">{label}</span>
      {hint ? <span className="stat-card-hint">{hint}</span> : null}
    </div>
  );
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  const load = () => {
    setState('loading');
    apiFetch<AdminStatsResponse>('/api/admin/stats')
      .then((response) => {
        setStats(response);
        setState('ready');
      })
      .catch((error) => {
        if (error instanceof ApiRequestError && (error.status === 403 || error.status === 401)) {
          setState('forbidden');
          return;
        }
        setState('error');
      });
  };

  useEffect(() => {
    // تحميل الإحصاءات عند فتح الصفحة — التحديث يقع بعد انتهاء الطلب.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
     
  }, []);

  if (state === 'loading') return <LoadingScreen label="جارٍ تحميل الإحصاءات…" />;
  if (state === 'forbidden') return <UnauthorizedPage />;
  if (state === 'error' || !stats) {
    return <ErrorPage title="تعذّر تحميل الإحصاءات" onRetry={load} />;
  }

  const templateName = (id: string) =>
    DOC_TEMPLATES.find((template) => template.id === id)?.nameAr ?? id;

  return (
    <div className="container page-section">
      <header className="dash-head">
        <div>
          <span className="eyebrow">لوحة الإدارة</span>
          <h1 className="title-lg" style={{ marginBlockStart: 'var(--sp-3)' }}>
            إحصاءات المنصة
          </h1>
          <p className="muted small">
            جميع الأرقام هنا بيانات استخدام عامة فقط — لا تحتوي أي بيانات طلاب أو محتوى مستندات.
          </p>
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
          تحديث
        </button>
      </header>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">المستخدمون</h2>
        <div className="stats-grid" style={{ marginBlockStart: 'var(--sp-4)' }}>
          <StatCard label="إجمالي المستخدمين" value={formatNumber(stats.users.total)} tone="brand" />
          <StatCard label="جدد اليوم" value={formatNumber(stats.users.newToday)} />
          <StatCard label="جدد هذا الأسبوع" value={formatNumber(stats.users.newThisWeek)} />
          <StatCard label="جدد هذا الشهر" value={formatNumber(stats.users.newThisMonth)} />
          <StatCard label="نشطون اليوم" value={formatNumber(stats.users.activeToday)} tone="good" />
          <StatCard label="نشطون آخر 7 أيام" value={formatNumber(stats.users.activeLast7)} />
          <StatCard label="نشطون آخر 30 يوماً" value={formatNumber(stats.users.activeLast30)} />
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">Telegram والتصدير</h2>
        <div className="stats-grid" style={{ marginBlockStart: 'var(--sp-4)' }}>
          <StatCard label="حسابات مرتبطة" value={formatNumber(stats.telegram.linked)} />
          <StatCard label="اشتراكات مؤكَّدة" value={formatNumber(stats.telegram.verified)} tone="good" />
          <StatCard label="تحقّق غير مكتمل" value={formatNumber(stats.telegram.failed)} tone="warn" />
          <StatCard label="ملفات PDF" value={formatNumber(stats.exports.pdf)} />
          <StatCard label="صور PNG" value={formatNumber(stats.exports.png)} />
          <StatCard label="عمليات طباعة" value={formatNumber(stats.exports.print)} />
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <div className="admin-columns">
          <div className="card">
            <h2 className="title-sm">النشاط خلال 14 يوماً</h2>
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <BarChart
                label="عدد الأحداث اليومية خلال آخر أربعة عشر يوماً"
                points={stats.eventsPerDay.map((point) => ({
                  label: point.day.slice(5),
                  value: point.count,
                }))}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="title-sm">أكثر الأدوات استخداماً</h2>
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <RankBars
                items={stats.tools.map((tool) => ({ label: tool.nameAr, value: tool.opened }))}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="title-sm">أكثر القوالب استخداماً</h2>
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <RankBars
                items={stats.templates.map((item) => ({
                  label: templateName(item.templateId),
                  value: item.count,
                }))}
              />
            </div>
          </div>

          <div className="card">
            <h2 className="title-sm">أكثر الألوان الأساسية استخداماً</h2>
            <div style={{ marginBlockStart: 'var(--sp-4)' }}>
              <RankBars
                items={stats.colors.map((item) => ({
                  label: item.color,
                  value: item.count,
                  color: item.color,
                }))}
              />
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-md">تفاصيل الأدوات</h2>
        <div className="table-scroll" style={{ marginBlockStart: 'var(--sp-4)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">الأداة</th>
                <th scope="col">مرات الفتح</th>
                <th scope="col">عمليات التصدير</th>
              </tr>
            </thead>
            <tbody>
              {stats.tools.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">
                    لا توجد بيانات بعد.
                  </td>
                </tr>
              ) : (
                stats.tools.map((tool) => (
                  <tr key={tool.toolId}>
                    <td>{tool.nameAr}</td>
                    <td className="numeric">{formatNumber(tool.opened)}</td>
                    <td className="numeric">{formatNumber(tool.exports)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginBlockStart: 'var(--sp-8)' }}>
        <div className="admin-columns">
          <div>
            <h2 className="title-md">آخر المستخدمين المسجّلين</h2>
            <div className="table-scroll" style={{ marginBlockStart: 'var(--sp-4)' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">الاسم</th>
                    <th scope="col">البريد</th>
                    <th scope="col">التسجيل</th>
                    <th scope="col">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        لا يوجد مستخدمون بعد.
                      </td>
                    </tr>
                  ) : (
                    stats.recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td className="muted small">{user.email}</td>
                        <td className="small">{formatDate(user.createdAt)}</td>
                        <td>
                          <span
                            className={`badge badge-${
                              user.isMember ? 'success' : user.linked ? 'warn' : 'neutral'
                            }`}
                          >
                            {user.isMember ? 'مفعّل' : user.linked ? 'مربوط' : 'غير مربوط'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="title-md">آخر النشاطات</h2>
            <div className="card" style={{ marginBlockStart: 'var(--sp-4)' }}>
              {stats.recentActivity.length === 0 ? (
                <p className="muted small">لا توجد نشاطات بعد.</p>
              ) : (
                <ul className="activity-list">
                  {stats.recentActivity.map((item, index) => (
                    <li className="activity-item" key={`${item.createdAt}-${index}`}>
                      <span className="activity-type">{EVENT_LABELS[item.eventType]}</span>
                      {item.toolId ? <span className="activity-tool">{item.toolId}</span> : null}
                      <span className="activity-time muted small">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
