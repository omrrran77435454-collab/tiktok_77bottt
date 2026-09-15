import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ApiRequestError, apiPost } from '@/lib/api';
import { useSession } from '@/lib/useSession';
import { telegramView, type TelegramActivity } from '@/lib/telegram-state';
import { destinationFor } from '@/lib/destination';
import type { LinkTokenResponse, MeResponse } from '@shared/types';

/**
 * صفحة ربط تيليجرام والتحقق من الاشتراك.
 *
 * التسلسل مقصود: ربط ← اشتراك ← تحقّق. لا يظهر زر «تحقق من الاشتراك» أبداً
 * قبل أن يكون زر «اشترك في القناة» أمام المستخدم — وإلا طلبنا منه أن يتحقّق
 * من شيء لم نعطه طريقاً إليه.
 *
 * الربط نفسه يحدث في الـ Webhook على الخادم بتوكن لمرة واحدة، فلا يكتب
 * المستخدم أي معرّف يدوياً ولا يستطيع العميل ادّعاء هوية تيليجرام.
 */
export function TelegramGatePage() {
  const { data, setData, refresh } = useSession();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<TelegramActivity>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notMember, setNotMember] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const telegram = data?.telegram;
  const view = telegramView(telegram, activity, error);

  useEffect(() => {
    // بمجرّد اكتمال البوابة ننتقل إلى الوجهة الصحيحة (تهيئة أو لوحة)
    // بلا انتظار تحديث يدوي. الحارس RedirectWhenDone يغطّي الحالة نفسها،
    // وهذا يضمن الانتقال حتى لو وصلت الحالة بعد أول رسم.
    if (data?.canUseTools) navigate(destinationFor(data), { replace: true });
  }, [data, navigate]);

  const startLinking = async () => {
    setActivity('linking');
    setError(null);
    try {
      const response = await apiPost<LinkTokenResponse>('/api/telegram/link-token');
      setExpiresAt(response.expiresAt);
      window.open(response.deepLink, '_blank', 'noopener,noreferrer');
    } catch (requestError) {
      setActivity('idle');
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر إنشاء رابط الربط. حاول مرة أخرى.',
      );
    }
  };

  /**
   * «حدّث الحالة»: يسأل الخادم مباشرةً (لا الذاكرة المحلية) فيقرأ D1 ويستعلم
   * من Telegram بلا مهلة، ثم يحدّث حالة الجلسة. الانتقال يقع تلقائياً في
   * التأثير أعلاه بمجرّد أن يصبح canUseTools صحيحاً.
   */
  const refreshStatus = async () => {
    setActivity('checking');
    setError(null);
    try {
      const session = await apiPost<MeResponse>('/api/telegram/status');
      setData(session);
    } catch (requestError) {
      // إن فشل المسار الجديد لأي سبب نعود إلى إعادة الجلب العادية.
      if (requestError instanceof ApiRequestError && requestError.status >= 500) {
        await refresh();
      } else {
        setError(
          requestError instanceof ApiRequestError
            ? requestError.message
            : 'تعذّر تحديث الحالة. حاول مرة أخرى.',
        );
      }
    } finally {
      setActivity('idle');
    }
  };

  const verifySubscription = async () => {
    setActivity('checking');
    setError(null);
    setNotMember(false);
    try {
      const session = await apiPost<MeResponse>('/api/telegram/verify');
      setData(session);
      if (!session.canUseTools) setNotMember(true);
    } catch (requestError) {
      setError(
        requestError instanceof ApiRequestError
          ? requestError.message
          : 'تعذّر التحقق حالياً، حاول بعد قليل.',
      );
    } finally {
      setActivity('idle');
    }
  };

  const linked = telegram?.linked ?? false;
  const isMember = telegram?.isMember ?? false;

  return (
    <div className="container page-section">
      <div className="gate-wrap">
        <div className="gate-steps" aria-label="خطوات التفعيل">
          <span className="gate-step is-done">
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
          <h1 className="title-lg">{view.title}</h1>
          <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
            {view.description}
          </p>

          {view.phase === 'LINKING' && expiresAt ? (
            <div style={{ marginBlockStart: 'var(--sp-5)' }}>
              <Alert tone="info" title="افتح تيليجرام واضغط Start">
                بعد الضغط على <strong>Start</strong> هناك، ارجع واضغط «حدّث الحالة» بالأسفل.
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

          <div className="stack">
            {view.showLinkButton ? (
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => void startLinking()}
                disabled={activity !== 'idle'}
              >
                <Icon name="link" size={18} /> ربط Telegram
              </button>
            ) : null}

            {view.phase === 'LINKING' ? (
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={() => void refreshStatus()}
                disabled={activity === 'checking'}
              >
                تحقّقت من الربط — حدّث الحالة
              </button>
            ) : null}

            {view.phase === 'NOT_LINKED' ? (
              // ربطتَ من جهاز أو تبويب آخر؟ زر يقرأ الحقيقة من الخادم.
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void refreshStatus()}
                disabled={activity !== 'idle'}
              >
                ربطتُ حسابي مسبقاً — حدّث الحالة
              </button>
            ) : null}

            {view.showJoinButton ? (
              telegram?.channelJoinUrl ? (
                <a
                  className="btn btn-soft btn-lg btn-block"
                  href={telegram.channelJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="link" size={18} /> اشترك في القناة
                </a>
              ) : (
                <Alert tone="warn">رابط القناة غير مُعدّ على الخادم. تواصل مع المشرف.</Alert>
              )
            ) : null}

            {view.showVerifyButton ? (
              <button
                type="button"
                className="btn btn-primary btn-lg btn-block"
                onClick={() => void verifySubscription()}
                disabled={activity !== 'idle'}
              >
                تحقق من الاشتراك
              </button>
            ) : null}

            {view.phase === 'CHECKING_SUBSCRIPTION' ? (
              <Spinner label="جارٍ التحقق…" />
            ) : null}

            {view.showBotButton && telegram?.botUsername ? (
              <a
                className="btn btn-ghost btn-sm"
                href={`https://t.me/${telegram.botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                فتح البوت
              </a>
            ) : null}
          </div>

          <hr className="divider" />
          <p className="hint">
            واجهت مشكلة؟ اطّلع على <Link to="/help">صفحة المساعدة</Link> أو أعد المحاولة بعد قليل.
          </p>
        </div>
      </div>
    </div>
  );
}
