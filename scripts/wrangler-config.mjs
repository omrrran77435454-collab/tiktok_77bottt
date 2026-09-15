/**
 * أدوات ضبط معرّف قاعدة D1 في ملفات إعداد Wrangler.
 *
 * لماذا يوجد هذا الملف؟
 *   إضافة @cloudflare/vite-plugin تُولّد أثناء `vite build` نسخةً من إعداد
 *   Wrangler داخل dist، وتكتب في `.wrangler/deploy/config.json` حقل configPath
 *   يشير إليها. عند `wrangler deploy` يقرأ Wrangler الإعداد المولَّد ذاك — لا
 *   wrangler.jsonc الأصلي. وبما أن البناء يسبق سكربت النشر في GitHub Actions،
 *   فإن تعديل الملف الأصلي وحده يترك القيمة النائبة مجمّدة داخل الإعداد المولَّد،
 *   فيفشل النشر بـ: Binding DB of type d1 must have a valid database_id specified.
 *
 *   لذلك نعدّل الملفين معاً، ثم نتحقّق صراحةً من الملف الذي سيقرأه Wrangler فعلاً.
 *
 * الدوال هنا نقيّة قدر الإمكان (نص ← نص) حتى تكون قابلة للاختبار بلا نشر حقيقي.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** الملف الذي تكتبه الإضافة لتحويل Wrangler إلى الإعداد المولَّد. */
export const DEPLOY_POINTER = '.wrangler/deploy/config.json';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** هل القيمة معرّف D1 حقيقي؟ (ليست فارغة ولا القيمة النائبة). */
export function isDatabaseId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim());
}

/** أول 8 أحرف فقط — يكفي للتشخيص ولا يكشف المعرّف كاملاً في السجل. */
export function shortId(value) {
  return typeof value === 'string' && value ? `${value.slice(0, 8)}…` : '(فارغ)';
}

/**
 * يستبدل قيمة database_id داخل نص wrangler.jsonc.
 * نستخدم استبدالاً نصّياً لأن الملف jsonc (يسمح بالتعليقات) ولا نريد إعادة تنسيقه.
 */
export function setDatabaseIdInSourceConfig(text, databaseId) {
  const updated = text.replace(
    /("database_id"\s*:\s*")[^"]*(")/,
    (_match, prefix, suffix) => `${prefix}${databaseId}${suffix}`,
  );
  return { text: updated, changed: updated !== text || text.includes(databaseId) };
}

/** يجمع كل تعريفات D1 في الإعداد المولَّد، بما فيها ما تحت env (مراجع لا نسخ). */
function collectD1Bindings(config) {
  const scopes = [config, ...Object.values(config?.env ?? {})];
  return scopes.flatMap((scope) => (Array.isArray(scope?.d1_databases) ? scope.d1_databases : []));
}

function matches(entry, { binding, databaseName }) {
  return entry?.binding === binding || entry?.database_name === databaseName;
}

/**
 * يكتب المعرّف الحقيقي في الـ D1 binding داخل الإعداد المولَّد.
 * يرمي خطأً واضحاً إن كان الملف غير صالح أو لم يُعثر على الـ binding —
 * لأن المتابعة إلى wrangler deploy عندها تعني فشلاً مؤكّداً.
 */
export function setDatabaseIdInGeneratedConfig(text, databaseId, target) {
  if (!isDatabaseId(databaseId)) {
    throw new Error(`معرّف القاعدة المعطى ليس UUID صالحاً: ${shortId(databaseId)}`);
  }

  let config;
  try {
    config = JSON.parse(text);
  } catch (error) {
    throw new Error(`الإعداد المولَّد ليس JSON صالحاً: ${error.message}`);
  }

  const bindings = collectD1Bindings(config);
  if (bindings.length === 0) {
    throw new Error('الإعداد المولَّد لا يحتوي أي تعريف d1_databases.');
  }

  const targeted = bindings.filter((entry) => matches(entry, target));
  if (targeted.length === 0) {
    const found = bindings.map((entry) => entry.binding ?? '?').join(', ');
    throw new Error(
      `لم يُعثر على D1 binding باسم «${target.binding}» أو قاعدة «${target.databaseName}». الموجود: ${found}`,
    );
  }

  for (const entry of targeted) entry.database_id = databaseId;

  return { text: JSON.stringify(config), updated: targeted.length };
}

/** يقرأ قيمة database_id الحالية من الإعداد المولَّد (سلسلة فارغة إن غابت). */
export function readDatabaseIdFromGeneratedConfig(text, target) {
  const config = JSON.parse(text);
  const entry = collectD1Bindings(config).find((candidate) => matches(candidate, target));
  return entry?.database_id ?? '';
}

/**
 * يحدّد مسار الإعداد المولَّد الذي سيستخدمه Wrangler.
 * يُرجع null إن لم تكن الإضافة قد ولّدت إعداداً (لم يُنفَّذ بناء بعد).
 * configPath نسبيٌّ إلى مجلّد ملف التحويل نفسه.
 */
export function resolveGeneratedConfigPath(cwd = process.cwd()) {
  const pointerPath = resolve(cwd, DEPLOY_POINTER);
  if (!existsSync(pointerPath)) return null;

  let pointer;
  try {
    pointer = JSON.parse(readFileSync(pointerPath, 'utf8'));
  } catch (error) {
    throw new Error(`تعذّرت قراءة ${DEPLOY_POINTER}: ${error.message}`);
  }

  if (typeof pointer?.configPath !== 'string' || !pointer.configPath) {
    throw new Error(`الحقل configPath غير موجود في ${DEPLOY_POINTER}.`);
  }

  const configPath = resolve(dirname(pointerPath), pointer.configPath);
  if (!existsSync(configPath)) {
    throw new Error(`الإعداد المولَّد المشار إليه غير موجود: ${configPath}`);
  }
  return configPath;
}
