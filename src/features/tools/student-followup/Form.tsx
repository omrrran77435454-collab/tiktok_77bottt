import { Field, SelectField, TextInput } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { RowsEditor } from '../RowsEditor';
import {
  CATEGORY_LABELS,
  createEmptyStudent,
  resolveCategory,
  scorePercent,
  suggestedAction,
  type FollowupData,
  type StudentRow,
} from './compute';

const CATEGORY_OPTIONS = [
  { value: 'auto', label: 'تلقائي (حسب الدرجة)' },
  { value: 'excellent', label: CATEGORY_LABELS.excellent },
  { value: 'good', label: CATEGORY_LABELS.good },
  { value: 'needs-support', label: CATEGORY_LABELS['needs-support'] },
];

export function Form({ data, onChange }: { data: FollowupData; onChange: (next: FollowupData) => void }) {
  const patch = (changes: Partial<FollowupData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">بيانات الاختبار</h3>
        <div className="form-grid">
          <TextInput
            label="المادة"
            value={data.subject}
            placeholder="مثال: اللغة العربية"
            onValueChange={(value) => patch({ subject: value })}
          />
          <TextInput
            label="الصف"
            value={data.grade}
            placeholder="مثال: الخامس الابتدائي"
            onValueChange={(value) => patch({ grade: value })}
          />
          <TextInput
            label="عنوان الاختبار"
            value={data.testTitle}
            placeholder="مثال: اختبار قصير — الوحدة الثانية"
            onValueChange={(value) => patch({ testTitle: value })}
          />
          <TextInput
            label="التاريخ"
            type="date"
            value={data.date}
            onValueChange={(value) => patch({ date: value })}
          />
          <TextInput
            label="الدرجة الكلية"
            type="number"
            min={1}
            step="0.5"
            inputMode="decimal"
            value={data.maxScore}
            onValueChange={(value) => patch({ maxScore: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">حدود التصنيف</h3>
        <p className="hint" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          النسبة المئوية التي يبدأ منها كل مستوى. ما دون حدّ «جيد» يُصنَّف تلقائياً «يحتاج إلى دعم».
        </p>
        <div className="form-grid">
          <TextInput
            label="ممتاز من (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={String(data.thresholds.excellent)}
            onValueChange={(value) =>
              patch({ thresholds: { ...data.thresholds, excellent: Number(value) || 0 } })
            }
          />
          <TextInput
            label="جيد من (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={String(data.thresholds.good)}
            onValueChange={(value) =>
              patch({ thresholds: { ...data.thresholds, good: Number(value) || 0 } })
            }
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الطلاب</h3>
        <p className="hint" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          أضف ما تحتاج من الطلاب — لا يوجد حد ثابت. التصنيف والإجراء يُقترحان تلقائياً ويمكنك تعديلهما.
        </p>
        <RowsEditor<StudentRow>
          rows={data.students}
          onChange={(students) => patch({ students })}
          createRow={createEmptyStudent}
          addLabel="إضافة طالب"
          emptyLabel="لم تُضف أي طالب بعد."
          renderRow={(student, _index, update) => {
            const percent = scorePercent(student.score, data.maxScore);
            const category = resolveCategory(student, data);
            return (
              <div className="form-grid form-grid-dense">
                <TextInput
                  label="اسم الطالب"
                  value={student.name}
                  onValueChange={(value) => update({ name: value })}
                />
                <TextInput
                  label="الدرجة"
                  type="number"
                  min={0}
                  step="0.25"
                  inputMode="decimal"
                  value={student.score}
                  hint={
                    percent === null
                      ? 'أدخل الدرجة لحساب النسبة'
                      : `${formatPercent(percent)} — ${CATEGORY_LABELS[category]}`
                  }
                  onValueChange={(value) => update({ score: value })}
                />
                <TextInput
                  label="المهارة المتعثّرة"
                  value={student.weakSkill}
                  placeholder="مثال: الاستنتاج"
                  onValueChange={(value) => update({ weakSkill: value })}
                />
                <SelectField
                  label="التصنيف"
                  options={CATEGORY_OPTIONS}
                  value={student.category}
                  onValueChange={(value) =>
                    update({ category: value as StudentRow['category'] })
                  }
                />
                <TextInput
                  label="الإجراء المناسب"
                  value={student.action}
                  placeholder={suggestedAction(category) || 'اكتب الإجراء'}
                  onValueChange={(value) => update({ action: value })}
                />
                <TextInput
                  label="موعد المراجعة"
                  type="date"
                  value={student.reviewDate}
                  onValueChange={(value) => update({ reviewDate: value })}
                />
                <Field label="ملاحظات">
                  <textarea
                    className="textarea"
                    rows={2}
                    value={student.notes}
                    onChange={(event) => update({ notes: event.target.value })}
                  />
                </Field>
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
