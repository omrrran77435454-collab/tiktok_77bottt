import { useState } from 'react';
import { Alert, SelectField, Spinner } from '@/components/ui';
import { ApiRequestError, apiPost } from '@/lib/api';
import { useCatalog } from '@/lib/useCatalog';
import { useSession } from '@/lib/useSession';
import { gradeRequiresTrack, gradesForStage, subjectsForStage } from '@/lib/education';
import type { UserProfile } from '@shared/types';

/**
 * تعديل ملف الاستخدام من صفحة «حسابي».
 *
 * نفس بيانات التهيئة، لكن هنا يستطيع المستخدم تغييرها في أي وقت — التهيئة
 * تظهر مرة واحدة، وهذه البطاقة هي الطريق الدائم لتعديلها.
 */
export function ProfileCard() {
  const { data, refresh } = useSession();
  const catalog = useCatalog();

  const profile = data?.profile;
  const [role, setRole] = useState(profile?.role ?? 'teacher');
  const [stageId, setStageId] = useState(profile?.stageId ?? '');
  const [gradeId, setGradeId] = useState(profile?.gradeId ?? '');
  const [trackId, setTrackId] = useState(profile?.trackId ?? '');
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects ?? []);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const grades = gradesForStage(catalog.data, stageId || null);
  const needsTrack = gradeRequiresTrack(catalog.data, gradeId || null);
  const available = subjectsForStage(catalog.data, stageId || null);

  const toggleSubject = (id: string) => {
    setSubjects((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id],
    );
    setStatus('idle');
  };

  const save = async () => {
    setStatus('saving');
    setError(null);
    try {
      await apiPost<{ profile: UserProfile }>('/api/me/profile', {
        role,
        stageId: stageId || null,
        gradeId: gradeId || null,
        trackId: needsTrack ? trackId || null : null,
        subjects,
        onboardingCompleted: true,
      });
      await refresh();
      setStatus('saved');
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر حفظ ملفك. حاول مرة أخرى.',
      );
      setStatus('error');
    }
  };

  return (
    <section className="card card-lg">
      {/* العنوان يتبع دور التجربة لا صلاحية النظام. */}
      <h2 className="title-md">{role === 'student' ? 'ملفي الدراسي' : 'ملفي كمعلم'}</h2>
      <p className="muted small" style={{ marginBlockStart: 'var(--sp-2)' }}>
        نستخدم هذه البيانات لعرض الأدوات المناسبة لك. يمكنك تغييرها في أي وقت.
      </p>

      {error ? (
        <div style={{ marginBlockStart: 'var(--sp-4)' }}>
          <Alert tone="error" title="تعذّر الحفظ">
            {error}
          </Alert>
        </div>
      ) : null}

      {status === 'saved' ? (
        <div style={{ marginBlockStart: 'var(--sp-4)' }}>
          <Alert tone="success">تم حفظ ملفك.</Alert>
        </div>
      ) : null}

      <div className="grid grid-2" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <SelectField
          label="أنا"
          value={role}
          options={[
            { value: 'teacher', label: 'معلم' },
            { value: 'student', label: 'طالب' },
          ]}
          onValueChange={(value) => {
            setRole(value as UserProfile['role']);
            setStatus('idle');
          }}
        />
        <SelectField
          label="المرحلة"
          value={stageId}
          options={[
            { value: '', label: 'اختر المرحلة' },
            ...catalog.data.stages.map((stage) => ({ value: stage.id, label: stage.nameAr })),
          ]}
          onValueChange={(value) => {
            setStageId(value);
            setGradeId('');
            setTrackId('');
            setSubjects([]);
            setStatus('idle');
          }}
        />
        <SelectField
          label="الصف"
          value={gradeId}
          options={[
            { value: '', label: 'اختر الصف' },
            ...grades.map((grade) => ({ value: grade.id, label: grade.nameAr })),
          ]}
          onValueChange={(value) => {
            setGradeId(value);
            setStatus('idle');
          }}
        />
        {needsTrack ? (
          <SelectField
            label="المسار"
            value={trackId}
            options={[
              { value: '', label: 'اختر المسار' },
              ...catalog.data.tracks.map((track) => ({ value: track.id, label: track.nameAr })),
            ]}
            onValueChange={(value) => {
              setTrackId(value);
              setStatus('idle');
            }}
          />
        ) : null}
      </div>

      {available.length > 0 ? (
        <div style={{ marginBlockStart: 'var(--sp-5)' }}>
          <h3 className="title-sm">
            {role === 'teacher' ? 'المواد التي تدرّسها' : 'المواد التي تتابعها'}
          </h3>
          <div className="chip-grid" style={{ marginBlockStart: 'var(--sp-3)' }}>
            {available.map((subject) => (
              <button
                key={subject.id}
                type="button"
                className={`chip${subjects.includes(subject.id) ? ' is-selected' : ''}`}
                aria-pressed={subjects.includes(subject.id)}
                onClick={() => toggleSubject(subject.id)}
              >
                {subject.nameAr}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="row" style={{ marginBlockStart: 'var(--sp-5)' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void save()}
          disabled={status === 'saving'}
        >
          {status === 'saving' ? <Spinner label="جارٍ الحفظ…" /> : 'حفظ ملفي'}
        </button>
      </div>
    </section>
  );
}
