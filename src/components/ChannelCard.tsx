import { Icon } from '@/components/Icon';
import { useSession } from '@/lib/useSession';

/**
 * بطاقة دعوة لزيارة قناة المنصّة على تيليجرام.
 *
 * دعوة لا بوابة: لا نطلب اشتراكاً، ولا نتحقّق منه، ولا يتغيّر شيء في حساب
 * المستخدم أو صلاحيته سواء ضغط الزر أم تجاهله.
 *
 * الرابط يأتي من الخادم (TELEGRAM_CHANNEL_JOIN_URL عبر /api/me) — لا رابط
 * مكتوب يدوياً في الواجهة، فيبقى مصدر واحد للحقيقة.
 */
export function ChannelCard() {
  const { data } = useSession();
  const url = data?.telegram?.channelUrl;
  if (!url) return null;

  return (
    <div className="container">
      <aside className="channel-card">
        <span className="channel-card-icon" aria-hidden="true">
          <Icon name="sparkle" size={18} />
        </span>
        <p className="channel-card-text">تقدر تزور قناتنا من هنا</p>
        <a
          className="btn btn-soft btn-sm channel-card-action"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          زيارة القناة
        </a>
      </aside>
    </div>
  );
}
