/**
 * اختبارات آلة حالات تيليجرام وترشيح الأدوات.
 *
 * القاعدة التي تحرسها: لا يُطلب من المستخدم «التحقق من الاشتراك» قبل أن
 * يكون زر الاشتراك أمامه.
 */
import { describe, expect, it } from 'vitest';
import { telegramView } from '@/lib/telegram-state';
import { filterToolsForProfile } from '../worker/lib/catalog-repo';
import { groupByCategory, searchTools } from '@/lib/useTools';
import type { ToolCatalogItem } from '@shared/types';

const state = (linked: boolean, isMember: boolean) => ({ linked, isMember });

describe('آلة حالات تيليجرام', () => {
  it('NOT_LINKED: تعرض زر الربط وحده', () => {
    const view = telegramView(state(false, false));

    expect(view.phase).toBe('NOT_LINKED');
    expect(view.showLinkButton).toBe(true);
    expect(view.showJoinButton).toBe(false);
    expect(view.showVerifyButton).toBe(false);
  });

  it('LINKING: لا تعرض زر التحقق أثناء انتظار Start', () => {
    const view = telegramView(state(false, false), 'linking');

    expect(view.phase).toBe('LINKING');
    expect(view.showVerifyButton).toBe(false);
    expect(view.showBotButton).toBe(true);
  });

  it('LINKED_NOT_SUBSCRIBED: زر الاشتراك يظهر مع زر التحقق دائماً', () => {
    const view = telegramView(state(true, false));

    expect(view.phase).toBe('LINKED_NOT_SUBSCRIBED');
    expect(view.showJoinButton).toBe(true);
    expect(view.showVerifyButton).toBe(true);
    expect(view.showLinkButton).toBe(false);
  });

  it('CHECKING_SUBSCRIPTION: يختفي زر التحقق أثناء التحقق فلا يُضغط مرتين', () => {
    const view = telegramView(state(true, false), 'checking');

    expect(view.phase).toBe('CHECKING_SUBSCRIPTION');
    expect(view.showVerifyButton).toBe(false);
    expect(view.showJoinButton).toBe(true);
  });

  it('LINKED_SUBSCRIBED: لا أزرار — كل شيء جاهز', () => {
    const view = telegramView(state(true, true));

    expect(view.phase).toBe('LINKED_SUBSCRIBED');
    expect(view.showJoinButton).toBe(false);
    expect(view.showVerifyButton).toBe(false);
    expect(view.showLinkButton).toBe(false);
  });

  it('ERROR: تعرض الرسالة وتُبقي طريق المستخدم مفتوحاً', () => {
    const view = telegramView(state(true, false), 'idle', 'تعذّر الاتصال.');

    expect(view.phase).toBe('ERROR');
    expect(view.description).toBe('تعذّر الاتصال.');
    expect(view.showJoinButton).toBe(true);
    expect(view.showVerifyButton).toBe(true);
  });

  it('خطأ قبل الربط يُبقي زر الربط لا زر التحقق', () => {
    const view = telegramView(state(false, false), 'idle', 'تعذّر إنشاء الرابط.');

    expect(view.showLinkButton).toBe(true);
    expect(view.showVerifyButton).toBe(false);
  });

  it('حالة غير معروفة (بلا بيانات) تُعامل كغير مربوطة', () => {
    expect(telegramView(null).phase).toBe('NOT_LINKED');
    expect(telegramView(undefined).phase).toBe('NOT_LINKED');
  });

  it('لا يظهر زر التحقق أبداً بلا زر اشتراك', () => {
    const combinations: [boolean, boolean, Parameters<typeof telegramView>[1]][] = [
      [false, false, 'idle'],
      [false, false, 'linking'],
      [true, false, 'idle'],
      [true, false, 'checking'],
      [true, true, 'idle'],
    ];

    for (const [linked, isMember, activity] of combinations) {
      const view = telegramView(state(linked, isMember), activity);
      if (view.showVerifyButton) expect(view.showJoinButton).toBe(true);
    }
  });
});

/* ------------------------------ ترشيح الأدوات ------------------------------ */

const tool = (overrides: Partial<ToolCatalogItem>): ToolCatalogItem => ({
  id: 'x',
  slug: 'x',
  nameAr: 'أداة',
  descriptionAr: 'وصف',
  icon: 'tools',
  categoryId: null,
  audience: 'teacher',
  status: 'published',
  stages: [],
  grades: [],
  subjects: [],
  keywords: [],
  isFeatured: false,
  isNew: false,
  isImplemented: true,
  sortOrder: 1,
  ...overrides,
});

const profile = (overrides: Partial<Parameters<typeof filterToolsForProfile>[1]> = {}) => ({
  role: 'teacher' as const,
  stageId: null,
  gradeId: null,
  subjects: [],
  ...overrides,
});

describe('ترشيح الأدوات حسب الملف', () => {
  it('يرشّح حسب الدور', () => {
    const tools = [
      tool({ id: 'teacher-tool', audience: 'teacher' }),
      tool({ id: 'student-tool', audience: 'student' }),
      tool({ id: 'shared-tool', audience: 'both' }),
    ];

    const forTeacher = filterToolsForProfile(tools, profile()).map((entry) => entry.id);
    expect(forTeacher).toEqual(['teacher-tool', 'shared-tool']);

    const forStudent = filterToolsForProfile(tools, profile({ role: 'student' })).map((e) => e.id);
    expect(forStudent).toEqual(['student-tool', 'shared-tool']);
  });

  it('يرشّح حسب المرحلة عندما تكون الأداة مقيَّدة', () => {
    const tools = [
      tool({ id: 'any-stage' }),
      tool({ id: 'primary-only', stages: ['primary'] }),
      tool({ id: 'secondary-only', stages: ['secondary'] }),
    ];

    const result = filterToolsForProfile(tools, profile({ stageId: 'primary' })).map((e) => e.id);
    expect(result).toEqual(['any-stage', 'primary-only']);
  });

  it('يرشّح حسب الصف', () => {
    const tools = [tool({ id: 'g5', grades: ['p5'] }), tool({ id: 'g6', grades: ['p6'] })];
    const result = filterToolsForProfile(tools, profile({ gradeId: 'p6' })).map((e) => e.id);
    expect(result).toEqual(['g6']);
  });

  it('يقبل الأداة عند تقاطع مادة واحدة على الأقل', () => {
    const tools = [
      tool({ id: 'math-only', subjects: ['math'] }),
      tool({ id: 'arabic-only', subjects: ['arabic'] }),
    ];

    const result = filterToolsForProfile(
      tools,
      profile({ subjects: ['math', 'science'] }),
    ).map((entry) => entry.id);
    expect(result).toEqual(['math-only']);
  });

  it('لا يُخفي شيئاً بسبب ملف ناقص', () => {
    const tools = [
      tool({ id: 'restricted', stages: ['secondary'], grades: ['s3'], subjects: ['physics'] }),
    ];
    // ملف بلا مرحلة ولا صف ولا مواد ⇒ لا تُطبَّق تلك القيود.
    expect(filterToolsForProfile(tools, profile())).toHaveLength(1);
  });

  it('قائمة فارغة في الأداة تعني «بلا قيد»', () => {
    const tools = [tool({ id: 'free' })];
    const result = filterToolsForProfile(
      tools,
      profile({ stageId: 'secondary', gradeId: 's3', subjects: ['physics'] }),
    );
    expect(result).toHaveLength(1);
  });
});

describe('بحث الأدوات وتجميعها', () => {
  const tools = [
    tool({ id: 'a', nameAr: 'خطة متابعة', keywords: ['متابعة', 'اختبار'], categoryId: 'followup' }),
    tool({ id: 'b', nameAr: 'تحليل النتائج', descriptionAr: 'خريطة أخطاء', categoryId: 'assessment' }),
    tool({ id: 'c', nameAr: 'أداة بلا قسم', categoryId: null }),
  ];

  it('يبحث في الاسم', () => {
    expect(searchTools(tools, 'متابعة').map((entry) => entry.id)).toEqual(['a']);
  });

  it('يبحث في الوصف', () => {
    expect(searchTools(tools, 'خريطة').map((entry) => entry.id)).toEqual(['b']);
  });

  it('يبحث في الكلمات المفتاحية', () => {
    expect(searchTools(tools, 'اختبار').map((entry) => entry.id)).toEqual(['a']);
  });

  it('يُرجع كل الأدوات عند بحث فارغ', () => {
    expect(searchTools(tools, '   ')).toHaveLength(3);
  });

  it('يجمع حسب القسم ويضع ما بلا قسم في «أدوات أخرى»', () => {
    const groups = groupByCategory(tools, [
      { id: 'followup', nameAr: 'متابعة الطلاب', sortOrder: 2 },
      { id: 'assessment', nameAr: 'الاختبارات', sortOrder: 1 },
    ]);

    expect(groups.map((group) => group.id)).toEqual(['assessment', 'followup', 'other']);
    expect(groups.at(-1)?.tools.map((entry) => entry.id)).toEqual(['c']);
  });

  it('لا يعرض قسماً فارغاً', () => {
    const groups = groupByCategory([tools[0]], [
      { id: 'followup', nameAr: 'متابعة', sortOrder: 1 },
      { id: 'empty', nameAr: 'فارغ', sortOrder: 2 },
    ]);
    expect(groups.map((group) => group.id)).toEqual(['followup']);
  });
});
