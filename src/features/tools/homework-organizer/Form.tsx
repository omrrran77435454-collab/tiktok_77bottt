import { SelectField, TextInput } from '@/components/ui';
import { RowsEditor } from '../RowsEditor';
import {
  STATUS_LABELS,
  createEmptyItem,
  type HomeworkData,
  type HomeworkItem,
} from './compute';

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

export function Form({
  data,
  onChange,
}: {
  data: HomeworkData;
  onChange: (next: HomeworkData) => void;
}) {
  const patch = (changes: Partial<HomeworkData>) => onChange({ ...data, ...changes });

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
            label="تاريخ اليوم"
            type="date"
            value={data.today}
            hint="تُحسب المهل المتبقّية بالنسبة لهذا التاريخ."
            onValueChange={(value) => patch({ today: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الواجبات</h3>
        <RowsEditor<HomeworkItem>
          rows={data.items}
          onChange={(items) => patch({ items })}
          createRow={createEmptyItem}
          addLabel="إضافة واجب"
          emptyLabel="لم تُضف أي واجب بعد"
          renderRow={(row, index, update) => (
            <>
              <TextInput
                label={`الواجب ${index + 1}`}
                value={row.title}
                onValueChange={(value) => update({ title: value })}
              />
              <TextInput
                label="المادة"
                value={row.subject}
                onValueChange={(value) => update({ subject: value })}
              />
              <TextInput
                label="تاريخ التسليم"
                type="date"
                value={row.dueDate}
                onValueChange={(value) => update({ dueDate: value })}
              />
              <SelectField
                label="الحالة"
                value={row.status}
                options={STATUS_OPTIONS}
                onValueChange={(value) => update({ status: value as HomeworkItem['status'] })}
              />
              <TextInput
                label="الوقت المقدّر (دقيقة)"
                type="number"
                min={0}
                inputMode="numeric"
                value={row.minutes}
                onValueChange={(value) => update({ minutes: value })}
              />
            </>
          )}
        />
      </section>
    </div>
  );
}
