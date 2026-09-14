import { studentFollowupTool } from './student-followup';
import { errorMapTool } from './error-map';
import { absencePlanTool } from './absence-plan';
import type { AnyToolDefinition } from './types';

/**
 * سجل الأدوات (Tool Registry).
 * لإضافة أداة جديدة: أنشئ مجلدها ثم أضف سطراً واحداً هنا — لا شيء آخر.
 * (وأضف صفّاً مقابلاً في جدول tools عبر migration جديدة لتظهر في الإحصاءات.)
 */
export const TOOLS: AnyToolDefinition[] = [studentFollowupTool, errorMapTool, absencePlanTool];

export function getToolBySlug(slug: string | undefined): AnyToolDefinition | null {
  if (!slug) return null;
  return TOOLS.find((tool) => tool.slug === slug) ?? null;
}
