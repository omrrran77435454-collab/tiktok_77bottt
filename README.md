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
| المصادقة | Better Auth 1.7 + Google OAuth |
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

# 2) إنشاء ملف المتغيّرات المحلية
cp .dev.vars.example .dev.vars
#    ثم افتح .dev.vars واملأ القيم (انظر قسم "المتغيّرات والأسرار")

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
npx wrangler d1 create teacher_tools_db
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
| `0001_better_auth.sql` | جداول Better Auth (`user`, `session`, `account`, `verification`) |
| `0002_app_tables.sql` | جداول التطبيق + الفهارس |
| `0003_seed_tools.sql` | بيانات الأدوات الأولية |

> ملف `0001` **مُولَّد من Better Auth نفسه** عبر `npm run auth:migration`.
> إذا غيّرت إعدادات Better Auth، أعد التوليد وأضف migration جديدة بدل تعديل القديمة.

---

## إعداد Google OAuth

1. افتح [Google Cloud Console](https://console.cloud.google.com/) وأنشئ مشروعاً (أو اختر موجوداً).
2. من القائمة: **APIs & Services → OAuth consent screen**
   - نوع المستخدم: **External**
   - املأ اسم التطبيق (`أدوات المعلم`) والبريد وروابط السياسة.
   - أضف النطاقات (scopes): `openid`, `email`, `profile` — لا تحتاج أكثر.
   - أثناء التطوير أضف حسابك في **Test users**.
3. من القائمة: **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - **Application type:** `Web application`
   - **Name:** `Teacher Tools Web`

4. **Authorized JavaScript origins** — أضف:

   | البيئة | القيمة |
   |---|---|
   | التطوير | `http://localhost:5173` |
   | الإنتاج | `https://<your-domain>` |

5. **Authorized redirect URIs** — أضف بالضبط:

   | البيئة | القيمة |
   |---|---|
   | التطوير | `http://localhost:5173/api/auth/callback/google` |
   | الإنتاج | `https://<your-domain>/api/auth/callback/google` |

   > هذا المسار ليس تخميناً: Better Auth مُعدّ في هذا المشروع على
   > `basePath: '/api/auth'` (انظر `worker/auth.ts`)، ومسار رجوع OAuth عنده هو
   > `/callback/:providerId`. فيكون الناتج `/api/auth/callback/google`.
   > استبدل `<your-domain>` بنطاقك الفعلي، مثل `teacher-tools.<حسابك>.workers.dev`.

6. انسخ **Client ID** و **Client Secret** إلى المتغيّرات:
   `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET`.

7. تأكّد أن `BETTER_AUTH_URL` يساوي أصل الموقع **بالضبط** بلا شرطة في النهاية
   (`http://localhost:5173` محلياً، `https://<your-domain>` إنتاجاً)، لأن Better Auth
   يبني رابط الرجوع منه.

---

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

| المتغيّر | الوصف |
|---|---|
| `GOOGLE_CLIENT_ID` | من Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | من Google Cloud Console — **سرّي** |
| `BETTER_AUTH_SECRET` | مفتاح توقيع الجلسات (`openssl rand -base64 32`) — **سرّي** |
| `BETTER_AUTH_URL` | أصل الموقع، مثل `https://teacher-tools.example.workers.dev` |
| `TELEGRAM_BOT_TOKEN` | توكن البوت — **سرّي** |
| `TELEGRAM_BOT_USERNAME` | اسم البوت بدون `@` |
| `TELEGRAM_CHANNEL_ID` | معرّف القناة (مثل `-1001234567890`) |
| `TELEGRAM_CHANNEL_JOIN_URL` | رابط الانضمام للقناة |
| `TELEGRAM_WEBHOOK_SECRET` | سرّ التحقق من الـ Webhook — **سرّي** |
| `ADMIN_TELEGRAM_ID` | المعرّف الرقمي لحساب تيليجرام الخاص بالمدير |
| `TELEGRAM_API_BASE` | اختياري — لتوجيه الطلبات لمحاكي أثناء الاختبار |
| `E2E_TEST_MODE` | اختياري — `true` يفعّل تسجيل دخول بالبريد لاختبارات E2E فقط |
| `E2E_TEST_SECRET` | اختياري — يجب أن يكون غير فارغ ليعمل وضع الاختبار |

- **محلياً:** ضعها في `.dev.vars` (الملف مُستثنى من Git).
- **إنتاجاً:** ضعها كـ Cloudflare Secrets:

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL
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
│   ├── auth.ts                إعداد Better Auth
│   ├── env.ts                 أنواع المتغيّرات وفحص اكتمالها
│   ├── lib/                   router, http, crypto, telegram, repo, gate
│   └── routes/                me, telegram, analytics, admin
├── src/                       الواجهة (React)
│   ├── app/                   التوجيه، الهيكل العام، حرّاس المسارات
│   ├── pages/                 صفحات الموقع
│   ├── features/
│   │   ├── tools/             سجل الأدوات + كل أداة في مجلدها
│   │   ├── document/          نموذج المستند، التقسيم لصفحات، القوالب السبعة
│   │   ├── editor/            المحرّر، منتقي القوالب، لوحة الألوان، المعاينة
│   │   └── export/            PNG / PDF / الطباعة
│   ├── lib/                   api, session, colors, storage, analytics, format
│   └── styles/                tokens, base, layout, document, print, fonts
├── shared/types.ts            عقد الـ API المشترك بين الطرفين
├── migrations/                ملفات D1
├── tests/                     اختبارات الوحدات والتكامل (Vitest)
├── e2e/                       اختبارات Playwright
├── scripts/                   أدوات مساعدة (محاكي تيليجرام، توليد migration…)
├── public/fonts/              خطوط عربية مستضافة محلياً (OFL)
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
| `redirect_uri_mismatch` عند تسجيل الدخول | رابط الرجوع في Google لا يطابق `BETTER_AUTH_URL`. تأكّد أنه `<الأصل>/api/auth/callback/google` بلا شرطة زائدة. |
| تسجيل الدخول يعيدك للصفحة الرئيسية | `BETTER_AUTH_SECRET` غير مضبوط، أو `BETTER_AUTH_URL` لا يساوي أصل الموقع فعلياً. افحص `/api/health`. |
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
