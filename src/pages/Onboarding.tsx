import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ApiRequestError, apiFetch, apiPost } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import {
  EMPTY_CATALOG,
  gradeRequiresTrack,
  gradesForStage,
  subjectsForStage,
} from '@/lib/education';
import { AssignmentsEditor } from '@/components/AssignmentsEditor';
import type {
  CatalogResponse,
  ProfileRole,
  TeacherAssignmentInput,
  UserProfile,
} from '@shared/types';

/**
 * تهيئة الحساب — تظهر مرّة واحدة فقط عند أول دخول.
 *
 * بعد الحفظ تصبح onboardingCompleted = true فلا تظهر مجدداً، ويستطيع المستخدم
 * تعديل كل هذه الاختيارات لاحقاً من صفحة «حسابي».
 */

type StepId = 'role' | 'stage' | 'grade' | 'subjects' | 'assignments';

/**
 * مساران مختلفان بعد اختيار الدور:
 *   الطالب — مرحلة واحدة ثم صف واحد ثم مواد.
 *   المعلم — نصاب متعدّد في خطوة واحدة (مراحل وصفوف ومواد وشُعب).
 */
const STUDENT_STEPS: { id: StepId; title: string }[] = [
  { id: 'role', title: 'من أنت؟' },
  { id: 'stage', title: 'ما المرحلة؟' },
  { id: 'grade', title: 'ما الصف؟' },
  { id: 'subjects', title: 'ما المواد؟' },
];

const TEACHER_STEPS: { id: StepId; title: string }[] = [
  { id: 'role', title: 'من أنت؟' },
  { id: 'assignments', title: 'ماذا تدرّس؟' },
];

export function OnboardingPage() {
  const { data, refresh } = useSession();
  const navigate = useNavigate();

  const [catalog, setCatalog] = useState<CatalogResponse>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stepIndex, setStepIndex] = useState(0);
  const [role, setRole] = useState<ProfileRole>('teacher');
  const [stageId, setStageId] = useState<string | null>(null);
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignmentInput[]>([]);

  useEffect(() => {
    let active = true;
    apiFetch<CatalogResponse>('/api/catalog')
      .then((response) => {
        if (!active) return;
        setCatalog(response);
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setError(
          requestError instanceof ApiRequestError
            ? requestError.message
            : 'تعذّر تحميل الخيارات. حدّث الصفحة وحاول مرة أخرى.',
        );
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const grades = useMemo(() => gradesForStage(catalog, stageId), [catalog, stageId]);
  const needsTrack = useMemo(() => gradeRequiresTrack(catalog, gradeId), [catalog, gradeId]);
  const availableSubjects = useMemo(() => subjectsForStage(catalog, stageId), [catalog, stageId]);

  const steps = role === 'teacher' ? TEACHER_STEPS : STUDENT_STEPS;
  // تبديل الدور قد يقصّر المسار، فنحمي المؤشّر من تجاوز النهاية.
  const safeIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeIndex];
  const isLast = safeIndex === steps.length - 1;

  const canAdvance =
    (step.id === 'role' && !!role) ||
    (step.id === 'stage' && !!stageId) ||
    (step.id === 'grade' && !!gradeId && (!needsTrack || !!trackId)) ||
    (step.id === 'subjects' && subjects.length > 0) ||
    (step.id === 'assignments' && assignments.length > 0);

  const toggleSubject = (subjectId: string) => {
    setSubjects((current) =>
      current.includes(subjectId)
        ? current.filter((id) => id !== subjectId)
        : [...current, subjectId],
    );
  };

  const selectStage = (nextStage: string) => {
    setStageId(nextStage);
    // تغيير المرحلة يُبطل الصف والمسار والمواد المرتبطة بها.
    setGradeId(null);
    setTrackId(null);
    setSubjects([]);
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiPost<{ profile: UserProfile }>('/api/me/profile', {
        role,
        // المعلم: نصابه هو المصدر ولا يُحفظ له صف مفرد.
        stageId: role === 'teacher' ? null : stageId,
        gradeId: role === 'teacher' ? null : gradeId,
        trackId: role === 'teacher' ? null : needsTrack ? trackId : null,
        subjects: role === 'teacher' ? [] : subjects,
        assignments: role === 'teacher' ? assignments : [],
        onboardingCompleted: true,
      });
      await refresh();
      navigate('/dashboard', { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر حفظ اختياراتك. حاول مرة أخرى.',
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container page-section">
        <div className="card card-lg onboarding-card">
          <Spinner label="جارٍ تحضير الخيارات…" />
        </div>
      </div>
    );
  }

  return (
    <div className="container page-section">
      <div className="onboarding-card">
        <div className="onboarding-head">
          <span className="eyebrow">
            <Icon name="check" size={14} /> خطوة {safeIndex + 1} من {steps.length}
          </span>
          <h1 className="title-lg">{step.title}</h1>
          <p className="muted small">
            {data?.user.name ? `${data.user.name} — ` : ''}
            نرتّب لك المنصّة حسب إجابتك، ويمكنك تغييرها لاحقاً من «حسابي».
          </p>
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-valuenow={safeIndex + 1}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-label={`خطوة ${safeIndex + 1} من ${steps.length}`}
          >
            <span
              className="onboarding-progress-fill"
              style={{ inlineSize: `${((safeIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {error ? (
          <Alert tone="error" title="تعذّر إكمال الخطوة">
            {error}
          </Alert>
        ) : null}

        <div className="onboarding-body">
          {step.id === 'role' ? (
            <div className="choice-grid">
              <ChoiceCard
                selected={role === 'teacher'}
                icon="clipboard"
                title="معلم"
                text="جدولك وتحضيرك ومتابعة طلابك ومستنداتك."
                onSelect={() => {
                  setRole('teacher');
                  setStepIndex(0);
                }}
              />
              <ChoiceCard
                selected={role === 'student'}
                icon="book"
                title="طالب"
                text="جدولك وخطة مذاكرتك وواجباتك واختباراتك."
                onSelect={() => {
                  setRole('student');
                  setStepIndex(0);
                }}
              />
            </div>
          ) : null}

          {step.id === 'assignments' ? (
            <>
              <p className="muted small" style={{ marginBlockEnd: 'var(--sp-4)' }}>
                أضف كل صف تدرّسه. تستطيع إضافة عدة مراحل وصفوف ومواد وشُعب.
              </p>
              <AssignmentsEditor
                catalog={catalog}
                assignments={assignments}
                onChange={setAssignments}
              />
            </>
          ) : null}

          {step.id === 'stage' ? (
            <div className="choice-grid">
              {catalog.stages.map((stage) => (
                <ChoiceCard
                  key={stage.id}
                  selected={stageId === stage.id}
                  icon="layout"
                  title={stage.nameAr}
                  onSelect={() => selectStage(stage.id)}
                />
              ))}
            </div>
          ) : null}

          {step.id === 'grade' ? (
            <>
              <div className="chip-grid">
                {grades.map((grade) => (
                  <button
                    key={grade.id}
                    type="button"
                    className={`chip${gradeId === grade.id ? ' is-selected' : ''}`}
                    aria-pressed={gradeId === grade.id}
                    onClick={() => {
                      setGradeId(grade.id);
                      if (!grade.requiresTrack) setTrackId(null);
                    }}
                  >
                    {grade.nameAr}
                  </button>
                ))}
              </div>

              {needsTrack ? (
                <div style={{ marginBlockStart: 'var(--sp-6)' }}>
                  <h2 className="title-sm">اختر المسار</h2>
                  <div className="chip-grid" style={{ marginBlockStart: 'var(--sp-3)' }}>
                    {catalog.tracks.map((track) => (
                      <button
                        key={track.id}
                        type="button"
                        className={`chip${trackId === track.id ? ' is-selected' : ''}`}
                        aria-pressed={trackId === track.id}
                        onClick={() => setTrackId(track.id)}
                      >
                        {track.nameAr}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          {step.id === 'subjects' ? (
            <>
              <p className="muted small" style={{ marginBlockEnd: 'var(--sp-4)' }}>
                {role === 'teacher'
                  ? 'ما المواد التي تدرّسها؟ اختر واحدة أو أكثر.'
                  : 'ما المواد التي تريد متابعتها؟ اختر واحدة أو أكثر.'}
              </p>
              <div className="chip-grid">
                {availableSubjects.map((subject) => (
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
            </>
          ) : null}
        </div>

        <div className="onboarding-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStepIndex(Math.max(0, safeIndex - 1))}
            disabled={safeIndex === 0 || saving}
          >
            رجوع
          </button>

          {isLast ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void finish()}
              disabled={!canAdvance || saving}
            >
              {saving ? <Spinner label="جارٍ الحفظ…" /> : 'ابدأ استخدام أدوات المعلم'}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setStepIndex(Math.min(steps.length - 1, safeIndex + 1))}
              disabled={!canAdvance}
            >
              التالي
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
  selected,
  icon,
  title,
  text,
  onSelect,
}: {
  selected: boolean;
  icon: 'clipboard' | 'book' | 'layout';
  title: string;
  text?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`choice-card${selected ? ' is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <span className="choice-icon">
        <Icon name={icon} size={22} />
      </span>
      <span className="choice-title">{title}</span>
      {text ? <span className="choice-text">{text}</span> : null}
      {selected ? (
        <span className="choice-check" aria-hidden="true">
          <Icon name="check" size={16} />
        </span>
      ) : null}
    </button>
  );
}
