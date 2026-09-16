import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, EmptyState } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { TOOLS } from '@/features/tools/registry';
import { listSavedWork, removeSavedWork, type SavedWork } from '@/lib/saved-work';

/**
 * «مستنداتي» — أعمالك المحفوظة على هذا الجهاز.
 *
 * قرار خصوصية مقصود: محتوى المستندات (أسماء الطلاب، درجاتهم، ملاحظاتهم)
 * لا يُرسل إلى الخادم إطلاقاً. هذه الصفحة تقرأ ما حفظته الأدوات محلياً فقط،
 * ولهذا تظهر القائمة على الجهاز الذي أنشأتَ فيه العمل.
 */
export function DocumentsPage() {
  const [items, setItems] = useState<SavedWork[]>(() => listSavedWork());
  const [confirming, setConfirming] = useState<string | null>(null);

  const toolNames = useMemo(
    () => new Map(TOOLS.map((tool) => [tool.id, tool.nameAr])),
    [],
  );

  const remove = (toolId: string) => {
    removeSavedWork(toolId);
    setItems(listSavedWork());
    setConfirming(null);
  };

  return (
    <div className="container page-section">
      <header style={{ marginBlockEnd: 'var(--sp-5)' }}>
        <h1 className="title-lg">مستنداتي</h1>
        <p className="muted small" style={{ marginBlockStart: 'var(--sp-2)' }}>
          أعمالك محفوظة على هذا الجهاز فقط. لا تُرسل بيانات طلابك إلى أي خادم.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          title="ليس لديك مستندات بعد"
          description="افتح أي أداة وابدأ — يُحفظ عملك تلقائياً على جهازك ويظهر هنا."
          action={
            <Link className="btn btn-primary" to="/tools">
              تصفّح الأدوات
            </Link>
          }
        />
      ) : (
        <div className="stack">
          {items.map((item) => (
            <article className="card" key={item.toolId}>
              <div className="card-head" style={{ marginBlockEnd: 'var(--sp-2)' }}>
                <div>
                  <h2 className="title-sm">{toolNames.get(item.toolId) ?? item.toolId}</h2>
                  <p className="muted small">
                    آخر تعديل:{' '}
                    <span className="numeric">
                      {new Intl.DateTimeFormat('ar', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        numberingSystem: 'latn',
                      }).format(new Date(item.updatedAt))}
                    </span>
                  </p>
                </div>
                <Icon name="doc" size={20} />
              </div>

              <div className="row">
                <Link className="btn btn-primary btn-sm" to={`/tools/${item.toolId}`}>
                  فتح ومتابعة
                </Link>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirming(item.toolId)}
                >
                  حذف من الجهاز
                </button>
              </div>

              {confirming === item.toolId ? (
                <div style={{ marginBlockStart: 'var(--sp-4)' }}>
                  <Alert tone="warn" title="تأكيد الحذف">
                    سيُحذف هذا العمل من جهازك نهائياً ولا يمكن التراجع.
                  </Alert>
                  <div className="row" style={{ marginBlockStart: 'var(--sp-3)' }}>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => remove(item.toolId)}
                    >
                      نعم، احذف
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setConfirming(null)}
                    >
                      تراجع
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
