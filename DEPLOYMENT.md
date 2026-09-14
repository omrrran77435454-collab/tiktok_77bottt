# دليل النشر — أدوات المعلم

النشر **آلي بالكامل** عبر GitHub Actions. لا تحتاج تشغيل أي أمر يدوياً.

---

## الطريقة الموصى بها: النشر الآلي من GitHub

### ما تحتاج إضافته مرة واحدة (GitHub → Settings → Secrets and variables → Actions)

| السرّ | من أين تحصل عليه |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → قالب **Edit Cloudflare Workers** + صلاحية `D1:Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → العمود الجانبي |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Web app |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<PROJECT_ID>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | معرّف مشروع Firebase |
| `VITE_FIREBASE_APP_ID` | من نفس الصفحة |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | من نفس الصفحة |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `TELEGRAM_BOT_USERNAME` | اسم البوت بدون `@` |
| `TELEGRAM_CHANNEL_ID` | مثل `-1001234567890` |
| `TELEGRAM_CHANNEL_JOIN_URL` | رابط دعوة القناة |
| `TELEGRAM_WEBHOOK_SECRET` | `openssl rand -hex 32` |
| `ADMIN_TELEGRAM_ID` | `5559869840` |

### ثم شغّل النشر

من تبويب **Actions** → **Deploy** → **Run workflow**.

### ماذا يفعل الـ workflow

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm test` (وحدات + تكامل)
5. `npm run build`
6. `npx playwright test` (E2E على سطح المكتب والجوال)
7. `node scripts/deploy.mjs` — وهو الذي:
   - ينشئ قاعدة D1 باسم `teacher-tools-db` إن لم تكن موجودة،
   - يكتب `database_id` في `wrangler.jsonc`،
   - يطبّق الـ migrations على القاعدة البعيدة،
   - ينشر الـ Worker ويستخرج رابط الإنتاج،
   - يرفع الأسرار عبر `wrangler secret put` (بلا طباعة أي قيمة)،
   - يضبط Telegram Webhook ويتحقّق منه عبر `getWebhookInfo`،
   - يشغّل فحص صحّة على النسخة المنشورة.

رابط الإنتاج يظهر في **ملخّص التشغيل (Summary)** أعلى صفحة الـ workflow.

> إن فشل أي من بوابات الجودة، **لا يحدث نشر إطلاقاً** وتُرفع تقارير الاختبار
> كـ artifact لمراجعتها.

---

## بعد أول نشر: خطوتان في لوحات التحكّم

### 1) Firebase — إضافة نطاق الإنتاج

**Authentication → Settings → Authorized domains → Add domain**:

```
<WORKER_NAME>.<ACCOUNT_SUBDOMAIN>.workers.dev
```

بدونها يظهر `auth/unauthorized-domain` عند تسجيل الدخول.

### 2) Telegram — إضافة البوت مشرفاً في القناة

`getChatMember` لا يُرجع نتيجة موثوقة لقناة إلا إذا كان البوت **Admin** فيها.
القناة → Administrators → Add Administrator → اختر البوت.

> ضبط الـ Webhook نفسه يتم آلياً داخل `scripts/deploy.mjs` — لا تحتاج تشغيل
> `setWebhook` يدوياً.

---

## النشر اليدوي (بديل)

إن أردت النشر من جهازك مباشرة:

```bash
npx wrangler login                       # موافقة في المتصفّح

export FIREBASE_PROJECT_ID=...
export TELEGRAM_BOT_TOKEN=...
export TELEGRAM_BOT_USERNAME=...
export TELEGRAM_CHANNEL_ID=...
export TELEGRAM_CHANNEL_JOIN_URL=...
export TELEGRAM_WEBHOOK_SECRET=...
export ADMIN_TELEGRAM_ID=5559869840

npm ci && npm run build
node scripts/deploy.mjs
```

السكربت نفسه يقوم بكل شيء: D1، migrations، النشر، الأسرار، الـ Webhook، فحص الصحّة.

---

## اختبار قبول على الإنتاج

| # | الخطوة | النتيجة المتوقّعة |
|---|---|---|
| 1 | افتح رابط الإنتاج | صفحة الهبوط بالعربية RTL مع الأيقونة الرسمية |
| 2 | `/api/health` | `{"ok":true,"missingConfig":[],"testMode":false}` |
| 3 | اضغط «تسجيل الدخول بواسطة Google» | نافذة Google تفتح وتنجح |
| 4 | بعد الدخول | تُحوَّل إلى `/connect` |
| 5 | اضغط «ربط Telegram» ثم Start في البوت | يصلك ردّ تأكيد |
| 6 | «تحقق من الاشتراك» بدون اشتراك | «لا يزال الاشتراك غير مؤكّد» |
| 7 | اشترك ثم أعد التحقّق | تُفتح اللوحة |
| 8 | افتح أداة وأدخل بيانات | المعاينة تتحدّث فوراً |
| 9 | أدخل درجة أكبر من الدرجة الكلية | رسالة خطأ ويُمنع التصدير |
| 10 | صدّر PDF ثم PNG ثم اطبع | ملفات بعربية سليمة بلا أزرار |
| 11 | `/admin` بحساب عادي | صفحة «ليس لديك صلاحية» (403) |
| 12 | اربط حساب `ADMIN_TELEGRAM_ID` ثم `/admin` | لوحة الإحصاءات تعمل |
| 13 | `/privacy` و `/terms` | تفتحان للزائر بلا تسجيل دخول |
| 14 | `/favicon.ico` و `/icon-192.png` و `/site.webmanifest` | `200 OK` والأيقونة الجديدة |

---

## المتابعة بعد النشر

```bash
npx wrangler tail                         # سجلات حيّة
npx wrangler d1 info teacher-tools-db     # حجم القاعدة والاستهلاك
npx wrangler secret list                  # أسماء الأسرار (بلا قيم)
npx wrangler deployments list             # سجل النشرات
npx wrangler rollback <deployment-id>     # تراجع
```

### البقاء داخل الحدود المجانية

- **الأصول الثابتة لا تستدعي الـ Worker** — `run_worker_first` مضبوط على `/api/*` فقط.
- **لا كتابة عند كل ضغطة مفتاح** — أحداث محدودة، منع تكرار 30 ثانية في الواجهة،
  وحدّ 60 حدثاً/دقيقة لكل مستخدم على الخادم.
- **التحقّق من تيليجرام مرة كل 24 ساعة** لكل مستخدم، لا عند كل طلب.
- **`last_seen_at` يُحدَّث كل 15 دقيقة كحد أقصى** بدل كل طلب.
- **مفاتيح Firebase العامة مخزّنة مؤقّتاً 6 ساعات** داخل الـ isolate.
- **فهارس مناسبة** وكل استعلامات لوحة الإدارة تجميعية بلا `SELECT *`.

---

## مشاكل شائعة

| المشكلة | الحل |
|---|---|
| `Authentication error [code: 10000]` | `CLOUDFLARE_API_TOKEN` ناقص الصلاحيات (يحتاج Workers Scripts:Edit + D1:Edit) |
| `D1_ERROR: no such table` | الـ migrations لم تُطبَّق: `npm run db:migrate:remote` |
| `auth/unauthorized-domain` | أضف نطاق الإنتاج في Firebase → Authorized domains |
| الـ Webhook يظهر خطأ في `getWebhookInfo` | `TELEGRAM_WEBHOOK_SECRET` في Cloudflare لا يطابق ما أُرسل في `setWebhook` |
| الصفحات ترجع 404 عند التحديث | تأكّد أن `not_found_handling` = `single-page-application` |
| `/api/health` يعرض `missingConfig` | الأسرار المذكورة لم تُرفع — أعد تشغيل الـ workflow |
