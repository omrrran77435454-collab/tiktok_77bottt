import { SelectField, TextArea, TextInput } from '@/components/ui';
import { RowsEditor } from '../RowsEditor';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
  createEmptyItem,
  type AbsenceItem,
  type AbsencePlanData,
} from './compute';

const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

export function Form({
  data,
  onChange,
}: {
  data: AbsencePlanData;
  onChange: (next: AbsencePlanData) => void;
}) {
  const patch = (changes: Partial<AbsencePlanData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">بيانات الطالب</h3>
        <div className="form-grid">
          <TextInput
            label="اسم الطالب"
            value={data.studentName}
            onValueChange={(value) => patch({ studentName: value })}
          />
          <TextInput
            label="المادة"
            value={data.subject}
            onValueChange={(value) => patch({ subject: value })}
          />
          <TextInput
            label="الصف"
            value={data.grade}
            onValueChange={(value) => patch({ grade: value })}
          />
          <TextInput
            label="عدد أيام الغياب"
            type="number"
            min={0}
            inputMode="numeric"
            value={data.absenceDays}
            onValueChange={(value) => patch({ absenceDays: value })}
          />
          <TextInput
            label="الوقت المتاح للتعويض (دقيقة)"
            type="number"
            min={0}
            inputMode="numeric"
            value={data.availableMinutes}
            hint="يُستخدم لتحديد ما يبدأ الآن وما يُؤجَّل."
            onValueChange={(value) => patch({ availableMinutes: value })}
          />
          <TextInput
            label="موعد التحقق"
            type="date"
            value={data.followUpDate}
            onValueChange={(value) => patch({ followUpDate: value })}
          />
        </div>
        <div style={{ marginBlockStart: 'var(--sp-4)' }}>
          <TextArea
            label="الدعم المطلوب"
            rows={2}
            value={data.supportNeeded}
            placeholder="مثال: متابعة من ولي الأمر، جلسة دعم فردية…"
            onValueChange={(value) => patch({ supportNeeded: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الدروس والمهام</h3>
        <p className="hint" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          أضف كل ما فات الطالب: دروس، واجبات، تقويمات، أنشطة — وحدّد ما تم تعويضه.
        </p>
        <RowsEditor<AbsenceItem>
          rows={data.items}
          onChange={(items) => patch({ items })}
          createRow={createEmptyItem}
          addLabel="إضافة عنصر"
          emptyLabel="لم تُضف أي عنصر بعد."
          renderRow={(item, _index, update) => (
            <div className="form-grid form-grid-dense">
              <TextInput
                label="العنوان"
                value={item.title}
                placeholder="مثال: درس أسلوب الاستفهام"
                onValueChange={(value) => update({ title: value })}
              />
              <SelectField
                label="النوع"
                options={TYPE_OPTIONS}
                value={item.type}
                onValueChange={(value) => update({ type: value as AbsenceItem['type'] })}
              />
              <TextInput
                label="المهارة"
                value={item.skill}
                onValueChange={(value) => update({ skill: value })}
              />
              <SelectField
                label="الحالة"
                options={STATUS_OPTIONS}
                value={item.status}
                onValueChange={(value) => update({ status: value as AbsenceItem['status'] })}
              />
              <SelectField
                label="الأولوية"
                options={PRIORITY_OPTIONS}
                value={item.priority}
                onValueChange={(value) => update({ priority: value as AbsenceItem['priority'] })}
              />
              <TextInput
                label="الوقت التقديري (دقيقة)"
                type="number"
                min={0}
                inputMode="numeric"
                value={item.minutes}
                onValueChange={(value) => update({ minutes: value })}
              />
            </div>
          )}
        />
      </section>
    </div>
  );
}
