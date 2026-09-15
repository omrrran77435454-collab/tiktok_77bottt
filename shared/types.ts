/**
 * أنواع مشتركة بين الواجهة (src) والـ Worker.
 * هذه هي "عقد الـ API" — أي تغيير هنا يجب أن ينعكس على الطرفين.
 */

/**
 * صلاحية النظام: من يدخل لوحة الإدارة. يحدّدها الخادم وحده من التوكن.
 * منفصلة تماماً عن ProfileRole (تجربة الاستخدام: معلم أو طالب).
 */
export type AccessRole = 'user' | 'admin';

/** @deprecated استخدم AccessRole — يبقى للتوافق أثناء الانتقال. */
export type UserRole = AccessRole;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  /** صلاحية النظام (user | admin) — لا علاقة لها بكون المستخدم معلماً أو طالباً. */
  role: AccessRole;
  /** هل أكّد المزوّد ملكية البريد؟ للعرض فقط. */
  emailVerified: boolean;
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
  /** ملف الاستخدام (الدور والمرحلة والصف والمواد) — يُملأ في التهيئة. */
  profile: UserProfile;
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
  | 'telegram_unlinked'
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

/* ==========================================================================
 * البنية التعليمية وملف المستخدم والكتالوج
 * ========================================================================== */

/** دور تجربة الاستخدام — منفصل عن صلاحية النظام (UserRole). */
export type ProfileRole = 'teacher' | 'student';

/** الجمهور المستهدف بأداة أو قسم. */
export type ToolAudience = 'teacher' | 'student' | 'both';

export type ToolStatus = 'draft' | 'published' | 'disabled';

export interface StageRef {
  id: string;
  nameAr: string;
}

export interface GradeRef {
  id: string;
  stageId: string;
  nameAr: string;
  /** هل يحتاج هذا الصف اختيار مسار؟ */
  requiresTrack: boolean;
}

export interface TrackRef {
  id: string;
  nameAr: string;
}

export interface SubjectRef {
  id: string;
  nameAr: string;
  /** null = متاحة لكل المراحل. */
  stageId: string | null;
}

export interface ToolCategoryRef {
  id: string;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  audience: ToolAudience;
  sortOrder: number;
}

export interface CatalogResponse {
  stages: StageRef[];
  grades: GradeRef[];
  tracks: TrackRef[];
  subjects: SubjectRef[];
  categories: ToolCategoryRef[];
}

export interface UserProfile {
  /** دور التجربة (teacher | student) — لا علاقة له بصلاحية النظام. */
  role: ProfileRole;
  /** للطالب: مرحلته الواحدة. للمعلم: تبقى null — نصابه في assignments. */
  stageId: string | null;
  /** للطالب: صفّه الواحد. */
  gradeId: string | null;
  /** للطالب: مساره إن كان صفّه يتطلّبه. */
  trackId: string | null;
  subjects: string[];
  onboardingCompleted: boolean;
  completedAt: string | null;
  /** تكليفات المعلم (فارغة للطالب). */
  assignments: TeacherAssignment[];
}

export interface ProfileInputBody {
  role: ProfileRole;
  stageId: string | null;
  gradeId: string | null;
  trackId: string | null;
  subjects: string[];
  onboardingCompleted?: boolean;
}

export interface ToolCatalogItem {
  id: string;
  slug: string;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  categoryId: string | null;
  audience: ToolAudience;
  status: ToolStatus;
  stages: string[];
  grades: string[];
  subjects: string[];
  keywords: string[];
  isFeatured: boolean;
  isNew: boolean;
  /** هل للأداة صفحة منفَّذة فعلاً؟ لا نعرض أزراراً لا تعمل. */
  isImplemented: boolean;
  sortOrder: number;
}

/* ------------------------------ الجدول الأسبوعي ----------------------------- */

export type ScheduleItemStatus = 'planned' | 'done' | 'cancelled';
export type PreparationStatus = 'not_started' | 'in_progress' | 'ready';
export type FollowupStatus = 'none' | 'pending' | 'done';

export interface ScheduleSettings {
  periodsPerDay: number;
  startTime: string;
  periodMinutes: number;
}

export interface ScheduleItem {
  id: string;
  day: number;
  period: number;
  startTime: string | null;
  endTime: string | null;
  subjectId: string | null;
  subjectLabel: string | null;
  gradeId: string | null;
  className: string | null;
  lessonTitle: string | null;
  notes: string | null;
  homework: string | null;
  status: ScheduleItemStatus;
  preparationStatus: PreparationStatus;
  followupStatus: FollowupStatus;
}

export interface ScheduleResponse {
  settings: ScheduleSettings;
  items: ScheduleItem[];
}

export interface ScheduleItemInput {
  day: number;
  period: number;
  subjectId?: string | null;
  subjectLabel?: string | null;
  gradeId?: string | null;
  className?: string | null;
  lessonTitle?: string | null;
  notes?: string | null;
  homework?: string | null;
  status?: ScheduleItemStatus;
  preparationStatus?: PreparationStatus;
  followupStatus?: FollowupStatus;
}

/* --------------------------------- الإدارة --------------------------------- */

export interface AdminAuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

export interface AdminToolInput {
  slug: string;
  nameAr: string;
  descriptionAr: string;
  icon: string;
  categoryId: string | null;
  audience: ToolAudience;
  status: ToolStatus;
  stages: string[];
  grades: string[];
  subjects: string[];
  keywords: string[];
  isFeatured: boolean;
  isNew: boolean;
  sortOrder: number;
}

/* --------------------------- نصاب المعلم --------------------------- */

/**
 * تكليف واحد للمعلم: مرحلة + صف + مادة (+ شعبة اختيارية).
 * المعلم يملك عدة تكليفات؛ الطالب لا يملك أياً منها.
 */
export interface TeacherAssignment {
  id: string;
  stageId: string;
  gradeId: string;
  subjectId: string;
  className: string | null;
  section: string | null;
  isActive: boolean;
}

export interface TeacherAssignmentInput {
  stageId: string;
  gradeId: string;
  subjectId: string;
  className?: string | null;
  section?: string | null;
}

/** ملخّص نصاب المعلم — يُشتقّ من التكليفات لا يُخزَّن. */
export interface TeacherScope {
  stages: string[];
  grades: string[];
  subjects: string[];
}
