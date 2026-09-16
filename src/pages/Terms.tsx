import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="container page-section">
      <article className="legal-page">
        <h1 className="title-lg">شروط الاستخدام</h1>
        <p className="muted small">آخر تحديث: سبتمبر 2026</p>

        <section className="legal-section">
          <h2 className="title-sm">طبيعة الخدمة</h2>
          <p>
            «أدوات المعلم» منصّة تساعدك على تنظيم بياناتك وتحويلها إلى مستندات منسّقة. الأدوات
            <strong> مساعِدة للمعلم</strong> ولا تحلّ محلّ حكمه المهني ولا محلّ أنظمة مدرستك
            الرسمية.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">مسؤوليتك عن المخرجات</h2>
          <ul className="legal-list">
            <li>أنت المسؤول عن صحّة البيانات التي تُدخلها.</li>
            <li>
              <strong>راجع كل ملف قبل اعتماده أو طباعته أو تسليمه.</strong> التصنيفات والقرارات التي
              تقترحها الأدوات مبنية على الحدود التي تُدخلها أنت.
            </li>
            <li>
              المخرجات <strong>ليست اعتماداً رسمياً</strong> من أي جهة تعليمية.
            </li>
            <li>
              لا نضمن توافق كل نموذج مع متطلّبات كل مدرسة أو إدارة تعليمية. تحقّق من النموذج المطلوب
              لديك.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">الاستخدام المقبول</h2>
          <ul className="legal-list">
            <li>استخدم المنصّة لأغراض تعليمية مشروعة فقط.</li>
            <li>لا تحاول تجاوز قيود الوصول أو التحقّق من الهوية.</li>
            <li>لا تستخدم المنصّة لإرسال محتوى مسيء أو مخالف للأنظمة.</li>
            <li>حسابك شخصي — لا تشاركه مع غيرك.</li>
            <li>لا تُحمّل الخدمة بطلبات آلية مفرطة.</li>
          </ul>
          <p>قد نوقف الوصول عن أي حساب يخالف هذه الشروط.</p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">شروط الوصول</h2>
          <p>
            فتح الأدوات يتطلّب تسجيل الدخول بحساب Google وإكمال بيانات حسابك — لا أكثر. ربط حساب
            Telegram وزيارة قناة المنصّة اختياريان تماماً ولا يؤثّران في وصولك إلى أي أداة.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">توفّر الخدمة</h2>
          <p>
            نقدّم الخدمة «كما هي» دون ضمانات باستمرار توفّرها. قد نُجري تحديثات أو صيانة تؤثّر
            مؤقّتاً على الوصول. بياناتك المحلية تبقى في متصفّحك ولا تتأثّر بذلك.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">الخصوصية</h2>
          <p>
            تعامُلنا مع بياناتك موضّح في <Link to="/privacy">سياسة الخصوصية</Link>، وهي جزء لا
            يتجزّأ من هذه الشروط.
          </p>
        </section>
      </article>
    </div>
  );
}
