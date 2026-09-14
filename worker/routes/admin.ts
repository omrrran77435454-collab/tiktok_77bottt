import type { RouteContext } from '../lib/router';
import { json } from '../lib/http';
import { requireAdmin } from '../lib/gate';
import type {
  AdminActivityItem,
  AdminColorStat,
  AdminDailyPoint,
  AdminRecentUser,
  AdminStatsResponse,
  AdminTemplateStat,
  AdminToolStat,
  UsageEventType,
} from '@shared/types';

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPORT_EVENTS = ['export_pdf', 'export_png', 'print'];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function startOfTodayIso(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

/**
 * GET /api/admin/stats
 *
 * الصلاحية تُفحص على الخادم دائماً (requireAdmin) — إخفاء الزر في الواجهة
 * ليس حماية، وهذه النقطة ترفض أي مستخدم عادي بـ 403.
 *
 * الأداء: نستخدم db.batch لتجميع العدّادات في رحلة واحدة، وكل الاستعلامات
 * تعتمد على فهارس created_at / user_id / event_type، ولا يوجد SELECT *.
 */
export async function handleAdminStats({ request, env }: RouteContext): Promise<Response> {
  const guard = await requireAdmin(request, env);
  if (guard instanceof Response) return guard;

  const db = env.DB;
  const todayIso = startOfTodayIso();
  const week = isoDaysAgo(7);
  const month = isoDaysAgo(30);
  const chartWindow = isoDaysAgo(13);

  const counters = await db.batch<{ c: number }>([
    db.prepare('SELECT COUNT(*) AS c FROM "user"'),
    db.prepare('SELECT COUNT(*) AS c FROM "user" WHERE "createdAt" >= ?1').bind(todayIso),
    db.prepare('SELECT COUNT(*) AS c FROM "user" WHERE "createdAt" >= ?1').bind(week),
    db.prepare('SELECT COUNT(*) AS c FROM "user" WHERE "createdAt" >= ?1').bind(month),
    db
      .prepare('SELECT COUNT(DISTINCT user_id) AS c FROM usage_events WHERE created_at >= ?1')
      .bind(todayIso),
    db
      .prepare('SELECT COUNT(DISTINCT user_id) AS c FROM usage_events WHERE created_at >= ?1')
      .bind(week),
    db
      .prepare('SELECT COUNT(DISTINCT user_id) AS c FROM usage_events WHERE created_at >= ?1')
      .bind(month),
    db.prepare('SELECT COUNT(*) AS c FROM telegram_connections'),
    db.prepare('SELECT COUNT(*) AS c FROM telegram_connections WHERE is_member = 1'),
    db.prepare('SELECT COUNT(*) AS c FROM telegram_connections WHERE is_member = 0'),
  ]);

  const value = (index: number) => counters[index]?.results?.[0]?.c ?? 0;

  const [exportRows, toolRows, templateRows, colorRows, recentUserRows, activityRows, dailyRows, toolNames] =
    await Promise.all([
      db
        .prepare(
          `SELECT event_type, COUNT(*) AS c FROM usage_events
           WHERE event_type IN ('export_pdf','export_png','print') GROUP BY event_type`,
        )
        .all<{ event_type: string; c: number }>(),
      db
        .prepare(
          `SELECT tool_id,
                  SUM(CASE WHEN event_type = 'tool_opened' THEN 1 ELSE 0 END) AS opened,
                  SUM(CASE WHEN event_type IN ('export_pdf','export_png','print') THEN 1 ELSE 0 END) AS exports
           FROM usage_events
           WHERE tool_id IS NOT NULL
           GROUP BY tool_id`,
        )
        .all<{ tool_id: string; opened: number; exports: number }>(),
      db
        .prepare(
          `SELECT template_id, COUNT(*) AS c FROM usage_events
           WHERE template_id IS NOT NULL
           GROUP BY template_id ORDER BY c DESC LIMIT 10`,
        )
        .all<{ template_id: string; c: number }>(),
      db
        .prepare(
          `SELECT primary_color, COUNT(*) AS c FROM usage_events
           WHERE primary_color IS NOT NULL
           GROUP BY primary_color ORDER BY c DESC LIMIT 8`,
        )
        .all<{ primary_color: string; c: number }>(),
      db
        .prepare(
          `SELECT u."id" AS id, u."name" AS name, u."email" AS email, u."createdAt" AS created_at,
                  tc.telegram_user_id AS tg, tc.is_member AS is_member
           FROM "user" u
           LEFT JOIN telegram_connections tc ON tc.user_id = u."id"
           ORDER BY u."createdAt" DESC LIMIT 10`,
        )
        .all<{
          id: string;
          name: string;
          email: string;
          created_at: string;
          tg: string | null;
          is_member: number | null;
        }>(),
      db
        .prepare(
          `SELECT event_type, tool_id, created_at FROM usage_events
           ORDER BY created_at DESC LIMIT 15`,
        )
        .all<{ event_type: string; tool_id: string | null; created_at: string }>(),
      db
        .prepare(
          `SELECT substr(created_at, 1, 10) AS day, COUNT(*) AS c FROM usage_events
           WHERE created_at >= ?1 GROUP BY day ORDER BY day ASC`,
        )
        .bind(chartWindow)
        .all<{ day: string; c: number }>(),
      db.prepare('SELECT id, name_ar FROM tools').all<{ id: string; name_ar: string }>(),
    ]);

  const nameById = new Map((toolNames.results ?? []).map((row) => [row.id, row.name_ar]));

  const exportCounts = new Map((exportRows.results ?? []).map((row) => [row.event_type, row.c]));

  const tools: AdminToolStat[] = (toolRows.results ?? [])
    .map((row) => ({
      toolId: row.tool_id,
      nameAr: nameById.get(row.tool_id) ?? row.tool_id,
      opened: Number(row.opened ?? 0),
      exports: Number(row.exports ?? 0),
    }))
    .sort((a, b) => b.opened - a.opened);

  const templates: AdminTemplateStat[] = (templateRows.results ?? []).map((row) => ({
    templateId: row.template_id,
    count: row.c,
  }));

  const colors: AdminColorStat[] = (colorRows.results ?? []).map((row) => ({
    color: row.primary_color,
    count: row.c,
  }));

  const recentUsers: AdminRecentUser[] = (recentUserRows.results ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
    linked: !!row.tg,
    isMember: row.is_member === 1,
  }));

  const recentActivity: AdminActivityItem[] = (activityRows.results ?? []).map((row) => ({
    eventType: row.event_type as UsageEventType,
    toolId: row.tool_id,
    createdAt: row.created_at,
  }));

  // نُكمل الأيام الفارغة حتى يظهر الرسم البياني متّصلاً بدل قفزات.
  const dailyMap = new Map((dailyRows.results ?? []).map((row) => [row.day, row.c]));
  const eventsPerDay: AdminDailyPoint[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const day = new Date(Date.now() - i * DAY_MS).toISOString().slice(0, 10);
    eventsPerDay.push({ day, count: dailyMap.get(day) ?? 0 });
  }

  const body: AdminStatsResponse = {
    users: {
      total: value(0),
      newToday: value(1),
      newThisWeek: value(2),
      newThisMonth: value(3),
      activeToday: value(4),
      activeLast7: value(5),
      activeLast30: value(6),
    },
    telegram: { linked: value(7), verified: value(8), failed: value(9) },
    exports: {
      pdf: exportCounts.get(EXPORT_EVENTS[0]) ?? 0,
      png: exportCounts.get(EXPORT_EVENTS[1]) ?? 0,
      print: exportCounts.get(EXPORT_EVENTS[2]) ?? 0,
    },
    tools,
    templates,
    colors,
    recentUsers,
    recentActivity,
    eventsPerDay,
  };

  return json(body);
}
