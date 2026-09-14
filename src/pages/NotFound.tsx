import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container center-screen">
      <div className="stack" style={{ maxWidth: 460 }}>
        <span className="error-code numeric">404</span>
        <h1 className="title-lg">الصفحة غير موجودة</h1>
        <p className="muted">
          الرابط الذي فتحته غير صحيح أو تم تغييره. تأكّد من العنوان أو ارجع إلى الصفحة الرئيسية.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" to="/">
            العودة للرئيسية
          </Link>
          <Link className="btn btn-secondary" to="/help">
            صفحة المساعدة
          </Link>
        </div>
      </div>
    </div>
  );
}
