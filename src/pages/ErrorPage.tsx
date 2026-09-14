import { Link } from 'react-router-dom';

/** صفحة خطأ عامة — لا تعرض أي تفاصيل تقنية للمستخدم. */
export function ErrorPage({
  title = 'حدث خطأ غير متوقع',
  message = 'تعذّر إكمال العملية. حاول تحديث الصفحة أو المحاولة بعد قليل.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="container center-screen">
      <div className="stack" style={{ maxWidth: 480 }}>
        <h1 className="title-lg">{title}</h1>
        <p className="muted">{message}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {onRetry ? (
            <button type="button" className="btn btn-primary" onClick={onRetry}>
              إعادة المحاولة
            </button>
          ) : null}
          <Link className="btn btn-secondary" to="/">
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
