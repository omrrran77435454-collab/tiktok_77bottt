# أدوات المعلم

**أدوات تختصر شغل المعلم** — منصة ويب عربية (RTL بالكامل) تعطي المعلم أدوات عملية
يُدخل فيها بياناته فيخرج بمستند احترافي جاهز للطباعة أو التصدير PDF / PNG خلال دقائق.

> **مبدأ أساسي:** بيانات الطلاب (الأسماء، الدرجات، الملاحظات) **لا تغادر جهاز المعلم**.
> تُحفظ في `localStorage` فقط، ولا تُرسل إلى الخادم ولا إلى تيليجرام ولا إلى جوجل.

---

## المحتويات

1. [نظرة على النظام](#نظرة-على-النظام)
2. [التقنيات](#التقنيات)
3. [المتطلبات](#المتطلبات)
4. [التشغيل المحلي](#التشغيل-المحلي)
5. [إعداد Cloudflare و D1](#إعداد-cloudflare-و-d1)
6. [إعداد Google OAuth](#إعداد-google-oauth)
7. [إعداد بوت تيليجرام والقناة](#إعداد-بوت-تيليجرام-والقناة)
8. [المتغيّرات والأسرار](#المتغيّرات-والأسرار)
9. [النشر](#النشر)
10. [الاختبارات](#الاختبارات)
11. [بنية المشروع](#بنية-المشروع)
12. [إضافة أداة جديدة](#إضافة-أداة-جديدة)
13. [حل المشاكل الشائعة](#حل-المشاكل-الشائعة)

---

## نظرة على النظام

رحلة المستخدم:

```
الصفحة الرئيسية
   ↓ تسجيل الدخول بحساب Google
ربط حساب Telegram (زر واحد — بدون كتابة أي معلومة يدوياً)
   ↓ التحقق التلقائي من الاشتراك في القناة
لوحة المعلم → اختيار أداة → إدخال البيانات → معاينة حيّة
   ↓ اختيار قالب من 7 قوالب + تخصيص الألوان
تصدير PDF أو PNG أو طباعة
```

الأدوات في النسخة الأولى:

| الأداة | ماذا تفعل |
|---|---|
| خطة متابعة الطلاب بعد الاختبار | توزيع المستويات + خطة متابعة فردية لكل طالب |
| خريطة أخطاء الصف | نسبة الخطأ لكل سؤال، ترتيب المهارات المتعثّرة، قرار الحصة القادمة |
| خطة تعويض طالب غائب | ترتيب ما فات الطالب إلى: يبدأ الآن / يؤجَّل / لا يحتاج تعويضاً |

لوحة إدارة محمية على `/admin` تعرض إحصاءات استخدام عامة (بلا أي بيانات طلاب).

---

## التقنيات

| الطبقة | التقنية |
|---|---|
| الواجهة | React 19 + TypeScript 6 + Vite 8 |
| الخادم | Cloudflare Workers (بلا Backend منفصل) |
| الأصول الثابتة | Cloudflare Workers Static Assets |
| قاعدة البيانات | Cloudflare D1 (SQLite) |
| المصادقة | Firebase Authentication (Google) + تحقّق RS256 في الخادم عبر `jose` |
| التحقق من المدخلات | Zod 4 |
| التصدير | `html-to-image` (PNG عالي الدقة) + `jsPDF` (تجميع A4) |
| الاختبارات | Vitest (وحدات + تكامل) + Playwright (E2E) |
| أدوات التطوير | Wrangler 4, ESLint 10 |

**لماذا PDF من صور عالية الدقة؟** لأن تشكيل الحروف العربية واتجاه RTL يرسمهما
المتصفّح بشكل صحيح تماماً، بينما مكتبات PDF تحتاج ضبطاً معقّداً للـ Bidi وغالباً
تُخرج حروفاً منفصلة. نلتقط كل صفحة A4 بدقة **3×** (≈ 285 نقطة/بوصة) ثم نضعها في PDF
بمقاس A4 مضبوط — النتيجة مطابقة للمعاينة وصالحة للطباعة.

---

## المتطلبات

- Node.js **20.19+** أو **22+**
- npm 10+
- حساب Cloudflare (الخطة المجانية كافية)
- مشروع في Google Cloud Console (لـ OAuth)
- بوت وقناة في تيليجرام

---

## التشغيل المحلي

```bash
# 1) تثبيت الاعتماديات
npm install

# 2) إنشاء ملفَّي المتغيّرات المحلية
cp .env.example .env            # إعدادات Firebase للواجهة
cp .dev.vars.example .dev.vars  # أسرار الـ Worker
#    ثم املأ القيم (انظر قسم "المتغيّرات والأسرار")

# 3) إنشاء قاعدة D1 المحلية وتطبيق الـ migrations
npm run db:migrate:local

# 4) تشغيل المشروع
npm run dev
```

ثم افتح: <http://localhost:5173>

> الـ Worker وقاعدة D1 يعملان محلياً داخل `workerd` عبر إضافة
> `@cloudflare/vite-plugin`، أي أن بيئة التطوير قريبة جداً من الإنتاج.

### تشغيل بلا بوت تيليجرام حقيقي

يوجد محاكي بسيط لواجهة Telegram Bot API للتجربة والاختبار المحلي:

```bash
npm run mock:telegram          # يعمل على http://127.0.0.1:8788
```

ثم في `.dev.vars`:

```
TELEGRAM_API_BASE=http://127.0.0.1:8788
```

وللتحكم في حالة الاشتراك أثناء التجربة:

```bash
curl -X POST http://127.0.0.1:8788/__control/member \
  -H 'content-type: application/json' \
  -d '{"userId":"123456789","status":"member"}'
```

---

## إعداد Cloudflare و D1

```bash
# تسجيل الدخول
npx wrangler login

# إنشاء قاعدة البيانات
npx wrangler d1 create teacher-tools-db
```

انسخ `database_id` الناتج وضعه في `wrangler.jsonc` مكان
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

ثم طبّق الـ migrations:

```bash
npm run db:migrate:local     # القاعدة المحلية (للتطوير)
npm run db:migrate:remote    # القاعدة على Cloudflare (للإنتاج)
```

الـ migrations موجودة في مجلد `migrations/` وتُطبَّق بالترتيب:

| الملف | المحتوى |
|---|---|
| `0001_core_schema.sql` | كل الجداول (`users`, `telegram_connections`, `telegram_link_tokens`, `usage_events`, `user_preferences`, `tools`) والفهارس |
| `0002_seed_tools.sql` | بيانات الأدوات الأولية |

---

## إعداد Firebase Authentication

المشروع يستخدم **Firebase Authentication** (خطة Spark المجانية — بلا بطاقة دفع)
لتسجيل الدخول بحساب Google. لا نستخدم Firestore ولا Firebase Hosting ولا Cloud Functions.

### 1) إنشاء المشروع

1. افتح [Firebase Console](https://console.firebase.google.com/) واضغط **Add project**.
2. الاسم: `teacher-tools` (أو أي اسم متاح).
3. **عطّل Google Analytics** — غير مطلوب ويبسّط الإعداد.

### 2) تفعيل تسجيل الدخول بـ Google

1. من القائمة: **Build → Authentication → Get started**.
2. تبويب **Sign-in method** → اختر **Google** → **Enable**.
3. اختر بريد الدعم (Project support email) ثم **Save**.

### 3) إنشاء تطبيق ويب واستخراج الإعدادات

1. **Project settings** (⚙) → **General** → **Your apps** → أيقونة الويب `</>`.
2. سمِّ التطبيق `أدوات المعلم` ولا تفعّل Firebase Hosting.
3. انسخ قيم `firebaseConfig` إلى ملف `.env`:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=<PROJECT_ID>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<PROJECT_ID>
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
```

> **هذه القيم ليست أسراراً.** Firebase يصمّمها لتكون علنية داخل حزمة المتصفّح.
> الحماية الحقيقية في موضعين: التحقّق من توقيع ID Token داخل الـ Worker،
> وقائمة النطاقات المصرّح بها في الخطوة التالية.

### 4) النطاقات المصرّح بها (Authorized domains)

**Authentication → Settings → Authorized domains → Add domain**، وأضف نطاق الإنتاج:

```
<WORKER_NAME>.<ACCOUNT_SUBDOMAIN>.workers.dev
```

`localhost` مضاف تلقائياً للتطوير. بدون هذه الخطوة سيظهر الخطأ
`auth/unauthorized-domain` عند محاولة تسجيل الدخول من الموقع المنشور.

### 5) إعداد الخادم

الـ Worker يحتاج متغيّراً واحداً فقط للتحقّق من التوكن:

```
FIREBASE_PROJECT_ID=<PROJECT_ID>
```

### كيف يتحقّق الخادم من الهوية

لا نستخدم Firebase Admin SDK (لا يعمل على Workers ويحتاج مفتاح خدمة).
بدلاً منه يتحقّق الـ Worker من التوكن مباشرةً عبر `jose`:

| الفحص | القيمة المتوقّعة |
|---|---|
| الخوارزمية | `RS256` |
| التوقيع | مقابل مفاتيح Google العامة (JWKS) مع تخزين مؤقّت 6 ساعات |
| `iss` | `https://securetoken.google.com/<PROJECT_ID>` |
| `aud` | `<PROJECT_ID>` |
| `exp` | في المستقبل |
| `auth_time` | في الماضي |
| `sub` | غير فارغ — وهو الـ uid |

كل طلب إلى `/api/*` يحمل `Authorization: Bearer <idToken>`.
**لا تُستخدم كوكيز جلسة إطلاقاً**، وهذا يُلغي سطح هجوم CSRF من الأساس.
ولا يُقبل أي `uid` أو `email` أو `role` قادم من العميل — كلها تُستخرج من توكن موثّق.

## إعداد بوت تيليجرام والقناة

### 1) إنشاء البوت

1. افتح [@BotFather](https://t.me/BotFather) في تيليجرام.
2. أرسل `/newbot` ثم اتبع الخطوات (اسم ظاهر + `username` ينتهي بـ `bot`).
3. ستحصل على **التوكن**. ضعه في `TELEGRAM_BOT_TOKEN`.
4. ضع اسم المستخدم **بدون `@`** في `TELEGRAM_BOT_USERNAME`.

> ⚠️ إذا تسرّب توكن قديم في أي وقت: أرسل `/revoke` لـ BotFather فوراً
> واستخدم التوكن الجديد فقط. راجع `legacy/README.md` في هذا المستودع.

### 2) إضافة البوت مشرفاً في القناة

`getChatMember` لا يُرجع نتيجة موثوقة لقناة إلا إذا كان البوت **Admin** فيها.

1. افتح القناة → **Administrators** → **Add Administrator**.
2. ابحث عن بوتك وأضفه.
3. يكفي أن تُبقي له صلاحيات القراءة الأساسية.

### 3) الحصول على معرّف القناة `TELEGRAM_CHANNEL_ID`

للقنوات الخاصة يكون المعرّف رقماً سالباً يبدأ بـ `-100`. أسهل طريقة:

1. أرسل أي رسالة في القناة.
2. أعد توجيهها إلى [@userinfobot](https://t.me/userinfobot) أو [@JsonDumpBot](https://t.me/JsonDumpBot).
3. خذ `chat.id` (مثال: `-1001234567890`) وضعه في `TELEGRAM_CHANNEL_ID`.

طريقة بديلة عبر الـ API (بعد إضافة البوت مشرفاً وإرسال رسالة في القناة):

```bash
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

### 4) رابط الانضمام `TELEGRAM_CHANNEL_JOIN_URL`

من إعدادات القناة → **Invite Links** → انسخ الرابط (`https://t.me/+xxxxxxxx`)
وضعه في `TELEGRAM_CHANNEL_JOIN_URL`.

### 5) سرّ الـ Webhook

```bash
openssl rand -hex 32
```

ضع الناتج في `TELEGRAM_WEBHOOK_SECRET`.

### 6) تسجيل الـ Webhook (بعد النشر)

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H 'content-type: application/json' \
  -d '{
    "url": "https://<your-domain>/api/telegram/webhook",
    "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
    "allowed_updates": ["message"]
  }'
```

للتأكد:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

لإلغائه:

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

### 7) اختبار `getChatMember` يدوياً

```bash
curl "https://api.telegram.org/bot<TOKEN>/getChatMember?chat_id=<CHANNEL_ID>&user_id=<USER_ID>"
```

القيم التي يعتبرها النظام "مشترك": `creator`, `administrator`, `member`،
بالإضافة إلى `restricted` **فقط** عندما تكون `is_member = true`.

### 8) اختبار الربط كاملاً

1. سجّل الدخول في الموقع بحساب Google.
2. اضغط **ربط Telegram** → سيفتح البوت برابط فيه توكن لمرة واحدة.
3. اضغط **Start** → يصلك ردّ تأكيد من البوت.
4. ارجع للموقع → اضغط **تحقق من الاشتراك**.

---

## المتغيّرات والأسرار

### متغيّرات الواجهة (ملف `.env` — تُضمَّن في حزمة المتصفّح، ليست أسراراً)

| المتغيّر | الوصف |
|---|---|
| `VITE_FIREBASE_API_KEY` | من Firebase Console |
| `VITE_FIREBASE_AUTH_DOMAIN` | `<PROJECT_ID>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | معرّف مشروع Firebase |
| `VITE_FIREBASE_APP_ID` | من Firebase Console |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | من Firebase Console |
| `VITE_E2E_TEST_MODE` | `true` في اختبارات E2E فقط — اتركه فارغاً في الإنتاج |

### أسرار الخادم (Cloudflare Secrets — لا تُرفع إلى Git أبداً)

| المتغيّر | الوصف |
|---|---|
| `FIREBASE_PROJECT_ID` | للتحقّق من `iss` و `aud` في التوكن |
| `TELEGRAM_BOT_TOKEN` | توكن البوت — **سرّي** |
| `TELEGRAM_BOT_USERNAME` | اسم البوت بدون `@` |
| `TELEGRAM_CHANNEL_ID` | معرّف القناة (مثل `-1001234567890`) |
| `TELEGRAM_CHANNEL_JOIN_URL` | رابط الانضمام للقناة |
| `TELEGRAM_WEBHOOK_SECRET` | سرّ التحقّق من الـ Webhook — **سرّي** |
| `ADMIN_TELEGRAM_ID` | المعرّف الرقمي لحساب تيليجرام الخاص بالمدير |
| `TELEGRAM_API_BASE` | اختياري — لتوجيه الطلبات لمحاكي أثناء الاختبار |
| `E2E_TEST_MODE` / `E2E_TEST_SECRET` | وضع اختبار E2E فقط — `false` في الإنتاج |

- **محلياً:** ضعها في `.dev.vars` (الملف مُستثنى من Git).
- **إنتاجاً:** ضعها كـ Cloudflare Secrets:

```bash
npx wrangler secret put FIREBASE_PROJECT_ID
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_BOT_USERNAME
npx wrangler secret put TELEGRAM_CHANNEL_ID
npx wrangler secret put TELEGRAM_CHANNEL_JOIN_URL
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put ADMIN_TELEGRAM_ID
```

> **لا تضع أي قيمة سرّية داخل `wrangler.jsonc` أو داخل كود الواجهة.**
> راجع `SECURITY.md`.

للتأكد من اكتمال الإعداد بعد النشر:

```bash
curl https://<your-domain>/api/health
# {"ok":true,"missingConfig":[],"testMode":false}
```

---

## النشر

```bash
npm run build
npx wrangler deploy
```

تفاصيل خطوة بخطوة في [`DEPLOYMENT.md`](./DEPLOYMENT.md).

---

## الاختبارات

```bash
npm run lint         # ESLint
npm run typecheck    # TypeScript (الواجهة + الـ Worker + أدوات البناء)
npm test             # Vitest — وحدات + تكامل للـ API
npm run build        # بناء الإنتاج

# اختبارات E2E (تشغّل محاكي تيليجرام وخادم التطوير تلقائياً)
npm run e2e:prepare  # يجهّز .dev.vars (إن لم يوجد) ويطبّق migrations محلياً
npm run test:e2e
```

اختبارات التكامل تُشغّل **كود الـ Worker الحقيقي** مقابل قاعدة SQLite في الذاكرة
تحاكي واجهة D1، مع محاكاة Telegram — بلا أي أسرار حقيقية وبلا اتصال بالشبكة.

---

## بنية المشروع

```
├── worker/                    كود Cloudflare Worker (الـ API)
│   ├── index.ts               نقطة الدخول والموجّه
│   ├── env.ts                 أنواع المتغيّرات وفحص اكتمالها
│   ├── lib/
│   │   ├── firebase-auth.ts   التحقّق من Firebase ID Token (RS256 + JWKS)
│   │   ├── gate.ts            المصادقة والصلاحيات وبوابة الاشتراك
│   │   └── …                  router, http, crypto, telegram, repo
│   └── routes/                me, telegram, analytics, admin
├── src/                       الواجهة (React)
│   ├── app/                   التوجيه، الهيكل العام، حرّاس المسارات
│   ├── pages/                 صفحات الموقع
│   ├── features/
│   │   ├── tools/             سجل الأدوات + كل أداة في مجلدها
│   │   ├── document/          نموذج المستند، التقسيم لصفحات، القوالب السبعة
│   │   ├── editor/            المحرّر، منتقي القوالب، لوحة الألوان، المعاينة
│   │   └── export/            PNG / PDF / الطباعة
│   ├── lib/                   firebase, auth, api, session, colors, storage, analytics
│   └── styles/                tokens, base, layout, document, print, fonts
├── shared/types.ts            عقد الـ API المشترك بين الطرفين
├── migrations/                ملفات D1
├── tests/                     اختبارات الوحدات والتكامل (Vitest)
├── e2e/                       اختبارات Playwright
├── scripts/                   أدوات مساعدة (محاكي تيليجرام، توليد migration…)
├── public/                    الأيقونة الرسمية + favicons + manifest + خطوط
│   └── brand/                 الأصل الرسمي للأيقونة (مصدر كل المقاسات)
├── .github/workflows/         بوابات الجودة والنشر الآلي
└── wrangler.jsonc             إعداد Cloudflare
```

### لماذا الخطوط مستضافة محلياً؟

`IBM Plex Sans Arabic` و `Amiri` (رخصة SIL OFL) موجودة داخل `public/fonts/`
لثلاثة أسباب: ثبات مخرجات الطباعة والتصدير، عدم إرسال أي طلب لخوادم خارجية
(خصوصية)، وعمل المنصة حتى مع ضعف الاتصال.

---

## إضافة أداة جديدة

البنية Modular عن قصد — الأداة لا تعرف شيئاً عن القوالب ولا التصدير:

1. أنشئ مجلداً في `src/features/tools/<slug>/` فيه:
   - `compute.ts` — المنطق الخالص (قابل للاختبار وحده).
   - `Form.tsx` — نموذج الإدخال.
   - `index.tsx` — `defineTool({ ... })` مع `buildDocument` الذي يُنتج `DocumentModel`.
2. أضف سطراً واحداً في `src/features/tools/registry.ts`.
3. أضف migration جديدة تُدخل صفّاً في جدول `tools` (ليظهر في إحصاءات الإدارة).

القوالب السبعة تعمل مع الأداة الجديدة تلقائياً بلا أي تعديل.

---

## حل المشاكل الشائعة

| المشكلة | السبب والحل |
|---|---|
| `auth/unauthorized-domain` | نطاق الموقع غير مضاف في Firebase → Authentication → Settings → Authorized domains. |
| `auth/operation-not-allowed` | مزوّد Google غير مفعّل في Firebase → Authentication → Sign-in method. |
| «تعذّر فتح نافذة تسجيل الدخول» | المتصفّح يحظر النوافذ المنبثقة؛ النظام ينتقل تلقائياً إلى مسار Redirect، أو اسمح بالنوافذ المنبثقة. |
| تسجيل الدخول ينجح ثم 401 من الـ API | `FIREBASE_PROJECT_ID` في أسرار الـ Worker لا يطابق مشروع Firebase. افحص `/api/health`. |
| «خدمة تسجيل الدخول غير مُعدّة» | متغيّرات `VITE_FIREBASE_*` ناقصة وقت البناء. |
| البوت لا يردّ عند الضغط على Start | الـ Webhook غير مسجّل أو الرابط خاطئ. افحص `getWebhookInfo`. |
| الـ Webhook يُرجع 401 | `secret_token` في `setWebhook` لا يطابق `TELEGRAM_WEBHOOK_SECRET`. |
| «انتهت صلاحية رابط الربط» | التوكن صالح 10 دقائق ولمرة واحدة. اطلب رابطاً جديداً. |
| «لا يزال الاشتراك غير مؤكّد» رغم الاشتراك | تأكّد أن البوت **Admin** في القناة، وأن `TELEGRAM_CHANNEL_ID` صحيح، وأنك اشتركت بنفس حساب تيليجرام المربوط. |
| «حساب تيليجرام هذا مرتبط بحساب آخر» | حساب تيليجرام واحد لا يفتح أكثر من حساب موقع. استخدم الحساب الأصلي. |
| لا يظهر لي رابط لوحة الإدارة | الترقية تحدث لحظة ربط تيليجرام فقط. تأكّد أن `ADMIN_TELEGRAM_ID` يطابق معرّفك الرقمي، ثم أعد الربط. |
| التصدير يفشل أو الملف ناقص | انتظر اكتمال المعاينة. استخدم متصفّحاً حديثاً واسمح بالتنزيلات المتعدّدة (PNG يُنزّل ملفاً لكل صفحة). |
| الطباعة تُخرج صفحات بيضاء | استخدم زر **طباعة** داخل الأداة، واضبط الهوامش على `None` وفعّل **Background graphics** في نافذة الطباعة. |
| `no such table: user` | لم تُطبَّق الـ migrations. شغّل `npm run db:migrate:local` أو `:remote`. |
| خطأ D1 عند النشر | `database_id` في `wrangler.jsonc` ما زال `REPLACE_WITH_...`. |

---

## الترخيص والخصوصية

- كود المشروع مِلك صاحبه.
- الخطوط تحت رخصة SIL Open Font License 1.1.
- سياسة البيانات وتفاصيل الأمان في [`SECURITY.md`](./SECURITY.md).
