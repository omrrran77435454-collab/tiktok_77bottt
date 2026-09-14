import { Link } from 'react-router-dom';

/**
 * سياسة الخصوصية.
 * النقطة الجوهرية: بيانات الطلاب لا تغادر جهاز المعلم إطلاقاً.
 */
export function PrivacyPage() {
  return (
    <div className="container page-section">
      <article className="legal-page">
        <h1 className="title-lg">سياسة الخصوصية</h1>
        <p className="muted small">آخر تحديث: سبتمبر 2026</p>

        <section className="legal-section">
          <h2 className="title-sm">الخلاصة في سطرين</h2>
          <p>
            بيانات طلابك — الأسماء والدرجات والملاحظات — <strong>تبقى في متصفّحك</strong> ولا تُرسل
            إلى خوادمنا ولا إلى Google ولا إلى Telegram. ما نحفظه على الخادم هو حسابك وحالة اشتراكك
            وإحصاءات استخدام عامة فقط.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">ما الذي نحفظه على الخادم</h2>
          <ul className="legal-list">
            <li>
              <strong>معرّف Firebase (UID):</strong> رقم داخلي يميّز حسابك، ينتج عن تسجيل الدخول
              بحساب Google.
            </li>
            <li>
              <strong>الاسم والبريد الإلكتروني وصورة الحساب:</strong> كما يوفّرها حساب Google،
              لعرضها لك داخل المنصّة.
            </li>
            <li>
              <strong>معرّف Telegram الرقمي واسم المستخدم:</strong> لربط حسابك والتحقّق من اشتراكك.
            </li>
            <li>
              <strong>حالة الاشتراك في القناة وتاريخ آخر تحقّق.</strong>
            </li>
            <li>
              <strong>تفضيلات العرض:</strong> القالب المفضّل والألوان التي اخترتها.
            </li>
            <li>
              <strong>إحصاءات استخدام عامة:</strong> أي أداة فُتحت، وأي قالب اختير، ومتى تمّ تصدير
              ملف — بدون أي محتوى من المستند.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">ما الذي لا نحفظه إطلاقاً</h2>
          <ul className="legal-list">
            <li>أسماء الطلاب.</li>
            <li>درجات الطلاب ونتائجهم.</li>
            <li>المهارات المتعثّرة والملاحظات المكتوبة عنهم.</li>
            <li>أي محتوى من المستند الذي تنشئه.</li>
          </ul>
          <p>
            هذه البيانات تُحفظ في <strong>التخزين المحلي (LocalStorage)</strong> داخل متصفّحك على
            جهازك فقط، ولا تمرّ عبر الشبكة. يمكنك مسحها في أي وقت من زر «مسح بيانات الأداة» داخل كل
            أداة، أو «مسح بيانات جميع الأدوات» من <Link to="/account">صفحة الحساب</Link>.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">من نشارك معه بياناتك</h2>
          <p>
            لا نبيع بياناتك ولا نشاركها لأغراض تسويقية. نستخدم خدمتين خارجيتين فقط لتشغيل المنصّة:
          </p>
          <ul className="legal-list">
            <li>
              <strong>Google (Firebase Authentication):</strong> لتسجيل الدخول فقط. لا نرسل إليها أي
              بيانات طلاب.
            </li>
            <li>
              <strong>Telegram:</strong> للتحقّق من اشتراكك في القناة. نرسل معرّفك الرقمي فقط
              للسؤال عن حالة العضوية.
            </li>
          </ul>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">الكوكيز والتتبّع</h2>
          <p>
            لا نستخدم كوكيز إعلانية ولا أدوات تتبّع من طرف ثالث. جلستك تُدار عبر رمز هوية من
            Firebase يُحفظ في تخزين المتصفّح، ويُرسل مع طلباتك للتحقّق من هويتك.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">حذف حسابك</h2>
          <p>
            يمكنك فكّ ربط Telegram في أي وقت من صفحة الحساب. إن رغبت في حذف حسابك بالكامل من
            المنصّة، تواصل معنا عبر قناة المنصّة على Telegram.
          </p>
        </section>

        <section className="legal-section">
          <h2 className="title-sm">التواصل</h2>
          <p>
            لأي سؤال عن الخصوصية، تواصل معنا عبر قناة المنصّة على Telegram. راجع أيضاً{' '}
            <Link to="/terms">شروط الاستخدام</Link>.
          </p>
        </section>
      </article>
    </div>
  );
}
