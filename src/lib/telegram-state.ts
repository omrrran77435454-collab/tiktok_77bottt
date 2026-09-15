/**
 * آلة حالات ربط تيليجرام.
 *
 * الغرض: ألّا يرى المستخدم أبداً زر «تحقق من الاشتراك» قبل أن نعطيه طريقاً
 * واضحاً للاشتراك. الحالة تُشتقّ من بيانات الخادم وحدها، فلا تتناقض الواجهة
 * مع الحقيقة، وكل حالة تعرف نصّها وخطوتها التالية.
 */
import type { TelegramGateState } from '@shared/types';

export type TelegramPhase =
  | 'NOT_LINKED'
  | 'LINKING'
  | 'LINKED_NOT_SUBSCRIBED'
  | 'CHECKING_SUBSCRIPTION'
  | 'LINKED_SUBSCRIBED'
  | 'ERROR';

/** ما تفعله الواجهة الآن: لا شيء، أو ربط جارٍ، أو تحقّق جارٍ. */
export type TelegramActivity = 'idle' | 'linking' | 'checking';

export interface TelegramView {
  phase: TelegramPhase;
  title: string;
  description: string;
  /** هل نعرض زر «اشترك في القناة»؟ */
  showJoinButton: boolean;
  /** هل نعرض زر «تحقق من الاشتراك»؟ */
  showVerifyButton: boolean;
  /** هل نعرض زر «ربط Telegram»؟ */
  showLinkButton: boolean;
  /** هل نعرض زر «فتح البوت» الصغير؟ */
  showBotButton: boolean;
}

/**
 * يحسب الحالة المعروضة.
 *
 * قاعدة أساسية: زر التحقّق لا يظهر إلا بعد الربط ومعه زر الاشتراك دائماً —
 * فلا نطلب من المستخدم أن «يتحقّق» قبل أن نعطيه رابط القناة.
 */
export function telegramView(
  state: Pick<TelegramGateState, 'linked' | 'isMember'> | null | undefined,
  activity: TelegramActivity = 'idle',
  errorMessage: string | null = null,
): TelegramView {
  if (errorMessage) {
    return {
      phase: 'ERROR',
      title: 'تعذّر إتمام العملية',
      description: errorMessage,
      showJoinButton: !!state?.linked,
      showVerifyButton: !!state?.linked,
      showLinkButton: !state?.linked,
      showBotButton: !!state?.linked,
    };
  }

  if (!state?.linked) {
    if (activity === 'linking') {
      return {
        phase: 'LINKING',
        title: 'افتح تيليجرام واضغط Start',
        description:
          'فتحنا لك محادثة البوت. اضغط زر Start هناك ثم ارجع واضغط «حدّث الحالة». صلاحية الرابط 10 دقائق.',
        showJoinButton: false,
        showVerifyButton: false,
        showLinkButton: false,
        showBotButton: true,
      };
    }

    return {
      phase: 'NOT_LINKED',
      title: 'اربط حساب تيليجرام',
      description: 'ضغطة واحدة تفتح البوت وتربط حسابك — لا تحتاج كتابة أي معلومات.',
      showJoinButton: false,
      showVerifyButton: false,
      showLinkButton: true,
      showBotButton: false,
    };
  }

  if (state.isMember) {
    return {
      phase: 'LINKED_SUBSCRIBED',
      title: 'حسابك جاهز',
      description: 'حسابك مربوط واشتراكك في القناة مؤكَّد. الأدوات مفتوحة الآن.',
      showJoinButton: false,
      showVerifyButton: false,
      showLinkButton: false,
      showBotButton: false,
    };
  }

  if (activity === 'checking') {
    return {
      phase: 'CHECKING_SUBSCRIPTION',
      title: 'جارٍ التحقق من اشتراكك',
      description: 'نسأل تيليجرام الآن — لحظات من فضلك.',
      showJoinButton: true,
      showVerifyButton: false,
      showBotButton: true,
      showLinkButton: false,
    };
  }

  return {
    phase: 'LINKED_NOT_SUBSCRIBED',
    title: 'بقيت خطوة واحدة',
    description: 'اشترك في القناة ثم ارجع واضغط «تحقق من الاشتراك».',
    showJoinButton: true,
    showVerifyButton: true,
    showLinkButton: false,
    showBotButton: true,
  };
}
