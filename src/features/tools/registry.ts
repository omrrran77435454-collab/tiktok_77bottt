import { studentFollowupTool } from './student-followup';
import { errorMapTool } from './error-map';
import { absencePlanTool } from './absence-plan';
import { studentScheduleTool } from './student-schedule';
import { studyPlanTool } from './study-plan';
import { homeworkOrganizerTool } from './homework-organizer';
import { examPrepTool } from './exam-prep';
import type { AnyToolDefinition } from './types';

/**
 * سجل الأدوات (Tool Registry).
 *
 * لإضافة أداة جديدة: أنشئ مجلدها ثم أضف سطراً واحداً هنا — لا شيء آخر.
 * وأضف صفّاً مقابلاً في جدول tools عبر migration جديدة بـ is_implemented = 1
 * لتظهر في الكتالوج؛ الأدوات التي لا يقابلها تنفيذ هنا لا تُعرض إطلاقاً.
 */
export const TOOLS: AnyToolDefinition[] = [
  studentFollowupTool,
  errorMapTool,
  absencePlanTool,
  studentScheduleTool,
  studyPlanTool,
  homeworkOrganizerTool,
  examPrepTool,
];

export function getToolBySlug(slug: string | undefined): AnyToolDefinition | null {
  if (!slug) return null;
  return TOOLS.find((tool) => tool.slug === slug) ?? null;
}

/** المعرّفات المنفَّذة فعلاً — يُستخدم للتحقّق من تطابق الكتالوج مع الكود. */
export const IMPLEMENTED_TOOL_IDS = TOOLS.map((tool) => tool.id);
