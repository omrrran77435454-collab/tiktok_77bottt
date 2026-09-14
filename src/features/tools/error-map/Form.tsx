import { TextInput } from '@/components/ui';
import { formatPercent } from '@/lib/format';
import { RowsEditor } from '../RowsEditor';
import {
  DECISION_LABELS,
  createEmptyQuestion,
  decide,
  errorRate,
  type ErrorMapData,
  type QuestionRow,
} from './compute';

export function Form({ data, onChange }: { data: ErrorMapData; onChange: (next: ErrorMapData) => void }) {
  const patch = (changes: Partial<ErrorMapData>) => onChange({ ...data, ...changes });

  return (
    <div className="stack-lg">
      <section className="form-section">
        <h3 className="form-section-title">بيانات الاختبار</h3>
        <div className="form-grid">
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
            label="عنوان الاختبار"
            value={data.testTitle}
            onValueChange={(value) => patch({ testTitle: value })}
          />
          <TextInput
            label="عدد طلاب الصف"
            type="number"
            min={1}
            inputMode="numeric"
            value={data.totalStudents}
            hint="يُستخدم لحساب نسبة الخطأ في كل سؤال."
            onValueChange={(value) => patch({ totalStudents: value })}
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">حدود اتخاذ القرار</h3>
        <div className="form-grid">
          <TextInput
            label="إعادة الشرح عند نسبة خطأ (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={String(data.thresholds.reteach)}
            onValueChange={(value) =>
              patch({ thresholds: { ...data.thresholds, reteach: Number(value) || 0 } })
            }
          />
          <TextInput
            label="تدريب قصير عند نسبة خطأ (%)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={String(data.thresholds.practice)}
            onValueChange={(value) =>
              patch({ thresholds: { ...data.thresholds, practice: Number(value) || 0 } })
            }
          />
        </div>
      </section>

      <section className="form-section">
        <h3 className="form-section-title">الأسئلة</h3>
        <RowsEditor<QuestionRow>
          rows={data.questions}
          onChange={(questions) => patch({ questions })}
          createRow={() => createEmptyQuestion(data.questions.length + 1)}
          addLabel="إضافة سؤال"
          emptyLabel="لم تُضف أي سؤال بعد."
          renderRow={(question, _index, update) => {
            const rate = errorRate(question.wrongCount, data.totalStudents);
            return (
              <div className="form-grid form-grid-dense">
                <TextInput
                  label="السؤال"
                  value={question.label}
                  onValueChange={(value) => update({ label: value })}
                />
                <TextInput
                  label="المهارة المرتبطة"
                  value={question.skill}
                  placeholder="مثال: الاستنتاج"
                  onValueChange={(value) => update({ skill: value })}
                />
                <TextInput
                  label="عدد من أخطأ"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={question.wrongCount}
                  hint={
                    rate === null
                      ? 'أدخل عدد الطلاب وعدد من أخطأ'
                      : `${formatPercent(rate)} — ${DECISION_LABELS[decide(rate, data.thresholds)]}`
                  }
                  onValueChange={(value) => update({ wrongCount: value })}
                />
              </div>
            );
          }}
        />
      </section>
    </div>
  );
}
