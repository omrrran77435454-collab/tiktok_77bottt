import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { RowsEditor } from '@/features/tools/RowsEditor';
import { ColorPanel } from '@/features/editor/ColorPanel';
import { TemplatePicker } from '@/features/editor/TemplatePicker';
import { DEFAULT_PALETTE, type Palette } from '@/lib/colors';
import { DOC_TEMPLATES } from '@/features/document/templates';

interface Row {
  name: string;
}

function RowsHarness({ initial = [] as Row[] }) {
  const [rows, setRows] = useState<Row[]>(initial);
  return (
    <RowsEditor<Row>
      rows={rows}
      onChange={setRows}
      createRow={() => ({ name: '' })}
      addLabel="إضافة طالب"
      emptyLabel="لا يوجد طلاب"
      renderRow={(row, index, update) => (
        <label>
          اسم {index + 1}
          <input value={row.name} onChange={(event) => update({ name: event.target.value })} />
        </label>
      )}
    />
  );
}

describe('RowsEditor', () => {
  it('يعرض رسالة الفراغ ثم يضيف صفوفاً بلا حد ثابت', async () => {
    const user = userEvent.setup();
    render(<RowsHarness />);

    expect(screen.getByText('لا يوجد طلاب')).toBeInTheDocument();

    const addButton = screen.getByRole('button', { name: /إضافة طالب/ });
    for (let index = 0; index < 12; index += 1) await user.click(addButton);

    expect(screen.getAllByRole('listitem')).toHaveLength(12);
    expect(screen.queryByText('لا يوجد طلاب')).not.toBeInTheDocument();
  });

  it('يحذف الصف المطلوب فقط', async () => {
    const user = userEvent.setup();
    render(<RowsHarness initial={[{ name: 'أ' }, { name: 'ب' }, { name: 'ج' }]} />);

    await user.click(screen.getByRole('button', { name: 'حذف الصف 2' }));

    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['أ', 'ج']);
  });

  it('يحرّك الصفوف ويعطّل الأسهم عند الحواف', async () => {
    const user = userEvent.setup();
    render(<RowsHarness initial={[{ name: 'أ' }, { name: 'ب' }]} />);

    expect(screen.getByRole('button', { name: 'تحريك الصف 1 للأعلى' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'تحريك الصف 2 للأسفل' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'تحريك الصف 2 للأعلى' }));
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
    expect(inputs.map((input) => input.value)).toEqual(['ب', 'أ']);
  });
});

describe('ColorPanel', () => {
  it('يعرض حقول الألوان الأربعة', () => {
    render(<ColorPanel palette={DEFAULT_PALETTE} onChange={() => {}} />);
    for (const label of ['اللون الأساسي', 'اللون الثانوي', 'لون التمييز', 'لون الخلفية']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('يُظهر تحذير التباين عند اختيار ألوان غير مقروءة', () => {
    const weak: Palette = {
      primary: '#FAFAFA',
      secondary: '#F7F7F7',
      accent: '#FFFFFF',
      background: '#FFFFFF',
    };
    render(<ColorPanel palette={weak} onChange={() => {}} />);
    expect(screen.getByText(/تنبيه تباين/)).toBeInTheDocument();
  });

  it('لا يُظهر التحذير مع اللوحة الافتراضية', () => {
    render(<ColorPanel palette={DEFAULT_PALETTE} onChange={() => {}} />);
    expect(screen.queryByText(/تنبيه تباين/)).not.toBeInTheDocument();
  });

  it('زر إعادة الألوان يعيد اللوحة الافتراضية', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ColorPanel palette={{ ...DEFAULT_PALETTE, primary: '#123456' }} onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: 'إعادة الألوان الافتراضية' }));
    expect(onChange).toHaveBeenCalledWith(DEFAULT_PALETTE);
  });
});

describe('TemplatePicker', () => {
  it('يعرض سبعة قوالب ويحدّد المختار', () => {
    render(<TemplatePicker value="academic" onChange={() => {}} palette={DEFAULT_PALETTE} />);
    const options = screen.getAllByRole('radio');
    expect(options).toHaveLength(7);
    const selected = options.filter((option) => option.getAttribute('aria-checked') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveAccessibleName(/أكاديمي/);
  });

  it('يُبلّغ عن القالب المختار عند الضغط', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TemplatePicker value="formal" onChange={onChange} palette={DEFAULT_PALETTE} />);
    await user.click(screen.getByRole('radio', { name: new RegExp(DOC_TEMPLATES[3].nameAr) }));
    expect(onChange).toHaveBeenCalledWith(DOC_TEMPLATES[3].id);
  });
});
