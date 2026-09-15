-- =============================================================================
-- 0004 — ملفّات المستخدمين (Onboarding)
--
-- ملاحظة على الأدوار: عمود users.role يبقى كما هو ويعني "صلاحية النظام"
-- (user | admin) ولا نلمسه. أمّا profiles.role فيعني "تجربة الاستخدام"
-- (teacher | student). بهذا يستطيع الإدمن أن يستخدم المنصّة كمعلم دون أن
-- يفقد صلاحيته، ويبقى فحص الصلاحية في الخادم معتمداً على users.role وحده.
--
-- لا بيانات طلاب هنا: المرحلة والصف والمواد تخصّ صاحب الحساب نفسه.
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  -- teacher | student
  role TEXT NOT NULL DEFAULT 'teacher',
  stage_id TEXT REFERENCES education_stages (id) ON DELETE SET NULL,
  grade_id TEXT REFERENCES grades (id) ON DELETE SET NULL,
  track_id TEXT REFERENCES tracks (id) ON DELETE SET NULL,
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_stage ON profiles (stage_id);
CREATE INDEX IF NOT EXISTS idx_profiles_completed ON profiles (onboarding_completed);

-- مواد المستخدم (معلّم يدرّسها أو طالب يتابعها).
CREATE TABLE IF NOT EXISTS user_subjects (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subjects_subject ON user_subjects (subject_id);
