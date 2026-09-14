/**
 * أنواع مشتركة بين الواجهة (src) والـ Worker.
 * هذه هي "عقد الـ API" — أي تغيير هنا يجب أن ينعكس على الطرفين.
 */

export type UserRole = 'user' | 'admin';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
}

/** حالة بوابة تيليجرام لمستخدم مسجّل الدخول. */
export interface TelegramGateState {
  /** هل ربط المستخدم حساب تيليجرام؟ */
  linked: boolean;
  /** هل الاشتراك في القناة مؤكَّد حالياً؟ */
  isMember: boolean;
  /** آخر وقت تحقّقنا فيه من الاشتراك (ISO). */
  lastCheckedAt: string | null;
  /** اسم مستخدم تيليجرام إن توفّر (للعرض فقط، ليس مفتاحاً). */
  telegramUsername: string | null;
  /** رابط الانضمام للقناة (من إعدادات الخادم). */
  channelJoinUrl: string;
  /** اسم البوت لبناء رابط الربط. */
  botUsername: string;
}

export interface MeResponse {
  user: SessionUser;
  telegram: TelegramGateState;
  /** هل يُسمح للمستخدم بفتح الأدوات؟ (مسجّل دخول + مربوط + مشترك) */
  canUseTools: boolean;
  preferences: UserPreferences | null;
}

export interface UserPreferences {
  defaultTemplateId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
}

export interface LinkTokenResponse {
  /** رابط تيليجرام العميق الذي يفتح البوت ويرسل التوكن. */
  deepLink: string;
  /** لحظة انتهاء الصلاحية (ISO). */
  expiresAt: string;
}

export type UsageEventType =
  | 'login'
  | 'telegram_linked'
  | 'subscription_verified'
  | 'subscription_failed'
  | 'tool_opened'
  | 'export_pdf'
  | 'export_png'
  | 'print'
  | 'template_selected';

export interface UsageEventInput {
  eventType: UsageEventType;
  /** معرّف الأداة (slug) إن كان الحدث مرتبطاً بأداة. */
  toolId?: string | null;
  /** معرّف القالب إن كان الحدث مرتبطاً بقالب. */
  templateId?: string | null;
  /** اللون الأساسي المستخدم (HEX) — لإحصاءات التفضيلات فقط. */
  primaryColor?: string | null;
}

export interface AdminToolStat {
  toolId: string;
  nameAr: string;
  opened: number;
  exports: number;
}

export interface AdminTemplateStat {
  templateId: string;
  count: number;
}

export interface AdminColorStat {
  color: string;
  count: number;
}

export interface AdminRecentUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  linked: boolean;
  isMember: boolean;
}

export interface AdminActivityItem {
  eventType: UsageEventType;
  toolId: string | null;
  createdAt: string;
}

export interface AdminDailyPoint {
  day: string;
  count: number;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    newThisMonth: number;
    activeToday: number;
    activeLast7: number;
    activeLast30: number;
  };
  telegram: {
    linked: number;
    verified: number;
    failed: number;
  };
  exports: {
    pdf: number;
    png: number;
    print: number;
  };
  tools: AdminToolStat[];
  templates: AdminTemplateStat[];
  colors: AdminColorStat[];
  recentUsers: AdminRecentUser[];
  recentActivity: AdminActivityItem[];
  eventsPerDay: AdminDailyPoint[];
}

export interface ToolMeta {
  id: string;
  slug: string;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  enabled: boolean;
  sortOrder: number;
}

/** شكل الخطأ الموحّد من الـ API. رسالة عربية جاهزة للعرض. */
export interface ApiError {
  error: string;
  /** رمز ثابت للتعامل البرمجي. */
  code: string;
}
