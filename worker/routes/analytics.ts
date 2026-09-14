import { z } from 'zod';
import type { RouteContext } from '../lib/router';
import { errors, json, readJson } from '../lib/http';
import { evaluateGate } from '../lib/gate';
import { countRecentEvents, insertUsageEvent } from '../lib/repo';

/** الحد الأقصى لعدد الأحداث المقبولة من مستخدم واحد خلال دقيقة. */
const RATE_LIMIT_PER_MINUTE = 60;

const eventSchema = z.object({
  eventType: z.enum([
    'login',
    'telegram_linked',
    'subscription_verified',
    'subscription_failed',
    'tool_opened',
    'export_pdf',
    'export_png',
    'print',
    'template_selected',
  ]),
  toolId: z.string().min(1).max(60).nullish(),
  templateId: z.string().min(1).max(40).nullish(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullish(),
});

/**
 * POST /api/events — تسجيل حدث استخدام واحد (Metadata فقط).
 *
 * ما لا يُسجَّل أبداً: أي محتوى مستند، أسماء طلاب، درجات، ملاحظات.
 * التحقق من النوع عبر Zod يمنع تخزين أي قيمة خارج القائمة المعروفة.
 */
export async function handleTrackEvent({ request, env }: RouteContext): Promise<Response> {
  const gate = await evaluateGate(request, env);
  if (gate instanceof Response) return gate;

  const parsed = eventSchema.safeParse(await readJson(request));
  if (!parsed.success) return errors.badRequest('نوع الحدث غير معروف.');

  const sinceIso = new Date(Date.now() - 60_000).toISOString();
  const recent = await countRecentEvents(env.DB, gate.user.id, sinceIso);
  if (recent >= RATE_LIMIT_PER_MINUTE) {
    return errors.tooManyRequests();
  }

  await insertUsageEvent(env.DB, {
    userId: gate.user.id,
    eventType: parsed.data.eventType,
    toolId: parsed.data.toolId ?? null,
    templateId: parsed.data.templateId ?? null,
    primaryColor: parsed.data.primaryColor ?? null,
  });

  return json({ ok: true }, { status: 202 });
}
