-- =============================================================================
-- 0005 — الجدول الأسبوعي
--
-- الخصوصية: الجدول يخصّ صاحب الحساب (مادته، صفّه، اسم فصله، عنوان درسه).
-- لا يحتوي أي اسم طالب ولا درجة ولا ملاحظة عن طالب — تلك تبقى على الجهاز.
--
-- اسم الفصل (class_name) نصّ حرّ يكتبه المعلم مثل «خامس أ» وليس بيانات طالب.
-- =============================================================================

-- إعدادات الجدول لكل مستخدم (عدد الحصص ووقت البداية ومدة الحصة).
CREATE TABLE IF NOT EXISTS weekly_schedules (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  periods_per_day INTEGER NOT NULL DEFAULT 7,
  start_time TEXT NOT NULL DEFAULT '07:00',
  period_minutes INTEGER NOT NULL DEFAULT 45,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- حصص الجدول.
-- day: 0=الأحد … 6=السبت — مخزّنة كعدد حتى ندعم لاحقاً أياماً إضافية
-- بلا تغيير في المخطّط.
CREATE TABLE IF NOT EXISTS schedule_items (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  period INTEGER NOT NULL,
  start_time TEXT,
  end_time TEXT,
  subject_id TEXT REFERENCES subjects (id) ON DELETE SET NULL,
  -- نصّ حرّ عندما لا تكون المادة ضمن القائمة المرجعية.
  subject_label TEXT,
  grade_id TEXT REFERENCES grades (id) ON DELETE SET NULL,
  class_name TEXT,
  lesson_title TEXT,
  notes TEXT,
  homework TEXT,
  -- planned | done | cancelled
  status TEXT NOT NULL DEFAULT 'planned',
  -- not_started | in_progress | ready
  preparation_status TEXT NOT NULL DEFAULT 'not_started',
  -- none | pending | done
  followup_status TEXT NOT NULL DEFAULT 'none',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_schedule_items_user_day
  ON schedule_items (user_id, day, period);
CREATE INDEX IF NOT EXISTS idx_schedule_items_user_updated
  ON schedule_items (user_id, updated_at);
