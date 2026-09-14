import type { UsageEventType, UserPreferences, UserRole } from '@shared/types';

/**
 * طبقة الوصول للبيانات.
 * كل الاستعلامات هنا Parameterized (?1, ?2 …) — لا يُبنى أي SQL بدمج نصوص،
 * وهذا هو الحاجز الأساسي ضد SQL Injection.
 * كذلك نتجنّب SELECT * ونحدّد الأعمدة المطلوبة فقط لتقليل حجم القراءة.
 */

export interface TelegramConnectionRow {
  id: string;
  user_id: string;
  telegram_user_id: string;
  telegram_username: string | null;
  is_member: number;
  last_checked_at: string | null;
}

export interface LinkTokenRow {
  id: string;
  user_id: string;
  expires_at: string;
  used_at: string | null;
}

export function nowIso(): string {
  return new Date().toISOString();
}

function newId(): string {
  return crypto.randomUUID();
}

/* ------------------------------- المستخدمون ------------------------------- */

export async function getUserRole(db: D1Database, userId: string): Promise<UserRole> {
  const row = await db
    .prepare('SELECT "role" FROM "user" WHERE "id" = ?1')
    .bind(userId)
    .first<{ role: string | null }>();
  return row?.role === 'admin' ? 'admin' : 'user';
}

export async function setUserRole(db: D1Database, userId: string, role: UserRole): Promise<void> {
  await db
    .prepare('UPDATE "user" SET "role" = ?1, "updatedAt" = ?2 WHERE "id" = ?3')
    .bind(role, nowIso(), userId)
    .run();
}

/* ------------------------------ ربط تيليجرام ------------------------------ */

export async function getTelegramConnectionByUser(
  db: D1Database,
  userId: string,
): Promise<TelegramConnectionRow | null> {
  return db
    .prepare(
      `SELECT id, user_id, telegram_user_id, telegram_username, is_member, last_checked_at
       FROM telegram_connections WHERE user_id = ?1`,
    )
    .bind(userId)
    .first<TelegramConnectionRow>();
}

export async function getTelegramConnectionByTelegramId(
  db: D1Database,
  telegramUserId: string,
): Promise<TelegramConnectionRow | null> {
  return db
    .prepare(
      `SELECT id, user_id, telegram_user_id, telegram_username, is_member, last_checked_at
       FROM telegram_connections WHERE telegram_user_id = ?1`,
    )
    .bind(telegramUserId)
    .first<TelegramConnectionRow>();
}

export async function upsertTelegramConnection(
  db: D1Database,
  input: {
    userId: string;
    telegramUserId: string;
    telegramUsername: string | null;
    isMember: boolean;
    lastCheckedAt: string | null;
  },
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO telegram_connections
         (id, user_id, telegram_user_id, telegram_username, is_member, last_checked_at, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       ON CONFLICT (user_id) DO UPDATE SET
         telegram_user_id = excluded.telegram_user_id,
         telegram_username = excluded.telegram_username,
         is_member = excluded.is_member,
         last_checked_at = excluded.last_checked_at,
         updated_at = excluded.updated_at`,
    )
    .bind(
      newId(),
      input.userId,
      input.telegramUserId,
      input.telegramUsername,
      input.isMember ? 1 : 0,
      input.lastCheckedAt,
      now,
    )
    .run();
}

export async function updateMembership(
  db: D1Database,
  userId: string,
  isMember: boolean,
): Promise<void> {
  const now = nowIso();
  await db
    .prepare(
      `UPDATE telegram_connections
         SET is_member = ?1, last_checked_at = ?2, updated_at = ?2
       WHERE user_id = ?3`,
    )
    .bind(isMember ? 1 : 0, now, userId)
    .run();
}

/* --------------------------- توكنات الربط المؤقتة -------------------------- */

export async function createLinkToken(
  db: D1Database,
  userId: string,
  tokenHash: string,
  expiresAt: string,
): Promise<void> {
  // نبطل أي توكنات سابقة غير مستخدَمة حتى لا يبقى أكثر من رابط فعّال لنفس المستخدم.
  await db
    .prepare('DELETE FROM telegram_link_tokens WHERE user_id = ?1 AND used_at IS NULL')
    .bind(userId)
    .run();

  await db
    .prepare(
      `INSERT INTO telegram_link_tokens (id, user_id, token_hash, expires_at, used_at, created_at)
       VALUES (?1, ?2, ?3, ?4, NULL, ?5)`,
    )
    .bind(newId(), userId, tokenHash, expiresAt, nowIso())
    .run();
}

export async function findLinkTokenByHash(
  db: D1Database,
  tokenHash: string,
): Promise<LinkTokenRow | null> {
  return db
    .prepare(
      'SELECT id, user_id, expires_at, used_at FROM telegram_link_tokens WHERE token_hash = ?1',
    )
    .bind(tokenHash)
    .first<LinkTokenRow>();
}

/**
 * يستهلك التوكن مرة واحدة فقط.
 * الشرط `used_at IS NULL` داخل UPDATE يجعل العملية ذرّية ويمنع إعادة الاستخدام
 * حتى لو وصل طلبان في نفس اللحظة (Replay / Race).
 */
export async function consumeLinkToken(db: D1Database, tokenId: string): Promise<boolean> {
  const result = await db
    .prepare('UPDATE telegram_link_tokens SET used_at = ?1 WHERE id = ?2 AND used_at IS NULL')
    .bind(nowIso(), tokenId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

/** تنظيف دوري للتوكنات المنتهية (يُستدعى بشكل انتهازي، ليس في كل طلب). */
export async function purgeExpiredLinkTokens(db: D1Database): Promise<void> {
  await db
    .prepare('DELETE FROM telegram_link_tokens WHERE expires_at < ?1')
    .bind(nowIso())
    .run();
}

/* ------------------------------ أحداث الاستخدام ---------------------------- */

export async function insertUsageEvent(
  db: D1Database,
  input: {
    userId: string;
    eventType: UsageEventType;
    toolId: string | null;
    templateId: string | null;
    primaryColor: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO usage_events (id, user_id, tool_id, event_type, template_id, primary_color, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(
      newId(),
      input.userId,
      input.toolId,
      input.eventType,
      input.templateId,
      input.primaryColor,
      nowIso(),
    )
    .run();
}

/** عدد أحداث المستخدم خلال نافذة زمنية — للحد من الإغراق (rate limiting). */
export async function countRecentEvents(
  db: D1Database,
  userId: string,
  sinceIso: string,
): Promise<number> {
  const row = await db
    .prepare('SELECT COUNT(*) AS c FROM usage_events WHERE user_id = ?1 AND created_at >= ?2')
    .bind(userId, sinceIso)
    .first<{ c: number }>();
  return row?.c ?? 0;
}

/* -------------------------------- التفضيلات -------------------------------- */

export async function getPreferences(
  db: D1Database,
  userId: string,
): Promise<UserPreferences | null> {
  const row = await db
    .prepare(
      `SELECT default_template_id, primary_color, secondary_color, accent_color, background_color
       FROM user_preferences WHERE user_id = ?1`,
    )
    .bind(userId)
    .first<{
      default_template_id: string;
      primary_color: string;
      secondary_color: string;
      accent_color: string;
      background_color: string;
    }>();
  if (!row) return null;
  return {
    defaultTemplateId: row.default_template_id,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    accentColor: row.accent_color,
    backgroundColor: row.background_color,
  };
}

export async function savePreferences(
  db: D1Database,
  userId: string,
  preferences: UserPreferences,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO user_preferences
         (user_id, default_template_id, primary_color, secondary_color, accent_color, background_color, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
       ON CONFLICT (user_id) DO UPDATE SET
         default_template_id = excluded.default_template_id,
         primary_color = excluded.primary_color,
         secondary_color = excluded.secondary_color,
         accent_color = excluded.accent_color,
         background_color = excluded.background_color,
         updated_at = excluded.updated_at`,
    )
    .bind(
      userId,
      preferences.defaultTemplateId,
      preferences.primaryColor,
      preferences.secondaryColor,
      preferences.accentColor,
      preferences.backgroundColor,
      nowIso(),
    )
    .run();
}

/* ---------------------------------- الأدوات -------------------------------- */

export async function listEnabledTools(db: D1Database) {
  const result = await db
    .prepare(
      `SELECT id, slug, name_ar, description_ar, icon, enabled, sort_order
       FROM tools WHERE enabled = 1 ORDER BY sort_order ASC`,
    )
    .all<{
      id: string;
      slug: string;
      name_ar: string;
      description_ar: string;
      icon: string;
      enabled: number;
      sort_order: number;
    }>();
  return result.results ?? [];
}
