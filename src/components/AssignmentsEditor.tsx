import { useMemo, useState } from 'react';
import { EmptyState, SelectField, TextInput } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { gradesForStage, subjectsForStage } from '@/lib/education';
import type { CatalogResponse, TeacherAssignmentInput } from '@shared/types';

/**
 * محرّر نصاب المعلم.
 *
 * المعلم يدرّس عدة مراحل وصفوف ومواد وشُعب، فلا يكفيه اختيار مرحلة واحدة.
 * كل سطر هنا تكليف مستقلّ: مرحلة + صف + مادة + شعبة اختيارية.
 * الشعبة اختيارية عمداً — لا نُجبر المعلم على إدخالها.
 */
export function AssignmentsEditor({
  catalog,
  assignments,
  onChange,
}: {
  catalog: CatalogResponse;
  assignments: TeacherAssignmentInput[];
  onChange: (next: TeacherAssignmentInput[]) => void;
}) {
  const [stageId, setStageId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [className, setClassName] = useState('');

  const grades = useMemo(() => gradesForStage(catalog, stageId || null), [catalog, stageId]);
  const subjects = useMemo(() => subjectsForStage(catalog, stageId || null), [catalog, stageId]);

  const label = (list: { id: string; nameAr: string }[], id: string) =>
    list.find((entry) => entry.id === id)?.nameAr ?? id;

  const isDuplicate = assignments.some(
    (entry) =>
      entry.stageId === stageId &&
      entry.gradeId === gradeId &&
      entry.subjectId === subjectId &&
      (entry.className ?? '') === className.trim(),
  );

  const canAdd = !!stageId && !!gradeId && !!subjectId && !isDuplicate;

  const add = () => {
    if (!canAdd) return;
    onChange([
      ...assignments,
      { stageId, gradeId, subjectId, className: className.trim() || null, section: null },
    ]);
    // نُبقي المرحلة مختارة: المعلم غالباً يضيف عدة صفوف في نفس المرحلة.
    setGradeId('');
    setSubjectId('');
    setClassName('');
  };

  const remove = (index: number) => {
    onChange(assignments.filter((_entry, position) => position !== index));
  };

  return (
    <div className="stack">
      {assignments.length === 0 ? (
        <EmptyState
          title="لم تُضف أي صف بعد"
          description="أضف ما تدرّسه: المرحلة ثم الصف ثم المادة. يمكنك إضافة أكثر من صف."
        />
      ) : (
        <ul className="assignment-list">
          {assignments.map((entry, index) => (
            <li className="assignment-row" key={`${entry.stageId}-${entry.gradeId}-${entry.subjectId}-${entry.className ?? ''}`}>
              <div>
                <strong>{label(catalog.subjects, entry.subjectId)}</strong>
                <p className="muted small">
                  {[
                    label(catalog.stages, entry.stageId),
                    label(catalog.grades, entry.gradeId),
                    entry.className,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => remove(index)}
                aria-label={`حذف ${label(catalog.subjects, entry.subjectId)}`}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="card" style={{ background: 'var(--bg-subtle)' }}>
        <div className="grid grid-2">
          <SelectField
            label="المرحلة"
            value={stageId}
            options={[
              { value: '', label: 'اختر المرحلة' },
              ...catalog.stages.map((stage) => ({ value: stage.id, label: stage.nameAr })),
            ]}
            onValueChange={(value) => {
              setStageId(value);
              setGradeId('');
              setSubjectId('');
            }}
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
            label="الشعبة (اختياري)"
            value={className}
            placeholder="مثال: أ"
            hint="اتركها فارغة إن لم تكن بحاجة إليها."
            onValueChange={setClassName}
          />
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginBlockStart: 'var(--sp-4)' }}
          onClick={add}
          disabled={!canAdd}
        >
          <Icon name="plus" size={16} /> إضافة صف
        </button>

        {isDuplicate && stageId && gradeId && subjectId ? (
          <p className="hint" style={{ marginBlockStart: 'var(--sp-2)' }}>
            هذا الصف مُضاف بالفعل.
          </p>
        ) : null}
      </div>
    </div>
  );
}
