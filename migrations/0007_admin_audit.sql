-- =============================================================================
-- 0007 — سجل إجراءات الإدارة
--
-- يوثّق ما فعله الإدمن (أنشأ/عدّل/عطّل) لأي كيان مرجعي.
-- metadata نصّ JSON آمن: لا أسرار، ولا توكنات، ولا بيانات طلاب.
-- =============================================================================

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT NOT NULL PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- create | update | delete | publish | unpublish | disable | reorder
  action TEXT NOT NULL,
  -- tool | category | subject | stage | grade | track | user
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs (actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_logs (entity_type, entity_id);
