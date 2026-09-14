# دليل النشر — أدوات المعلم

خطوات النشر على Cloudflare Workers من الصفر. اتبعها بالترتيب.

---

## 0) قبل أن تبدأ

تأكد أن الاختبارات تمرّ محلياً:

```bash
npm install
npm run lint
npm run typecheck
npm test
npm run build
```

---

## 1) تسجيل الدخول إلى Cloudflare

```bash
npx wrangler login
npx wrangler whoami      # للتأكد من الحساب الصحيح
```

---

## 2) إنشاء قاعدة D1

```bash
npx wrangler d1 create teacher_tools_db
```

المخرجات تحتوي `database_id`. افتح `wrangler.jsonc` واستبدل:

```jsonc
"database_id": "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

بالمعرّف الحقيقي.

---

## 3) تطبيق الـ migrations على قاعدة الإنتاج

```bash
npm run db:migrate:remote
```

للتأكد:

```bash
npx wrangler d1 execute teacher_tools_db --remote \
  --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
```

يجب أن ترى: `account`, `session`, `telegram_connections`, `telegram_link_tokens`,
`tools`, `usage_events`, `user`, `user_preferences`, `verification`.

---

## 4) النشر الأول (للحصول على النطاق)

```bash
npm run build
npx wrangler deploy
```

ستحصل على رابط مثل:

```
https://teacher-tools.<اسم-حسابك>.workers.dev
```

**احفظ هذا الرابط** — سنسمّيه `<PRODUCTION_URL>` في بقية الخطوات.

> في هذه المرحلة الموقع سيفتح لكن تسجيل الدخول لن يعمل بعد،
> لأن الأسرار لم تُضَف. هذا متوقّع.

---

## 5) إعداد Google OAuth على النطاق الحقيقي

في [Google Cloud Console](https://console.cloud.google.com/) → **Credentials** →
عميل OAuth الخاص بك:

- **Authorized JavaScript origins:**
  `<PRODUCTION_URL>`

- **Authorized redirect URIs:**
  `<PRODUCTION_URL>/api/auth/callback/google`

> مثال كامل:
> `https://teacher-tools.example.workers.dev/api/auth/callback/google`
>
> قد يستغرق تفعيل التغيير في Google بضع دقائق.

---

## 6) إضافة الأسرار

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put BETTER_AUTH_SECRET        # openssl rand -base64 32
npx wrangler secret put BETTER_AUTH_URL           # <PRODUCTION_URL> بلا شرطة في النهاية
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_BOT_USERNAME
npx wrangler secret put TELEGRAM_CHANNEL_ID
npx wrangler secret put TELEGRAM_CHANNEL_JOIN_URL
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # openssl rand -hex 32
npx wrangler secret put ADMIN_TELEGRAM_ID
```

للتأكد من أسماء الأسرار المضافة (بدون كشف قيمها):

```bash
npx wrangler secret list
```

> تأكّد أن `E2E_TEST_MODE` في `wrangler.jsonc` يساوي `"false"` في الإنتاج،
> وألا يوجد سرّ باسم `E2E_TEST_SECRET`.

---

## 7) إعادة النشر بعد إضافة الأسرار

```bash
npx wrangler deploy
```

ثم افحص:

```bash
curl <PRODUCTION_URL>/api/health
```

النتيجة المتوقّعة:

```json
{"ok":true,"missingConfig":[],"testMode":false}
```

إن ظهرت أسماء في `missingConfig` فهي الأسرار الناقصة (القيم لا تُكشف أبداً).

---

## 8) إعداد بوت تيليجرام

1. تأكّد أن البوت **Admin** في القناة.
2. سجّل الـ Webhook:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H 'content-type: application/json' \
  -d '{
    "url": "<PRODUCTION_URL>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

3. تأكّد:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

يجب أن ترى `"url"` صحيحاً و `"last_error_message"` فارغاً،
و `"pending_update_count": 0`.

---

## 9) اختبار قبول نهائي على الإنتاج

| # | الخطوة | النتيجة المتوقّعة |
|---|---|---|
| 1 | افتح `<PRODUCTION_URL>` | تظهر صفحة الهبوط بالعربية RTL |
| 2 | اضغط «تسجيل الدخول بواسطة Google» | يعمل بلا `redirect_uri_mismatch` |
| 3 | بعد الدخول | تُحوَّل إلى `/connect` |
| 4 | اضغط «ربط Telegram» | يفتح البوت برابط فيه توكن |
| 5 | اضغط Start في البوت | يصلك ردّ تأكيد |
| 6 | ارجع واضغط «تحقق من الاشتراك» (بدون اشتراك) | رسالة «لا يزال الاشتراك غير مؤكّد» |
| 7 | اشترك في القناة ثم أعد التحقق | تُفتح اللوحة |
| 8 | افتح أداة وأدخل بيانات | المعاينة تتحدّث فوراً |
| 9 | غيّر القالب واللون | المستند يتغيّر فوراً |
| 10 | صدّر PDF ثم PNG ثم اطبع | ملفات صحيحة بعربية سليمة بلا أزرار |
| 11 | افتح `/admin` بحساب عادي | صفحة «ليس لديك صلاحية» (403) |
| 12 | اربط حساب `ADMIN_TELEGRAM_ID` | `/admin` يعمل ويعرض الإحصاءات |

---

## 10) ربط نطاق مخصّص (اختياري)

1. أضف النطاق إلى Cloudflare.
2. من لوحة Workers → **Settings → Domains & Routes → Add Custom Domain**.
3. حدّث:
   - `BETTER_AUTH_URL` (عبر `wrangler secret put`).
   - روابط Google OAuth (Origins + Redirect URI).
   - رابط الـ Webhook في تيليجرام.
4. أعد النشر: `npx wrangler deploy`.

---

## 11) المتابعة بعد النشر

```bash
npx wrangler tail                      # سجلات حيّة
npx wrangler d1 info teacher_tools_db  # حجم القاعدة والاستهلاك
```

### ملاحظات على الخطة المجانية

المشروع مصمّم ليبقى داخل الحدود المجانية:

- **الأصول الثابتة لا تستدعي الـ Worker** — `run_worker_first` مضبوط على `/api/*` فقط،
  فتصفّح الصفحات لا يستهلك استدعاءات.
- **لا كتابة عند كل ضغطة مفتاح** — الأحداث محدودة ومُجمَّعة، مع منع التكرار في الواجهة
  (30 ثانية) وحدّ 60 حدثاً/دقيقة لكل مستخدم على الخادم.
- **التحقق من تيليجرام مرة كل 24 ساعة** لكل مستخدم، لا عند كل طلب.
- **كاش الجلسة في الكوكي (5 دقائق)** يقلّل قراءات D1 كثيراً.
- **فهارس مناسبة** على `created_at` و `user_id` و `tool_id` و `event_type`،
  وكل استعلامات لوحة الإدارة تجميعية بلا `SELECT *`.

### التراجع عن نشرة

```bash
npx wrangler deployments list
npx wrangler rollback <deployment-id>
```

---

## 12) مشاكل شائعة عند النشر

| المشكلة | الحل |
|---|---|
| `D1_ERROR: no such table` | لم تُطبَّق الـ migrations على القاعدة البعيدة: `npm run db:migrate:remote` |
| `Couldn't find a D1 DB with id ...` | `database_id` في `wrangler.jsonc` خاطئ |
| تسجيل الدخول يفشل بصمت | `BETTER_AUTH_URL` لا يطابق النطاق الفعلي تماماً |
| الـ Webhook يظهر خطأ 401 في `getWebhookInfo` | `secret_token` لا يطابق `TELEGRAM_WEBHOOK_SECRET` |
| الصفحات ترجع 404 عند التحديث | تأكّد أن `not_found_handling` في `wrangler.jsonc` = `single-page-application` |
