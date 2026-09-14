import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ApiRequestError, apiPost } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import type { LinkTokenResponse, MeResponse } from '@shared/types';

type Phase = 'idle' | 'creating' | 'waiting' | 'verifying';

/**
 * صفحة ربط تيليجرام والتحقق من الاشتراك.
 *
 * الربط لا يعتمد إطلاقاً على كتابة اسم المستخدم يدوياً: نُنشئ توكناً
 * لمرة واحدة على الخادم، ونفتح رابط البوت العميق، والربط الفعلي يحدث
 * داخل الـ Webhook عندما يضغط المستخدم Start.
 */
export function TelegramGatePage() {
  const { data, refresh } = useSession();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [notMember, setNotMember] = useState(false);

  const telegram = data?.telegram;
  const linked = telegram?.linked ?? false;
  const isMember = telegram?.isMember ?? false;

  useEffect(() => {
    if (data?.canUseTools) navigate('/dashboard', { replace: true });
  }, [data?.canUseTools, navigate]);

  const startLinking = async () => {
    setPhase('creating');
    setError(null);
    try {
      const response = await apiPost<LinkTokenResponse>('/api/telegram/link-token');
      setExpiresAt(response.expiresAt);
      setPhase('waiting');
      window.open(response.deepLink, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setPhase('idle');
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر إنشاء رابط الربط. حاول مرة أخرى.',
      );
    }
  };

  const checkLink = async () => {
    setPhase('verifying');
    setError(null);
    await refresh();
    setPhase('idle');
  };

  const verifySubscription = async () => {
    setPhase('verifying');
    setError(null);
    setNotMember(false);
    try {
      const response = await apiPost<{ telegram: MeResponse['telegram']; canUseTools: boolean }>(
        '/api/telegram/verify',
      );
      await refresh();
      if (!response.canUseTools) setNotMember(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر التحقق حالياً، حاول بعد قليل.',
      );
    } finally {
      setPhase('idle');
    }
  };

  return (
    <div className="container page-section">
      <div className="gate-wrap">
        <div className="gate-steps" aria-label="خطوات التفعيل">
          <span className={`gate-step is-done`}>
            <Icon name="check" size={16} /> تسجيل الدخول
          </span>
          <span className={`gate-step${linked ? ' is-done' : ' is-active'}`}>
            {linked ? <Icon name="check" size={16} /> : <span className="gate-dot" />} ربط Telegram
          </span>
          <span className={`gate-step${isMember ? ' is-done' : linked ? ' is-active' : ''}`}>
            {isMember ? <Icon name="check" size={16} /> : <span className="gate-dot" />} تأكيد
            الاشتراك
          </span>
        </div>

        <div className="card card-lg">
          <h1 className="title-lg">بقيت خطوة واحدة لفتح الأدوات</h1>
          <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
            {linked
              ? 'حسابك مربوط بتيليجرام. تأكّد من اشتراكك في القناة ثم اضغط «تحقق من الاشتراك».'
              : 'اربط حساب تيليجرام بضغطة واحدة — لا تحتاج كتابة أي معلومات يدوياً.'}
          </p>

          {error ? (
            <div style={{ marginBlockStart: 'var(--sp-5)' }}>
              <Alert tone="error" title="تعذّر إتمام العملية">
                {error}
              </Alert>
            </div>
          ) : null}

          {notMember ? (
            <div style={{ marginBlockStart: 'var(--sp-5)' }}>
              <Alert tone="warn" title="لا يزال الاشتراك غير مؤكّد">
                تأكد من الانضمام للقناة بنفس حساب تيليجرام الذي ربطته، ثم أعد المحاولة.
              </Alert>
            </div>
          ) : null}

          <hr className="divider" />

          {!linked ? (
            <div className="stack">
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => void startLinking()}
                disabled={phase === 'creating'}
              >
                <Icon name="link" size={18} />
                {phase === 'creating' ? 'جارٍ التجهيز…' : 'ربط Telegram'}
              </button>

              {phase === 'waiting' ? (
                <>
                  <Alert tone="info" title="افتح تيليجرام واضغط Start">
                    فتحنا لك محادثة البوت في نافذة جديدة. اضغط زر <strong>Start</strong> هناك، ثم
                    ارجع واضغط الزر بالأسفل.
                    {expiresAt ? (
                      <>
                        {' '}
                        صلاحية الرابط تنتهي خلال <strong>10 دقائق</strong>.
                      </>
                    ) : null}
                  </Alert>
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={() => void checkLink()}
                    disabled={phase !== 'waiting'}
                  >
                    تحقّقت من الربط — حدّث الحالة
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <div className="stack">
              {telegram?.channelJoinUrl ? (
                <a
                  className="btn btn-soft btn-lg btn-block"
                  href={telegram.channelJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  الانضمام للقناة
                </a>
              ) : (
                <Alert tone="warn">رابط القناة غير مُعدّ على الخادم. تواصل مع المشرف.</Alert>
              )}

              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => void verifySubscription()}
                disabled={phase === 'verifying'}
              >
                {phase === 'verifying' ? <Spinner label="جارٍ التحقق…" /> : 'تحقق من الاشتراك'}
              </button>
            </div>
          )}

          <hr className="divider" />
          <p className="hint">
            واجهت مشكلة؟ اطّلع على <Link to="/help">صفحة المساعدة</Link> أو أعد المحاولة بعد قليل.
          </p>
        </div>
      </div>
    </div>
  );
}
