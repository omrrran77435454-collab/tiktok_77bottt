import { isTestMode, missingEnvVars, type Env } from './env';
import { Router, type RouteContext } from './lib/router';
import { errors, json } from './lib/http';
import { handleLogin, handleMe, handleSavePreferences, handleTools } from './routes/me';
import { handleTrackEvent } from './routes/analytics';
import {
  handleCreateLinkToken,
  handleTelegramWebhook,
  handleUnlinkTelegram,
  handleVerifySubscription,
} from './routes/telegram';
import { handleAdminStats } from './routes/admin';

const router = new Router()
  .get('/api/me', handleMe)
  .post('/api/me/login', handleLogin)
  .post('/api/me/preferences', handleSavePreferences)
  .get('/api/tools', handleTools)

  .post('/api/telegram/link-token', handleCreateLinkToken)
  .post('/api/telegram/verify', handleVerifySubscription)
  .post('/api/telegram/unlink', handleUnlinkTelegram)
  .post('/api/telegram/webhook', handleTelegramWebhook)

  .post('/api/events', handleTrackEvent)

  .get('/api/admin/stats', handleAdminStats)

  .get('/api/health', ({ env }) => {
    const missing = missingEnvVars(env);
    return json({
      ok: missing.length === 0,
      // أسماء فقط ولا قيم — للمساعدة في تشخيص الإعداد دون تسريب أي شيء.
      missingConfig: missing,
      testMode: isTestMode(env),
    });
  });

/**
 * نقطة الدخول للـ Worker.
 *
 * ملاحظة معمارية: إعدادات wrangler تجعل الأصول الثابتة (SPA) تُقدَّم مباشرة
 * من شبكة Cloudflare، و`run_worker_first: ["/api/*"]` يضمن وصول طلبات الـ API
 * فقط إلى هذا الكود. لذلك لا يُستدعى الـ Worker عند تصفّح الصفحات العادية.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      // احتياط: إن وصل طلب غير API (مثلاً أثناء التطوير) نمرّره لخدمة الأصول.
      return env.ASSETS.fetch(request);
    }

    const context: RouteContext = { request, env, ctx, url };

    try {
      return await router.handle(context);
    } catch (error) {
      // نسجّل تقنياً في السجلات فقط، ونُرجع رسالة عربية عامة بلا أي تفاصيل.
      console.error('[api] unhandled error', {
        path: url.pathname,
        message: error instanceof Error ? error.message : 'unknown',
      });
      return errors.serverError();
    }
  },
} satisfies ExportedHandler<Env>;
