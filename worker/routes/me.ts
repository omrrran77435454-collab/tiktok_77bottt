import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import type { Env } from '../env';
import { authenticate, evaluateGate, type GateResult } from '../lib/gate';
import { getPreferences, insertUsageEvent, markLogin, savePreferences } from '../lib/repo';
import { filterToolsForProfile, getProfile, listPublishedTools } from '../lib/catalog-repo';
import type { MeResponse } from '@shared/types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const preferencesSchema = z.object({
  defaultTemplateId: z.string().min(1).max(40),
  primaryColor: z.string().regex(HEX_COLOR),
  secondaryColor: z.string().regex(HEX_COLOR),
  accentColor: z.string().regex(HEX_COLOR),
  backgroundColor: z.string().regex(HEX_COLOR),
});

/**
 * يبني جسم /api/me من نتيجة البوابة.
 *
 * مصدر واحد للحقيقة: كل مسار يُرجع حالة الجلسة (me, telegram/status,
 * telegram/verify) يمرّ من هنا، فلا تتعارض الردود ولا تتفرّع الحسابات.
 */
export async function buildMeResponse(env: Env, gate: GateResult): Promise<MeResponse> {
  const [preferences, profile] = await Promise.all([
    getPreferences(env.DB, gate.user.id),
    getProfile(env.DB, gate.user.id),
  ]);
  return {
    user: {
      id: gate.user.id,
      name: gate.user.name,
      email: gate.user.email,
      image: gate.user.photo_url,
      role: gate.role,
      emailVerified: gate.emailVerified,
    },
    telegram: gate.state,
    canUseTools: gate.canUseTools,
    preferences,
    profile,
  };
}

/** GET /api/me — حالة المستخدم والبوابة والتفضيلات في طلب واحد. */
export async function handleMe({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;

  return json(await buildMeResponse(env, gate));
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

/**
 * GET /api/tools — الأدوات المناسبة لهذا المستخدم (تتطلّب اجتياز البوابة).
 *
 * الترشيح يتم في الخادم اعتماداً على الملف المحفوظ، لا على ما يرسله العميل:
 * الدور (معلم/طالب) ثم المرحلة والصف والمواد. الأدوات غير المنفَّذة لا تظهر
 * إطلاقاً حتى لا يضغط المستخدم زراً لا يعمل.
 */
export async function handleTools({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;
  if (!gate.canUseTools) return errors.forbidden();

  const [all, profile] = await Promise.all([
    listPublishedTools(env.DB),
    getProfile(env.DB, gate.user.id),
  ]);

  return json({ tools: filterToolsForProfile(all, profile), profile });
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
