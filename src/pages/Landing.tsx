import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert } from '@/components/ui';
import { signInWithGoogle } from '@/lib/auth-client';
import { GoogleIcon, Icon } from '@/components/Icon';

const STEPS = [
  {
    number: 1,
    title: 'سجّل الدخول بحساب Google',
    text: 'خطوة واحدة بدون كلمات مرور جديدة تحفظها.',
  },
  {
    number: 2,
    title: 'اربط حساب Telegram',
    text: 'زر واحد يفتح البوت ويربط حسابك تلقائياً وبأمان.',
  },
  {
    number: 3,
    title: 'تأكّد من الاشتراك في القناة',
    text: 'بعد التأكيد تُفتح لك جميع الأدوات مباشرة.',
  },
];

const FEATURES = [
  {
    icon: 'clipboard' as const,
    title: 'مستندات جاهزة للطباعة',
    text: 'أدخل بياناتك وشاهد المستند يتكوّن أمامك، ثم صدّره PDF أو صورة أو اطبعه.',
  },
  {
    icon: 'layout' as const,
    title: 'سبعة قوالب مختلفة',
    text: 'نفس البيانات بسبعة تصاميم مختلفة فعلياً — اختر ما يناسب مدرستك.',
  },
  {
    icon: 'palette' as const,
    title: 'ألوان تناسب هويتك',
    text: 'خصّص الألوان كما تريد، والنظام يضمن بقاء المستند مقروءاً دائماً.',
  },
  {
    icon: 'shield' as const,
    title: 'بيانات طلابك لا تغادر جهازك',
    text: 'الأسماء والدرجات تُحفظ في متصفّحك فقط ولا تُرسل إلى أي خادم.',
  },
];

export function LandingPage() {
  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('error') ? 'تعذّر تسجيل الدخول بقوقل. حاول مرة أخرى.' : null,
  );

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('تعذّر تسجيل الدخول بقوقل. حاول مرة أخرى.');
      setBusy(false);
    }
  };

  return (
    <div>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-content">
            <span className="eyebrow">أدوات تختصر شغل المعلم</span>
            <h1 className="title-xl hero-title">
              معلّم <span className="hero-highlight">أكثر أثراً</span> كل يوم
            </h1>
            <p className="lead hero-lead">
              أدوات بسيطة واحترافية تساعدك على متابعة طلابك، وتحليل أخطاء صفّك، وتعويض الغائبين —
              ثم تخرج بمستند منسّق جاهز للطباعة خلال دقائق.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => void handleSignIn()}
                disabled={busy}
              >
                {busy ? <span className="spinner" aria-hidden="true" /> : <GoogleIcon />}
                تسجيل الدخول بواسطة Google
              </button>
              <span className="hint">مجاني للمعلمين — لا يتطلّب بطاقة ولا اشتراكاً مدفوعاً.</span>
            </div>

            {error ? (
              <div style={{ marginBlockStart: 'var(--sp-4)', maxWidth: 460 }}>
                <Alert tone="error" title="تعذّر تسجيل الدخول">
                  {error}
                </Alert>
              </div>
            ) : null}
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="hero-card hero-card-back" />
            <div className="hero-card hero-card-front">
              <div className="hero-card-head">
                <span className="hero-card-title">خطة متابعة الطلاب</span>
                <span className="hero-card-badge">جاهز للطباعة</span>
              </div>
              <div className="hero-card-rows">
                {[82, 64, 91, 47, 73].map((value, index) => (
                  <div className="hero-card-row" key={index}>
                    <span className="hero-card-name" />
                    <span className="hero-card-bar">
                      <span style={{ width: `${value}%` }} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section" id="steps">
        <div className="container">
          <h2 className="title-lg" style={{ textAlign: 'center' }}>
            ثلاث خطوات وتبدأ
          </h2>
          <div className="steps-grid">
            {STEPS.map((step) => (
              <div className="step-card" key={step.number}>
                <span className="step-number numeric">{step.number}</span>
                <h3 className="title-sm">{step.title}</h3>
                <p className="muted small">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section features-section">
        <div className="container">
          <h2 className="title-lg" style={{ textAlign: 'center' }}>
            لماذا أدوات المعلم؟
          </h2>
          <div className="features-grid">
            {FEATURES.map((feature) => (
              <div className="feature-card" key={feature.title}>
                <span className="feature-icon">
                  <Icon name={feature.icon} />
                </span>
                <h3 className="title-sm">{feature.title}</h3>
                <p className="muted small">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section">
        <div className="container">
          <div className="cta-band">
            <div>
              <h2 className="title-md">جاهز تبدأ؟</h2>
              <p className="muted small">سجّل دخولك الآن وابدأ أول مستند خلال دقائق.</p>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => void handleSignIn()}
              disabled={busy}
            >
              <GoogleIcon />
              ابدأ الآن
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
