-- =============================================================================
-- 0009 — نصاب المعلم (teacher_assignments)
--
-- المشكلة: الملف الواحد كان يفترض مرحلة واحدة وصفاً واحداً للجميع. هذا صحيح
-- للطالب، وخاطئ للمعلم: المعلم يدرّس عدة مراحل وصفوف ومواد وشُعب معاً.
--
-- الحل: يبقى profiles كما هو للطالب (مرحلة وصف ومسار واحد)، ويُضاف للمعلم
-- جدول علاقة متعدّد يصف كل تكليف على حدة.
--
-- لا يوجد جدول مشابه في المخطّط الحالي (فُحص قبل الإنشاء)، فهذا ليس تكراراً.
-- إضافية بالكامل: لا حذف ولا تعديل على أي جدول قائم.
--
-- الخصوصية: التكليف يصف عمل المعلم نفسه (مرحلته وصفّه ومادته واسم شعبته
-- مثل «رابع أ»). لا يحتوي اسم طالب ولا درجته ولا أي ملاحظة عنه.
-- =============================================================================

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  stage_id TEXT NOT NULL REFERENCES education_stages (id) ON DELETE CASCADE,
  grade_id TEXT NOT NULL REFERENCES grades (id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  -- الشعبة أو الفصل: نصّ حرّ اختياري يكتبه المعلم مثل «أ» أو «رابع أ».
  class_name TEXT,
  section TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_user
  ON teacher_assignments (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_stage
  ON teacher_assignments (stage_id);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_subject
  ON teacher_assignments (subject_id);

-- لا يُكرَّر التكليف نفسه مرتين لنفس المعلم.
-- COALESCE لأن NULL لا يساوي NULL في فهارس SQLite الفريدة.
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique
  ON teacher_assignments (
    user_id, stage_id, grade_id, subject_id,
    COALESCE(class_name, ''), COALESCE(section, '')
  );
