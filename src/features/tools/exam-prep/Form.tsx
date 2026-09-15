import { SelectField, TextArea, TextInput } from '@/components/ui';
import { RowsEditor } from '../RowsEditor';
import {
  CONFIDENCE_LABELS,
  createEmptyTopic,
  type ExamPrepData,
  type ExamTopic,
} from './compute';

const CONFIDENCE_OPTIONS = Object.entries(CONFIDENCE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function Form({
  data,
  onChange,
}: {
  data: ExamPrepData;
  onChange: (next: ExamPrepData) => void;
}) {
  const patch = (changes: Partial<ExamPrepData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">الاختبار</h3>
        <div className="form-grid">
          <TextInput
            label="اسمك"
            value={data.studentName}
            onValueChange={(value) => patch({ studentName: value })}
          />
          <TextInput
            label="المادة"
            value={data.subject}
            onValueChange={(value) => patch({ subject: value })}
          />
          <TextInput
            label="تاريخ اليوم"
            type="date"
            value={data.today}
            onValueChange={(value) => patch({ today: value })}
          />
          <TextInput
            label="تاريخ الاختبار"
            type="date"
            value={data.examDate}
            onValueChange={(value) => patch({ examDate: value })}
          />
          <TextInput
            label="دقائق المراجعة يومياً"
            type="number"
            min={1}
            inputMode="numeric"
            value={data.minutesPerDay}
            onValueChange={(value) => patch({ minutesPerDay: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الدروس المطلوبة</h3>
        <RowsEditor<ExamTopic>
          rows={data.topics}
          onChange={(topics) => patch({ topics })}
          createRow={createEmptyTopic}
          addLabel="إضافة درس"
          emptyLabel="لم تُضف أي درس بعد"
          renderRow={(row, index, update) => (
            <>
              <TextInput
                label={`الدرس ${index + 1}`}
                value={row.title}
                onValueChange={(value) => update({ title: value })}
              />
              <SelectField
                label="مستواك فيه"
                value={row.confidence}
                options={CONFIDENCE_OPTIONS}
                onValueChange={(value) => update({ confidence: value as ExamTopic['confidence'] })}
              />
              <TextArea
                label="ملاحظة"
                rows={2}
                value={row.notes}
                onValueChange={(value) => update({ notes: value })}
              />
            </>
          )}
        />
      </section>
    </div>
  );
}
