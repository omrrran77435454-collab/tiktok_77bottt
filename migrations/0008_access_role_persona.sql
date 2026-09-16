-- =============================================================================
-- 0008 — فصل صلاحية النظام عن دور التجربة
--
-- المشكلة: عمود users.role كان يخلط مفهومين مختلفين تماماً:
--   «هل هذا مدير المنصّة؟» و «هل يستخدم المنصّة كمعلم أم كطالب؟»
-- فكان المدير مضطرّاً لأن يكون شيئاً غير معلم، وهذا خطأ: مدير المنصّة معلّم
-- أيضاً، وصلاحيته الإدارية بُعد منفصل عن تجربته.
--
-- بعد هذه الهجرة:
--   users.access_role   → user | admin     (صلاحية النظام، يحدّدها الخادم وحده)
--   profiles.persona    → teacher | student (تجربة الاستخدام، يختارها المستخدم)
--
-- إضافية بالكامل: العمودان القديمان (users.role و profiles.role) يبقيان
-- ويُحدَّثان معاً مؤقتاً، فلا ينكسر أي كود أو بيانات أثناء الانتقال.
-- =============================================================================

ALTER TABLE users ADD COLUMN access_role TEXT NOT NULL DEFAULT 'user';

-- نقل القيم الحالية: من كان admin يبقى admin. لا يفقد المدير الحالي صلاحيته.
UPDATE users SET access_role = 'admin' WHERE role = 'admin';
UPDATE users SET access_role = 'user' WHERE role <> 'admin';

CREATE INDEX IF NOT EXISTS idx_users_access_role ON users (access_role);

-- بريد المدير الموثَّق بعد أول تحقّق ناجح — هوية ثابتة إضافية للمراجعة.
-- لا يُمنح منه أي صلاحية: القرار يقع في كل طلب من التوكن + ADMIN_EMAIL.
ALTER TABLE users ADD COLUMN admin_verified_at TEXT;

-- persona: دور التجربة.
ALTER TABLE profiles ADD COLUMN persona TEXT NOT NULL DEFAULT 'teacher';

-- نقل القيم الحالية من profiles.role.
UPDATE profiles SET persona = 'student' WHERE role = 'student';
UPDATE profiles SET persona = 'teacher' WHERE role <> 'student';

CREATE INDEX IF NOT EXISTS idx_profiles_persona ON profiles (persona);
