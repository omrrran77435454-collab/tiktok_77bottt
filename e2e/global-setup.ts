import { execFileSync } from 'node:child_process';
import { ADMIN_TELEGRAM_ID } from './helpers';

/**
 * تهيئة قبل تشغيل اختبارات E2E.
 *
 * معرّف تيليجرام الخاص بالإدمن ثابت، وقاعدة D1 المحلية تفرض أن حساب تيليجرام
 * واحد لا يُربط بأكثر من حساب موقع. لذلك نحذف ارتباطه من التشغيل السابق فقط —
 * حذف دقيق لا يمسّ أي بيانات أخرى.
 */
export default function globalSetup(): void {
  const statements = [
    `DELETE FROM telegram_connections WHERE telegram_user_id = '${ADMIN_TELEGRAM_ID}'`,
    `DELETE FROM telegram_link_tokens WHERE used_at IS NOT NULL`,
  ];

  for (const sql of statements) {
    try {
      execFileSync(
        'npx',
        ['wrangler', 'd1', 'execute', 'teacher_tools_db', '--local', '--command', sql],
        { stdio: 'ignore' },
      );
    } catch {
      // قاعدة محلية غير مهيّأة بعد — الاختبارات ستُبلّغ عن ذلك بوضوح.
      console.warn('[e2e] تعذّر تنظيف قاعدة D1 المحلية. شغّل: npm run e2e:prepare');
    }
  }
}
