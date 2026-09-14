import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';

export function UnauthorizedPage() {
  return (
    <div className="container center-screen">
      <div className="stack" style={{ maxWidth: 480 }}>
        <span className="error-badge">
          <Icon name="shield" size={26} />
        </span>
        <span className="error-code numeric">403</span>
        <h1 className="title-lg">ليس لديك صلاحية</h1>
        <p className="muted">
          هذه الصفحة مخصّصة لمدير المنصة فقط. إن كنت تعتقد أن هذا خطأ، تأكّد من تسجيل الدخول بالحساب
          الصحيح وربط حساب تيليجرام المخوَّل.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn btn-primary" to="/dashboard">
            العودة للوحتي
          </Link>
        </div>
      </div>
    </div>
  );
}
