import { Link } from 'react-router-dom';

const FAQ = [
  {
    question: 'هل يجب أن أشترك في القناة أو أربط Telegram لاستخدام المنصّة؟',
    answer:
      'لا. تسجيل الدخول بحساب Google وإكمال بياناتك يكفيان لفتح المنصّة وكل أدواتها. ربط Telegram وزيارة القناة اختياريان تماماً ولا يؤثّران في وصولك.',
  },
  {
    question: 'أين أجد قناة المنصّة؟',
    answer:
      'من بطاقة «تقدر تزور قناتنا من هنا» أعلى لوحتك، أو من زر «زيارة القناة» فيها. زيارتها اختيارية ولا تغيّر شيئاً في حسابك.',
  },
  {
    question: 'انتهت صلاحية رابط الربط، ماذا أفعل؟',
    answer:
      'رابط الربط الاختياري صالح 10 دقائق فقط لأسباب أمنية. ارجع إلى صفحة «حسابي» واضغط «ربط Telegram» مرة أخرى للحصول على رابط جديد.',
  },
  {
    question: 'هل تُحفظ أسماء طلابي ودرجاتهم لديكم؟',
    answer:
      'لا. بيانات الطلاب تُحفظ في متصفّحك فقط (LocalStorage) ولا تُرسل إلى أي خادم. ما نحفظه على الخادم هو تفضيلاتك للقالب والألوان وإحصاءات استخدام عامة بلا أي محتوى.',
  },
  {
    question: 'كيف أمسح بيانات أداة من جهازي؟',
    answer: 'افتح الأداة واضغط زر «مسح بيانات الأداة» أعلى نموذج الإدخال.',
  },
  {
    question: 'التصدير لا يعمل أو الملف يخرج ناقصاً',
    answer:
      'انتظر حتى تكتمل المعاينة ثم أعد المحاولة. إن استمرت المشكلة جرّب متصفّحاً حديثاً (Chrome أو Edge أو Safari) وتأكّد من السماح بالتنزيلات.',
  },
  {
    question: 'هل تختلف القوالب السبعة فعلاً؟',
    answer:
      'نعم. كل قالب يختلف في شكل الترويسة وطريقة عرض الجدول والمسافات والتجميع البصري — والبيانات تبقى نفسها.',
  },
];

export function HelpPage() {
  return (
    <div className="container page-section">
      <h1 className="title-lg">المساعدة</h1>
      <p className="muted" style={{ marginBlockStart: 'var(--sp-2)' }}>
        أسئلة شائعة وحلول سريعة لأكثر المشكلات تكراراً.
      </p>

      <div className="faq-list" style={{ marginBlockStart: 'var(--sp-6)' }}>
        {FAQ.map((item) => (
          <details className="faq-item" key={item.question}>
            <summary className="faq-question">{item.question}</summary>
            <p className="faq-answer muted small">{item.answer}</p>
          </details>
        ))}
      </div>

      <div className="card" style={{ marginBlockStart: 'var(--sp-8)' }}>
        <h2 className="title-sm">لم تجد إجابتك؟</h2>
        <p className="muted small" style={{ marginBlockStart: 'var(--sp-2)' }}>
          راسلنا عبر قناة المنصة على تيليجرام، أو ارجع إلى <Link to="/account">صفحة حسابي</Link>{' '}
          للاطّلاع على حالة حسابك.
        </p>
      </div>
    </div>
  );
}
