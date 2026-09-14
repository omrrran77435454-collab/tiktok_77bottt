-- =============================================================================
-- 0001 — المخطّط الأساسي لمنصة "أدوات المعلم"
--
-- المصادقة عبر Firebase Authentication: لا نخزّن كلمات مرور ولا جلسات،
-- فالتحقّق يتم من ID Token موقّع بـ RS256 في كل طلب.
--
-- مبدأ الخصوصية: لا يوجد في أي جدول هنا اسم طالب أو درجة أو ملاحظة.
-- بيانات الطلاب تبقى في جهاز المعلم (LocalStorage) ولا تصل إلى D1 إطلاقاً.
--
-- التواريخ نصّية بصيغة ISO-8601 UTC، فالمقارنة النصّية عليها صحيحة ومفهرسة.
-- =============================================================================

CREATE TABLE users (
  id TEXT NOT NULL PRIMARY KEY,
  -- المعرّف القادم من Firebase (claim: sub). المفتاح الحقيقي للمستخدم.
  firebase_uid TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  photo_url TEXT,
  -- 'user' أو 'admin' — لا يمكن تغييره من العميل إطلاقاً.
  role TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  last_login_at TEXT,
  last_seen_at TEXT
);

CREATE UNIQUE INDEX idx_users_firebase_uid ON users (firebase_uid);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_last_seen_at ON users (last_seen_at);
CREATE INDEX idx_users_role ON users (role);

-- ربط حساب المنصّة بحساب تيليجرام + حالة الاشتراك في القناة.
CREATE TABLE telegram_connections (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- المعرّف الرقمي هو المفتاح؛ اسم المستخدم قابل للتغيير ولا يُعتمد عليه.
  telegram_user_id TEXT NOT NULL,
  telegram_username TEXT,
  is_member INTEGER NOT NULL DEFAULT 0,
  last_checked_at TEXT,
  -- آخر طلب تحقّق يدوي من المستخدم — منفصل عن last_checked_at حتى لا
  -- يمنع فحصُ الربط التلقائيُّ أولَ ضغطة على زر «تحقق من الاشتراك».
  last_verify_request_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- حساب تيليجرام واحد لحساب واحد، في الاتجاهين.
CREATE UNIQUE INDEX idx_telegram_connections_user_id
  ON telegram_connections (user_id);
CREATE UNIQUE INDEX idx_telegram_connections_telegram_user_id
  ON telegram_connections (telegram_user_id);
CREATE INDEX idx_telegram_connections_is_member
  ON telegram_connections (is_member);

-- توكنات الربط لمرة واحدة. نخزّن بصمة SHA-256 فقط، لا التوكن نفسه.
CREATE TABLE telegram_link_tokens (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX idx_telegram_link_tokens_token_hash
  ON telegram_link_tokens (token_hash);
CREATE INDEX idx_telegram_link_tokens_user_id
  ON telegram_link_tokens (user_id);
CREATE INDEX idx_telegram_link_tokens_expires_at
  ON telegram_link_tokens (expires_at);

-- أحداث الاستخدام (Metadata فقط: من، أي أداة، أي حدث، متى).
CREATE TABLE usage_events (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tool_id TEXT,
  event_type TEXT NOT NULL,
  template_id TEXT,
  -- لون أساسي (HEX) لإحصاء التفضيلات فقط — ليس بياناً شخصياً.
  primary_color TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_usage_events_created_at ON usage_events (created_at);
CREATE INDEX idx_usage_events_user_created ON usage_events (user_id, created_at);
CREATE INDEX idx_usage_events_tool_id ON usage_events (tool_id);
CREATE INDEX idx_usage_events_type_created ON usage_events (event_type, created_at);
CREATE INDEX idx_usage_events_template_id ON usage_events (template_id);

-- تفضيلات العرض (قالب وألوان). لا تحتوي أي محتوى مستند.
CREATE TABLE user_preferences (
  user_id TEXT NOT NULL PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  default_template_id TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  accent_color TEXT NOT NULL,
  background_color TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- سجل الأدوات المتاحة (تفعيل/تعطيل وترتيب بدون نشر جديد).
CREATE TABLE tools (
  id TEXT NOT NULL PRIMARY KEY,
  slug TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  icon TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_tools_slug ON tools (slug);
CREATE INDEX idx_tools_enabled_sort ON tools (enabled, sort_order);
