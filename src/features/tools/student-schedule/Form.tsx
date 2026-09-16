import { SelectField, TextInput } from '@/components/ui';
import { RowsEditor } from '../RowsEditor';
import {
  DAY_OPTIONS,
  createEmptyPeriod,
  type StudentPeriod,
  type StudentScheduleData,
} from './compute';

const DAY_SELECT = DAY_OPTIONS.map((day) => ({ value: day, label: day }));

export function Form({
  data,
  onChange,
}: {
  data: StudentScheduleData;
  onChange: (next: StudentScheduleData) => void;
}) {
  const patch = (changes: Partial<StudentScheduleData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">بياناتك</h3>
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
            label="الفصل"
            value={data.className}
            onValueChange={(value) => patch({ className: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الحصص</h3>
        <RowsEditor<StudentPeriod>
          rows={data.periods}
          onChange={(periods) => patch({ periods })}
          createRow={createEmptyPeriod}
          addLabel="إضافة حصة"
          emptyLabel="لم تُضف أي حصة بعد"
          renderRow={(row, index, update) => (
            <>
              <SelectField
                label={`اليوم (${index + 1})`}
                value={row.day}
                options={DAY_SELECT}
                onValueChange={(value) => update({ day: value })}
              />
              <TextInput
                label="رقم الحصة"
                type="number"
                min={1}
                max={12}
                inputMode="numeric"
                value={row.period}
                onValueChange={(value) => update({ period: value })}
              />
              <TextInput
                label="المادة"
                value={row.subject}
                onValueChange={(value) => update({ subject: value })}
              />
              <TextInput
                label="المعلم"
                value={row.teacher}
                onValueChange={(value) => update({ teacher: value })}
              />
              <TextInput
                label="القاعة"
                value={row.room}
                onValueChange={(value) => update({ room: value })}
              />
            </>
          )}
        />
      </section>
    </div>
  );
}
