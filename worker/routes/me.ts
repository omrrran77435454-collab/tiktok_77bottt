import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { authenticate, evaluateGate } from '../lib/gate';
import { getPreferences, insertUsageEvent, listEnabledTools, markLogin, savePreferences } from '../lib/repo';
import type { MeResponse, ToolMeta } from '@shared/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const preferencesSchema = z.object({
  defaultTemplateId: z.string().min(1).max(40),
  primaryColor: z.string().regex(HEX_COLOR),
  secondaryColor: z.string().regex(HEX_COLOR),
  accentColor: z.string().regex(HEX_COLOR),
  backgroundColor: z.string().regex(HEX_COLOR),
});

/** GET /api/me — حالة المستخدم والبوابة والتفضيلات في طلب واحد. */
export async function handleMe({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;

  const preferences = await getPreferences(env.DB, gate.user.id);
  const body: MeResponse = {
    user: {
      id: gate.user.id,
      name: gate.user.name,
      email: gate.user.email,
      image: gate.user.photo_url,
      role: gate.role,
    },
    telegram: gate.state,
    canUseTools: gate.canUseTools,
    preferences,
  };
  return json(body);
}

/**
 * POST /api/me/login — يُستدعى مرة واحدة بعد تسجيل الدخول بنجاح.
 * يسجّل حدث login ويحدّث last_login_at؛ لا يقبل أي بيانات من العميل.
 */
export async function handleLogin({ request, env }: RouteContext): Promise<Response> {
  const auth = await authenticate(request, env);
  if (auth instanceof Response) return auth;

  await markLogin(env.DB, auth.user.id);
  await insertUsageEvent(env.DB, {
    userId: auth.user.id,
    eventType: 'login',
    toolId: null,
    templateId: null,
    primaryColor: null,
  });
  return json({ ok: true });
}

/** GET /api/tools — قائمة الأدوات المفعّلة (تتطلّب اجتياز البوابة). */
export async function handleTools({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const rows = await listEnabledTools(env.DB);
  const tools: ToolMeta[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    nameAr: row.name_ar,
    descriptionAr: row.description_ar,
    icon: row.icon,
    enabled: row.enabled === 1,
    sortOrder: row.sort_order,
  }));
  return json({ tools });
}

/** POST /api/me/preferences — حفظ القالب والألوان المفضّلة (لا يحفظ أي محتوى مستند). */
export async function handleSavePreferences({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const parsed = preferencesSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return errors.badRequest('قيم التفضيلات غير صالحة. تأكد من صيغة الألوان (‎#RRGGBB‎).');
  }

  await savePreferences(env.DB, gate.user.id, parsed.data);
  return json({ ok: true });
}
