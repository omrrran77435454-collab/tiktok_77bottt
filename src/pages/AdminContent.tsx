import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, EmptyState, SelectField, Spinner, TextArea, TextInput } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ApiRequestError, apiFetch, apiPost } from '@/lib/api';
import { resetCatalogCache } from '@/lib/useCatalog';
import type {
  AdminAuditEntry,
  CatalogResponse,
  ToolAudience,
  ToolCatalogItem,
  ToolStatus,
} from '@shared/types';

interface AdminCatalog extends CatalogResponse {
  tools: ToolCatalogItem[];
  audit: AdminAuditEntry[];
}

type Section = 'tools' | 'categories' | 'subjects' | 'structure' | 'audit';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'tools', label: 'الأدوات' },
  { id: 'categories', label: 'الأقسام' },
  { id: 'subjects', label: 'المواد' },
  { id: 'structure', label: 'المراحل والصفوف' },
  { id: 'audit', label: 'سجل الإدارة' },
];

const STATUS_LABELS: Record<ToolStatus, string> = {
  draft: 'مسودّة',
  published: 'منشورة',
  disabled: 'معطّلة',
};

const AUDIENCE_LABELS: Record<ToolAudience, string> = {
  teacher: 'معلم',
  student: 'طالب',
  both: 'الاثنان',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  delete: 'حذف',
  publish: 'نشر',
  unpublish: 'إلغاء نشر',
  disable: 'تعطيل',
  reorder: 'إعادة ترتيب',
};

/**
 * إدارة محتوى المنصّة.
 *
 * كل إجراء هنا يمرّ بنقطة API محمية بـ requireAdmin في الخادم — إخفاء هذه
 * الصفحة عن غير الإدمن تحسين تجربة فقط، لا حماية.
 */
export function AdminContent() {
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [section, setSection] = useState<Section>('tools');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // useCallback حتى تكون مرجعاً ثابتاً صالحاً كاعتمادية للتأثير.
  const load = useCallback(() => {
    // التحديث يقع داخل Promise بعد انتهاء الطلب، لا تزامنياً داخل التأثير.
    apiFetch<AdminCatalog>('/api/admin/catalog')
      .then((response) => {
        setCatalog(response);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<unknown>, successMessage: string) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      // الكتالوج المخزَّن في الواجهة صار قديماً بعد أي تعديل إداري.
      resetCatalogCache();
      load();
      setMessage(successMessage);
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر تنفيذ العملية. حاول مرة أخرى.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (state === 'loading') return <Spinner label="جارٍ تحميل المحتوى…" />;
  if (state === 'error' || !catalog) {
    return (
      <Alert tone="error" title="تعذّر تحميل المحتوى">
        حدّث الصفحة وحاول مرة أخرى.
      </Alert>
    );
  }

  return (
    <div className="stack">
      <nav className="filter-row" aria-label="أقسام الإدارة">
        {SECTIONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`chip${section === entry.id ? ' is-selected' : ''}`}
            aria-pressed={section === entry.id}
            onClick={() => setSection(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </nav>

      {message ? <Alert tone="success">{message}</Alert> : null}
      {error ? (
        <Alert tone="error" title="تعذّر التنفيذ">
          {error}
        </Alert>
      ) : null}

      {section === 'tools' ? (
        <ToolsSection catalog={catalog} busy={busy} run={run} />
      ) : null}

      {section === 'categories' ? (
        <CategoriesSection catalog={catalog} busy={busy} run={run} />
      ) : null}

      {section === 'subjects' ? (
        <SubjectsSection catalog={catalog} busy={busy} run={run} />
      ) : null}

      {section === 'structure' ? (
        <StructureSection catalog={catalog} busy={busy} run={run} />
      ) : null}

      {section === 'audit' ? <AuditSection entries={catalog.audit} /> : null}
    </div>
  );
}

type Runner = (action: () => Promise<unknown>, successMessage: string) => Promise<void>;

function ToolsSection({
  catalog,
  busy,
  run,
}: {
  catalog: AdminCatalog;
  busy: boolean;
  run: Runner;
}) {
  const [editing, setEditing] = useState<ToolCatalogItem | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <section className="card card-lg">
      <div className="card-head">
        <h2 className="title-md">الأدوات ({catalog.tools.length})</h2>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => {
            setCreating(true);
            setEditing(null);
          }}
        >
          <Icon name="plus" size={16} /> أداة جديدة
        </button>
      </div>

      <div className="stack-sm">
        {catalog.tools.map((tool) => (
          <article key={tool.id} className="admin-row">
            <div>
              <strong>{tool.nameAr}</strong>
              <p className="muted small">
                {AUDIENCE_LABELS[tool.audience]} · {STATUS_LABELS[tool.status]} ·{' '}
                <span className="numeric">ترتيب {tool.sortOrder}</span>
                {tool.isImplemented ? '' : ' · بلا تنفيذ (لن تُعرض)'}
              </p>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setEditing(tool);
                  setCreating(false);
                }}
              >
                تعديل
              </button>
              {tool.status === 'published' ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => apiPost('/api/admin/tools/status', { id: tool.id, status: 'disabled' }),
                      'تم تعطيل الأداة.',
                    )
                  }
                >
                  تعطيل
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () => apiPost('/api/admin/tools/status', { id: tool.id, status: 'published' }),
                      'تم نشر الأداة.',
                    )
                  }
                >
                  نشر
                </button>
              )}
            </div>
          </article>
        ))}
      </div>

      {creating || editing ? (
        <ToolForm
          key={editing?.id ?? 'new'}
          tool={editing}
          catalog={catalog}
          busy={busy}
          onCancel={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSubmit={(payload) =>
            void run(() => apiPost('/api/admin/tools', payload), 'تم حفظ الأداة.').then(() => {
              setEditing(null);
              setCreating(false);
            })
          }
        />
      ) : null}
    </section>
  );
}

function ToolForm({
  tool,
  catalog,
  busy,
  onSubmit,
  onCancel,
}: {
  tool: ToolCatalogItem | null;
  catalog: AdminCatalog;
  busy: boolean;
  onSubmit: (payload: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [slug, setSlug] = useState(tool?.slug ?? '');
  const [nameAr, setName] = useState(tool?.nameAr ?? '');
  const [descriptionAr, setDescription] = useState(tool?.descriptionAr ?? '');
  const [icon, setIcon] = useState(tool?.icon ?? 'tools');
  const [categoryId, setCategory] = useState(tool?.categoryId ?? '');
  const [audience, setAudience] = useState<ToolAudience>(tool?.audience ?? 'teacher');
  const [status, setStatus] = useState<ToolStatus>(tool?.status ?? 'draft');
  const [keywords, setKeywords] = useState((tool?.keywords ?? []).join('، '));
  const [stages, setStages] = useState<string[]>(tool?.stages ?? []);
  const [subjects, setSubjects] = useState<string[]>(tool?.subjects ?? []);
  const [sortOrder, setSortOrder] = useState(String(tool?.sortOrder ?? 100));
  const [isFeatured, setFeatured] = useState(tool?.isFeatured ?? false);
  const [isNew, setNew] = useState(tool?.isNew ?? false);

  const toggle = (list: string[], setList: (next: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter((entry) => entry !== id) : [...list, id]);
  };

  return (
    <div className="card" style={{ marginBlockStart: 'var(--sp-5)' }}>
      <h3 className="title-sm">{tool ? 'تعديل أداة' : 'أداة جديدة'}</h3>

      <div className="grid grid-2" style={{ marginBlockStart: 'var(--sp-4)' }}>
        <TextInput
          label="المعرّف (slug)"
          value={slug}
          hint="أحرف لاتينية صغيرة وشرطات فقط."
          onValueChange={setSlug}
        />
        <TextInput label="الاسم" value={nameAr} onValueChange={setName} />
        <TextInput label="الأيقونة" value={icon} onValueChange={setIcon} />
        <SelectField
          label="القسم"
          value={categoryId}
          options={[
            { value: '', label: 'بلا قسم' },
            ...catalog.categories.map((entry) => ({ value: entry.id, label: entry.nameAr })),
          ]}
          onValueChange={setCategory}
        />
        <SelectField
          label="الجمهور"
          value={audience}
          options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => setAudience(value as ToolAudience)}
        />
        <SelectField
          label="الحالة"
          value={status}
          options={Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => setStatus(value as ToolStatus)}
        />
        <TextInput
          label="الترتيب"
          type="number"
          min={0}
          value={sortOrder}
          onValueChange={setSortOrder}
        />
        <TextInput
          label="الكلمات المفتاحية"
          value={keywords}
          hint="افصل بينها بفاصلة."
          onValueChange={setKeywords}
        />
      </div>

      <div style={{ marginBlockStart: 'var(--sp-4)' }}>
        <TextArea label="الوصف" value={descriptionAr} rows={2} onValueChange={setDescription} />
      </div>

      <fieldset style={{ marginBlockStart: 'var(--sp-4)', border: 0, padding: 0 }}>
        <legend className="label">المراحل (اتركها فارغة = كل المراحل)</legend>
        <div className="chip-grid" style={{ marginBlockStart: 'var(--sp-2)' }}>
          {catalog.stages.map((stage) => (
            <button
              key={stage.id}
              type="button"
              className={`chip${stages.includes(stage.id) ? ' is-selected' : ''}`}
              aria-pressed={stages.includes(stage.id)}
              onClick={() => toggle(stages, setStages, stage.id)}
            >
              {stage.nameAr}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset style={{ marginBlockStart: 'var(--sp-4)', border: 0, padding: 0 }}>
        <legend className="label">المواد (اتركها فارغة = كل المواد)</legend>
        <div className="chip-grid" style={{ marginBlockStart: 'var(--sp-2)' }}>
          {catalog.subjects.map((subject) => (
            <button
              key={subject.id}
              type="button"
              className={`chip${subjects.includes(subject.id) ? ' is-selected' : ''}`}
              aria-pressed={subjects.includes(subject.id)}
              onClick={() => toggle(subjects, setSubjects, subject.id)}
            >
              {subject.nameAr}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="row" style={{ marginBlockStart: 'var(--sp-4)' }}>
        <label className="row" style={{ gap: 'var(--sp-2)' }}>
          <input
            type="checkbox"
            checked={isFeatured}
            onChange={(event) => setFeatured(event.target.checked)}
          />
          مميّزة
        </label>
        <label className="row" style={{ gap: 'var(--sp-2)' }}>
          <input type="checkbox" checked={isNew} onChange={(event) => setNew(event.target.checked)} />
          جديدة
        </label>
      </div>

      <div className="row" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || !slug || !nameAr}
          onClick={() =>
            onSubmit({
              ...(tool ? { id: tool.id } : {}),
              slug,
              nameAr,
              descriptionAr,
              icon,
              categoryId: categoryId || null,
              audience,
              status,
              stages,
              grades: tool?.grades ?? [],
              subjects,
              keywords: keywords
                .split(/[،,]/)
                .map((entry) => entry.trim())
                .filter(Boolean),
              isFeatured,
              isNew,
              sortOrder: Number(sortOrder) || 0,
            })
          }
        >
          حفظ
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

function CategoriesSection({
  catalog,
  busy,
  run,
}: {
  catalog: AdminCatalog;
  busy: boolean;
  run: Runner;
}) {
  const [id, setId] = useState('');
  const [nameAr, setName] = useState('');
  const [audience, setAudience] = useState<ToolAudience>('teacher');
  const [sortOrder, setSort] = useState('10');

  return (
    <section className="card card-lg">
      <h2 className="title-md">الأقسام ({catalog.categories.length})</h2>

      <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-4)' }}>
        {catalog.categories.map((entry) => (
          <article key={entry.id} className="admin-row">
            <div>
              <strong>{entry.nameAr}</strong>
              <p className="muted small">
                {AUDIENCE_LABELS[entry.audience]} · <span className="numeric">ترتيب {entry.sortOrder}</span>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    apiPost('/api/admin/reference/toggle', {
                      entity: 'category',
                      id: entry.id,
                      enabled: false,
                    }),
                  'تم تعطيل القسم.',
                )
              }
            >
              تعطيل
            </button>
          </article>
        ))}
      </div>

      <div className="grid grid-2" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <TextInput label="معرّف القسم" value={id} onValueChange={setId} />
        <TextInput label="الاسم" value={nameAr} onValueChange={setName} />
        <SelectField
          label="الجمهور"
          value={audience}
          options={Object.entries(AUDIENCE_LABELS).map(([value, label]) => ({ value, label }))}
          onValueChange={(value) => setAudience(value as ToolAudience)}
        />
        <TextInput label="الترتيب" type="number" value={sortOrder} onValueChange={setSort} />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginBlockStart: 'var(--sp-4)' }}
        disabled={busy || !id || !nameAr}
        onClick={() =>
          void run(
            () =>
              apiPost('/api/admin/categories', {
                id,
                nameAr,
                descriptionAr: '',
                icon: 'tools',
                audience,
                sortOrder: Number(sortOrder) || 0,
                enabled: true,
              }),
            'تم حفظ القسم.',
          )
        }
      >
        حفظ القسم
      </button>
    </section>
  );
}

function SubjectsSection({
  catalog,
  busy,
  run,
}: {
  catalog: AdminCatalog;
  busy: boolean;
  run: Runner;
}) {
  const [id, setId] = useState('');
  const [nameAr, setName] = useState('');
  const [stageId, setStage] = useState('');
  const [sortOrder, setSort] = useState('50');

  const byStage = useMemo(() => {
    const groups = new Map<string, CatalogResponse['subjects']>();
    for (const subject of catalog.subjects) {
      const key = subject.stageId ?? 'all';
      groups.set(key, [...(groups.get(key) ?? []), subject]);
    }
    return groups;
  }, [catalog.subjects]);

  return (
    <section className="card card-lg">
      <h2 className="title-md">المواد ({catalog.subjects.length})</h2>

      {[...byStage.entries()].map(([key, subjects]) => (
        <div key={key} style={{ marginBlockStart: 'var(--sp-4)' }}>
          <h3 className="title-sm">
            {key === 'all'
              ? 'كل المراحل'
              : catalog.stages.find((stage) => stage.id === key)?.nameAr ?? key}
          </h3>
          <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-2)' }}>
            {subjects.map((subject) => (
              <article key={subject.id} className="admin-row">
                <strong>{subject.nameAr}</strong>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy}
                  onClick={() =>
                    void run(
                      () =>
                        apiPost('/api/admin/reference/toggle', {
                          entity: 'subject',
                          id: subject.id,
                          enabled: false,
                        }),
                      'تم تعطيل المادة.',
                    )
                  }
                >
                  تعطيل
                </button>
              </article>
            ))}
          </div>
        </div>
      ))}

      <div className="grid grid-2" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <TextInput label="معرّف المادة" value={id} onValueChange={setId} />
        <TextInput label="الاسم" value={nameAr} onValueChange={setName} />
        <SelectField
          label="المرحلة"
          value={stageId}
          options={[
            { value: '', label: 'كل المراحل' },
            ...catalog.stages.map((stage) => ({ value: stage.id, label: stage.nameAr })),
          ]}
          onValueChange={setStage}
        />
        <TextInput label="الترتيب" type="number" value={sortOrder} onValueChange={setSort} />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ marginBlockStart: 'var(--sp-4)' }}
        disabled={busy || !id || !nameAr}
        onClick={() =>
          void run(
            () =>
              apiPost('/api/admin/subjects', {
                id,
                nameAr,
                stageId: stageId || null,
                sortOrder: Number(sortOrder) || 0,
                enabled: true,
              }),
            'تم حفظ المادة.',
          )
        }
      >
        حفظ المادة
      </button>
    </section>
  );
}

function StructureSection({
  catalog,
  busy,
  run,
}: {
  catalog: AdminCatalog;
  busy: boolean;
  run: Runner;
}) {
  const toggle = (entity: 'stage' | 'grade' | 'track', id: string) =>
    void run(
      () => apiPost('/api/admin/reference/toggle', { entity, id, enabled: false }),
      'تم التعطيل.',
    );

  return (
    <section className="card card-lg">
      <h2 className="title-md">المراحل والصفوف والمسارات</h2>

      <h3 className="title-sm" style={{ marginBlockStart: 'var(--sp-4)' }}>
        المراحل
      </h3>
      <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-2)' }}>
        {catalog.stages.map((stage) => (
          <article key={stage.id} className="admin-row">
            <strong>{stage.nameAr}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => toggle('stage', stage.id)}
            >
              تعطيل
            </button>
          </article>
        ))}
      </div>

      <h3 className="title-sm" style={{ marginBlockStart: 'var(--sp-5)' }}>
        الصفوف
      </h3>
      <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-2)' }}>
        {catalog.grades.map((grade) => (
          <article key={grade.id} className="admin-row">
            <div>
              <strong>{grade.nameAr}</strong>
              <p className="muted small">
                {catalog.stages.find((stage) => stage.id === grade.stageId)?.nameAr ?? ''}
                {grade.requiresTrack ? ' · يحتاج مساراً' : ''}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => toggle('grade', grade.id)}
            >
              تعطيل
            </button>
          </article>
        ))}
      </div>

      <h3 className="title-sm" style={{ marginBlockStart: 'var(--sp-5)' }}>
        المسارات
      </h3>
      <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-2)' }}>
        {catalog.tracks.map((track) => (
          <article key={track.id} className="admin-row">
            <strong>{track.nameAr}</strong>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={busy}
              onClick={() => toggle('track', track.id)}
            >
              تعطيل
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function AuditSection({ entries }: { entries: AdminAuditEntry[] }) {
  if (!entries.length) {
    return (
      <EmptyState
        title="لا توجد إجراءات مسجّلة بعد"
        description="كل تعديل إداري يُسجَّل هنا تلقائياً."
      />
    );
  }

  return (
    <section className="card card-lg">
      <h2 className="title-md">سجل الإدارة</h2>
      <div className="stack-sm" style={{ marginBlockStart: 'var(--sp-4)' }}>
        {entries.map((entry) => (
          <article key={entry.id} className="admin-row">
            <div>
              <strong>
                {ACTION_LABELS[entry.action] ?? entry.action} · {entry.entityType}
              </strong>
              <p className="muted small">
                {entry.actorName} — <span className="numeric">{entry.entityId}</span>
              </p>
            </div>
            <span className="muted small numeric">
              {new Intl.DateTimeFormat('ar', {
                dateStyle: 'short',
                timeStyle: 'short',
                numberingSystem: 'latn',
              }).format(new Date(entry.createdAt))}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
