import { SelectField, TextArea, TextInput } from '@/components/ui';
import { RowsEditor } from '../RowsEditor';
import {
  PRIORITY_LABELS,
  createEmptySubject,
  type StudyPlanData,
  type StudySubject,
} from './compute';

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

export function Form({
  data,
  onChange,
}: {
  data: StudyPlanData;
  onChange: (next: StudyPlanData) => void;
}) {
  const patch = (changes: Partial<StudyPlanData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">بياناتك ووقتك</h3>
        <div className="form-grid">
          <TextInput
            label="اسمك"
            value={data.studentName}
            onValueChange={(value) => patch({ studentName: value })}
          />
          <TextInput
            label="الصف"
            value={data.grade}
            onValueChange={(value) => patch({ grade: value })}
          />
          <TextInput
            label="عدد أيام الخطة"
            type="number"
            min={1}
            inputMode="numeric"
            value={data.days}
            hint="كم يوماً أمامك قبل الاختبار أو نهاية الأسبوع؟"
            onValueChange={(value) => patch({ days: value })}
          />
          <TextInput
            label="دقائق المذاكرة في اليوم"
            type="number"
            min={1}
            inputMode="numeric"
            value={data.minutesPerDay}
            hint="اكتب ما تستطيعه فعلاً، لا ما تتمنّاه."
            onValueChange={(value) => patch({ minutesPerDay: value })}
          />
          <TextInput
            label="مدة الجلسة الواحدة (دقيقة)"
            type="number"
            min={5}
            inputMode="numeric"
            value={data.sessionMinutes}
            hint="أطول مدة تستطيع التركيز فيها بلا انقطاع."
            onValueChange={(value) => patch({ sessionMinutes: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">المواد</h3>
        <RowsEditor<StudySubject>
          rows={data.subjects}
          onChange={(subjects) => patch({ subjects })}
          createRow={createEmptySubject}
          addLabel="إضافة مادة"
          emptyLabel="لم تُضف أي مادة بعد"
          renderRow={(row, index, update) => (
            <>
              <TextInput
                label={`المادة ${index + 1}`}
                value={row.name}
                onValueChange={(value) => update({ name: value })}
              />
              <SelectField
                label="الأولوية"
                value={row.priority}
                options={PRIORITY_OPTIONS}
                onValueChange={(value) => update({ priority: value as StudySubject['priority'] })}
              />
              <TextInput
                label="عدد الدروس المتبقّية"
                type="number"
                min={0}
                inputMode="numeric"
                value={row.topics}
                onValueChange={(value) => update({ topics: value })}
              />
              <TextArea
                label="ملاحظة"
                value={row.notes}
                rows={2}
                onValueChange={(value) => update({ notes: value })}
              />
            </>
          )}
        />
      </section>
    </div>
  );
}
