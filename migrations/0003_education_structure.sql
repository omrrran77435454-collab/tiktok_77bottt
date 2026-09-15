-- =============================================================================
-- 0003 — البنية التعليمية: المراحل والصفوف والمسارات والمواد
--
-- إضافية بالكامل: لا تحذف جدولاً ولا عموداً ولا صفّاً. الجداول الحالية
-- (users, telegram_connections, usage_events, user_preferences, tools) تبقى كما هي.
--
-- البيانات هنا "مرجعية" (Reference Data): يديرها الإدمن ولا تحتوي أي بيانات شخصية.
-- =============================================================================

-- المراحل الدراسية.
CREATE TABLE IF NOT EXISTS education_stages (
  id TEXT NOT NULL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_stages_enabled_sort
  ON education_stages (enabled, sort_order);

-- الصفوف داخل كل مرحلة.
CREATE TABLE IF NOT EXISTS grades (
  id TEXT NOT NULL PRIMARY KEY,
  stage_id TEXT NOT NULL REFERENCES education_stages (id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  -- هل يحتاج هذا الصف اختيار مسار؟ (الثاني والثالث الثانوي)
  requires_track INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_grades_stage ON grades (stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_grades_enabled ON grades (enabled);

-- المسارات الثانوية.
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT NOT NULL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_tracks_enabled_sort ON tracks (enabled, sort_order);

-- المواد الدراسية.
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT NOT NULL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  -- NULL = المادة متاحة لكل المراحل.
  stage_id TEXT REFERENCES education_stages (id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_subjects_stage ON subjects (stage_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_subjects_enabled ON subjects (enabled);

-- =============================================================================
-- البيانات الأولية — INSERT OR IGNORE حتى تكون الهجرة قابلة لإعادة التشغيل
-- ولا تدهس أي تعديل أجراه الإدمن لاحقاً.
-- =============================================================================

INSERT OR IGNORE INTO education_stages (id, name_ar, sort_order) VALUES
  ('primary', 'ابتدائي', 1),
  ('intermediate', 'متوسط', 2),
  ('secondary', 'ثانوي', 3);

INSERT OR IGNORE INTO grades (id, stage_id, name_ar, requires_track, sort_order) VALUES
  ('p1', 'primary', 'الأول الابتدائي', 0, 1),
  ('p2', 'primary', 'الثاني الابتدائي', 0, 2),
  ('p3', 'primary', 'الثالث الابتدائي', 0, 3),
  ('p4', 'primary', 'الرابع الابتدائي', 0, 4),
  ('p5', 'primary', 'الخامس الابتدائي', 0, 5),
  ('p6', 'primary', 'السادس الابتدائي', 0, 6),
  ('m1', 'intermediate', 'الأول المتوسط', 0, 1),
  ('m2', 'intermediate', 'الثاني المتوسط', 0, 2),
  ('m3', 'intermediate', 'الثالث المتوسط', 0, 3),
  ('s1', 'secondary', 'السنة الأولى المشتركة', 0, 1),
  ('s2', 'secondary', 'الثاني الثانوي', 1, 2),
  ('s3', 'secondary', 'الثالث الثانوي', 1, 3);

INSERT OR IGNORE INTO tracks (id, name_ar, sort_order) VALUES
  ('general', 'المسار العام', 1),
  ('cs-engineering', 'مسار علوم الحاسب والهندسة', 2),
  ('health-life', 'مسار الصحة والحياة', 3),
  ('business', 'مسار إدارة الأعمال', 4),
  ('sharia', 'المسار الشرعي', 5);

INSERT OR IGNORE INTO subjects (id, name_ar, stage_id, sort_order) VALUES
  ('arabic', 'اللغة العربية', NULL, 1),
  ('islamic', 'الدراسات الإسلامية', NULL, 2),
  ('math', 'الرياضيات', NULL, 3),
  ('science', 'العلوم', NULL, 4),
  ('english', 'اللغة الإنجليزية', NULL, 5),
  ('social', 'الدراسات الاجتماعية', NULL, 6),
  ('computer', 'المهارات الرقمية', NULL, 7),
  ('art', 'التربية الفنية', NULL, 8),
  ('pe', 'التربية البدنية', NULL, 9),
  ('life-skills', 'المهارات الحياتية والأسرية', NULL, 10),
  ('physics', 'الفيزياء', 'secondary', 11),
  ('chemistry', 'الكيمياء', 'secondary', 12),
  ('biology', 'الأحياء', 'secondary', 13),
  ('geology', 'علم الأرض', 'secondary', 14),
  ('critical-thinking', 'التفكير الناقد', 'secondary', 15),
  ('financial', 'الإدارة المالية', 'secondary', 16);
