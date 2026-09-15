/**
 * شاشة الإقلاع أثناء استعادة الجلسة.
 *
 * Firebase يستعيد المستخدم من التخزين بشكل غير متزامن، فلو عرضنا صفحة الهبوط
 * فوراً لظهر زر «تسجيل الدخول» جزءاً من الثانية ثم اختفى. هذه الشاشة تملأ تلك
 * الفجوة بهوية المنصّة بدل وميض مزعج.
 */
export function BootSplash({ label = 'جارٍ تجهيز حسابك…' }: { label?: string }) {
  return (
    <div className="boot-splash" role="status" aria-live="polite">
      <img className="boot-splash-mark" src="/icon-192.png" alt="" width={72} height={72} />
      <span className="boot-splash-name">أدوات المعلم</span>
      <span className="boot-splash-bar" aria-hidden="true">
        <span className="boot-splash-bar-fill" />
      </span>
      <span className="muted small">{label}</span>
    </div>
  );
}
