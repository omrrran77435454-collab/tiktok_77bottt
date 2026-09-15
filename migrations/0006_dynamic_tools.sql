-- =============================================================================
-- 0006 — كتالوج الأدوات الديناميكي
--
-- جدول tools موجود منذ 0001 بأعمدة (id, slug, name_ar, description_ar, icon,
-- enabled, sort_order) وفيه صفوف حقيقية. لا ننشئ جدولاً جديداً ولا نحذف شيئاً:
-- نوسّع الجدول نفسه بأعمدة جديدة لها قيم افتراضية آمنة، فتبقى الصفوف الثلاثة
-- الحالية تعمل كما هي.
--
-- ملاحظة على SQLite: لا يوجد ADD COLUMN IF NOT EXISTS. هذه الهجرة تُطبَّق مرة
-- واحدة (wrangler يتتبّع الهجرات المطبَّقة) فلا حاجة لحمايتها من التكرار.
-- =============================================================================

ALTER TABLE tools ADD COLUMN category_id TEXT;
-- teacher | student | both
ALTER TABLE tools ADD COLUMN audience TEXT NOT NULL DEFAULT 'teacher';
-- draft | published | disabled — مصدر الحقيقة الجديد للعرض.
ALTER TABLE tools ADD COLUMN status TEXT NOT NULL DEFAULT 'published';
-- قوائم مفصولة بفواصل: '' تعني «كل القيم».
ALTER TABLE tools ADD COLUMN stages TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN grades TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN subjects TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN keywords TEXT NOT NULL DEFAULT '';
ALTER TABLE tools ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN is_new INTEGER NOT NULL DEFAULT 0;
-- هل للأداة صفحة منفّذة فعلاً في الواجهة؟ الأدوات بلا تنفيذ لا تُعرض كأزرار عاملة.
ALTER TABLE tools ADD COLUMN is_implemented INTEGER NOT NULL DEFAULT 0;
ALTER TABLE tools ADD COLUMN created_at TEXT;
ALTER TABLE tools ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_tools_status_sort ON tools (status, sort_order);
CREATE INDEX IF NOT EXISTS idx_tools_audience ON tools (audience);
CREATE INDEX IF NOT EXISTS idx_tools_category ON tools (category_id);

-- أقسام الأدوات.
CREATE TABLE IF NOT EXISTS tool_categories (
  id TEXT NOT NULL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'tools',
  -- teacher | student | both
  audience TEXT NOT NULL DEFAULT 'teacher',
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tool_categories_audience_sort
  ON tool_categories (audience, sort_order);

INSERT OR IGNORE INTO tool_categories (id, name_ar, description_ar, icon, audience, sort_order) VALUES
  ('daily', 'يومي وأسبوعي', 'جدولك وحصصك ومهامّ أسبوعك.', 'calendar', 'teacher', 1),
  ('planning', 'التخطيط والتدريس', 'تحضير الدرس وأهدافه واستراتيجياته وأنشطته.', 'book', 'teacher', 2),
  ('assessment', 'الاختبارات والتحليل', 'اختبارات قصيرة وتحليل نتائج وقرارات مبنية على البيانات.', 'chart', 'teacher', 3),
  ('followup', 'متابعة الطلاب', 'خطط متابعة وعلاج وإثراء وتعويض.', 'clipboard', 'teacher', 4),
  ('communication', 'التواصل', 'رسائل أولياء الأمور وتقارير المستوى.', 'link', 'teacher', 5),
  ('documents', 'المستندات والإنجاز', 'شواهد التنفيذ وتوثيق الأنشطة والتقارير.', 'layout', 'teacher', 6),
  ('study-org', 'تنظيم الدراسة', 'جدولك وخطة مذاكرتك وواجباتك.', 'calendar', 'student', 1),
  ('revision', 'المراجعة', 'تلخيص الدروس وبطاقات المراجعة.', 'book', 'student', 2),
  ('exams', 'الاختبارات', 'الاستعداد للاختبار وخطط ما قبله.', 'chart', 'student', 3),
  ('projects', 'المشاريع', 'تقسيم المشروع ومتابعة تنفيذه.', 'layout', 'student', 4),
  ('weak-points', 'نقاط الضعف', 'دفتر الأخطاء وخطط علاج نقاط الضعف.', 'shield', 'student', 5);

-- الأدوات الثلاث الحالية: تصنيفها وتعليمها كمنفَّذة دون المساس بمحتواها.
UPDATE tools SET
  category_id = 'followup',
  audience = 'teacher',
  status = 'published',
  is_implemented = 1,
  keywords = 'متابعة,اختبار,خطة,نتائج,طلاب'
WHERE id = 'student-followup';

UPDATE tools SET
  category_id = 'assessment',
  audience = 'teacher',
  status = 'published',
  is_implemented = 1,
  keywords = 'تحليل,أخطاء,اختبار,علاج,بيانات'
WHERE id = 'error-map';

UPDATE tools SET
  category_id = 'followup',
  audience = 'teacher',
  status = 'published',
  is_implemented = 1,
  keywords = 'غياب,تعويض,خطة,طالب'
WHERE id = 'absence-plan';

-- أدوات الطالب المنفَّذة في هذه الجولة.
INSERT OR IGNORE INTO tools
  (id, slug, name_ar, description_ar, icon, enabled, sort_order,
   category_id, audience, status, stages, grades, subjects, keywords,
   is_featured, is_new, is_implemented)
VALUES
  ('student-schedule', 'student-schedule',
   'جدولي الأسبوعي',
   'رتّب حصصك وواجباتك في جدول أسبوعي واضح تطبعه أو تحفظه.',
   'calendar', 1, 10, 'study-org', 'student', 'published', '', '', '', 'جدول,أسبوع,حصص,تنظيم', 1, 1, 1),
  ('study-plan', 'study-plan',
   'خطة المذاكرة',
   'وزّع موادك على أيام الأسبوع بخطة مذاكرة واقعية تناسب وقتك.',
   'book', 1, 11, 'study-org', 'student', 'published', '', '', '', 'مذاكرة,خطة,تنظيم,وقت', 1, 1, 1),
  ('homework-organizer', 'homework-organizer',
   'منظّم الواجبات',
   'اجمع واجباتك ومواعيدها في قائمة واحدة مرتّبة حسب الأقرب تسليماً.',
   'clipboard', 1, 12, 'study-org', 'student', 'published', '', '', '', 'واجبات,تسليم,مواعيد', 0, 1, 1),
  ('exam-prep', 'exam-prep',
   'خطة ما قبل الاختبار',
   'حوّل أيامك المتبقّية قبل الاختبار إلى خطة مراجعة يومية محدّدة.',
   'chart', 1, 13, 'exams', 'student', 'published', '', '', '', 'اختبار,مراجعة,استعداد,خطة', 1, 1, 1);
