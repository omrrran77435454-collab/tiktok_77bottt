import type { AccessRole, UsageEventType, UserPreferences, UserRole } from '@shared/types';

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

export interface UserRow {
  id: string;
  firebase_uid: string;
  email: string;
  name: string;
  photo_url: string | null;
  /** @deprecated العمود القديم — يُزامَن مع access_role أثناء الانتقال. */
  role: UserRole;
  /** صلاحية النظام المخزَّنة. أثر للمراجعة؛ القرار يقع في كل طلب من التوكن. */
  access_role: AccessRole;
}

/** كل كم من الوقت نحدّث last_seen_at — نتجنّب كتابة في D1 مع كل طلب. */
const LAST_SEEN_REFRESH_MS = 15 * 60 * 1000;

/**
 * يجلب المستخدم بمعرّف Firebase، وينشئه إن لم يكن موجوداً (Upsert).
 *
 * الهوية كلها (uid / email / name / photo) تأتي من توكن تحقّقنا من توقيعه،
 * ولا يمكن للعميل التأثير عليها. حقل role لا يُكتب هنا إطلاقاً — ترقيته
 * تحدث فقط في مسار Webhook تيليجرام.
 */
export async function upsertUserFromIdentity(
  db: D1Database,
  identity: { uid: string; email: string; name: string; picture: string | null },
): Promise<{ user: UserRow; created: boolean }> {
  const existing = await db
    .prepare(
      `SELECT id, firebase_uid, email, name, photo_url, role, access_role, last_seen_at
       FROM users WHERE firebase_uid = ?1`,
    )
    .bind(identity.uid)
    .first<UserRow & { last_seen_at: string | null }>();

  const now = nowIso();

  if (existing) {
    const lastSeen = existing.last_seen_at ? Date.parse(existing.last_seen_at) : 0;
    const profileChanged =
      existing.email !== identity.email ||
      existing.name !== identity.name ||
      (existing.photo_url ?? null) !== identity.picture;

    if (profileChanged || !lastSeen || Date.now() - lastSeen > LAST_SEEN_REFRESH_MS) {
      await db
        .prepare(
          `UPDATE users SET email = ?1, name = ?2, photo_url = ?3, last_seen_at = ?4
           WHERE id = ?5`,
        )
        .bind(identity.email, identity.name, identity.picture, now, existing.id)
        .run();
    }

    return {
      user: {
        id: existing.id,
        firebase_uid: existing.firebase_uid,
        email: identity.email,
        name: identity.name,
        photo_url: identity.picture,
        role: existing.role === 'admin' ? 'admin' : 'user',
        access_role: existing.access_role === 'admin' ? 'admin' : 'user',
      },
      created: false,
    };
  }

  const id = newId();
  await db
    .prepare(
      `INSERT INTO users
         (id, firebase_uid, email, name, photo_url, role, created_at, last_login_at, last_seen_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'user', ?6, ?6, ?6)
       ON CONFLICT (firebase_uid) DO NOTHING`,
    )
    .bind(id, identity.uid, identity.email, identity.name, identity.picture, now)
    .run();

  // ON CONFLICT يحمي من سباق طلبين متزامنين لأول تسجيل دخول.
  const row = await db
    .prepare(
      `SELECT id, firebase_uid, email, name, photo_url, role, access_role
       FROM users WHERE firebase_uid = ?1`,
    )
    .bind(identity.uid)
    .first<UserRow>();

  if (!row) throw new Error('تعذّر إنشاء المستخدم.');
  return {
    user: {
      ...row,
      role: row.role === 'admin' ? 'admin' : 'user',
      access_role: row.access_role === 'admin' ? 'admin' : 'user',
    },
    created: row.id === id,
  };
}

/** يسجّل لحظة تسجيل دخول صريحة (يُستدعى مرة عند بداية الجلسة). */
export async function markLogin(db: D1Database, userId: string): Promise<void> {
  const now = nowIso();
  await db
    .prepare('UPDATE users SET last_login_at = ?1, last_seen_at = ?1 WHERE id = ?2')
    .bind(now, userId)
    .run();
}

export async function getUserRole(db: D1Database, userId: string): Promise<UserRole> {
  const row = await db
    .prepare('SELECT role FROM users WHERE id = ?1')
    .bind(userId)
    .first<{ role: string | null }>();
  return row?.role === 'admin' ? 'admin' : 'user';
}

/**
 * يزامن العمود المخزَّن مع الصلاحية المحسوبة من التوكن.
 *
 * العمود ليس مصدر حقيقة — القرار يقع في كل طلب — لكن إبقاءه صحيحاً يجعل
 * الإحصاءات والمراجعة دقيقة. نحدّث العمود القديم معه أثناء الانتقال.
 */
export async function syncAccessRole(
  db: D1Database,
  userId: string,
  role: AccessRole,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET access_role = ?1, role = ?1,
         admin_verified_at = CASE
           WHEN ?1 = 'admin' AND admin_verified_at IS NULL THEN ?2
           ELSE admin_verified_at
         END
       WHERE id = ?3`,
    )
    .bind(role, nowIso(), userId)
    .run();
}

export async function setUserRole(db: D1Database, userId: string, role: UserRole): Promise<void> {
  await db.prepare('UPDATE users SET role = ?1 WHERE id = ?2').bind(role, userId).run();
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

/** يفكّ ربط تيليجرام عن المستخدم. لا يمسّ حساب Google إطلاقاً. */
export async function deleteTelegramConnection(db: D1Database, userId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM telegram_connections WHERE user_id = ?1')
    .bind(userId)
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
