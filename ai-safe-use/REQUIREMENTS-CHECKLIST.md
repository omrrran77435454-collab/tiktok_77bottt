# قائمة التحقق من متطلبات المقرر

مشروع: **الاستخدام الآمن للذكاء الاصطناعي (AI SAFE)** — مقرر تصميم الويب

الحالة مبنية على اختبار فعلي للموقع عبر خادم محلي ومتصفح Chromium (التفاصيل في `QA-REPORT.md`).

| # | المتطلب | مكان تطبيقه | اسم الملف | الحالة |
|---|---------|--------------|-----------|--------|
| 1 | إنشاء مجلد للمشروع يحتوي مجلدات منفصلة: html / css / js / images / videos | هيكل المشروع كامل | `ai-safe-use/html`, `css`, `js`, `images`, `videos` | PASS |
| 2 | تقسيم الصفحة باستخدام HTML Layout: header / nav / section / aside / footer | جميع الصفحات الست | `index.html` + `html/*.html` | PASS |
| 3 | استخدام عناصر HTML الأساسية: عناوين، فقرات، قوائم، جداول، وغيرها | عناوين h1-h3، فقرات، ul/ol، جدول، figure، نماذج | `html/privacy.html` (جدول)، `html/articles.html` (figure)، الكل | PASS |
| 4 | عدد الصفحات لا يقل عن 5، إحداها تواصل معنا بأيقونات Font Awesome | 6 صفحات + صفحة تواصل بأيقونات هاتف وواتساب ومستخدم ورسالة | `html/contact.html` | PASS |
| 5 | واجهات إنشاء حساب وتسجيل الدخول مع التحقق من صحة البيانات (Validation) | تبويبان + jQuery Validation برسائل عربية | `html/account.html` + `js/validation.js` | PASS |
| 6 | عرض صور باستخدام شريط صور متحرك WowSlider | 3 شرائح في الصفحة الرئيسية مع أزرار ونقاط وتشغيل تلقائي | `index.html` + `wowslider/engine1/*` | PASS (مع ملاحظة) |
| 7 | تنظيم محتوى الصفحة باستخدام Grid أو Flexbox (صفحة واحدة على الأقل) | مطبّق في الصفحات الست: `.hero-grid`, `.cards-grid`, `.tips-grid`, `.split-grid`, `.footer-grid` (Grid) و `.header-inner`, `.contact-band`, `.article-card` (Flexbox) | `css/style.css` | PASS |
| 8 | جعل الموقع Responsive باستخدام Media Queries | 4 نقاط توقف: 1200px / 992px / 768px / 576px لكامل الموقع | `css/responsive.css` | PASS |
| 9 | استخدام مكتبة Toastr Notification (إشعار واحد على الأقل) | 4 استخدامات: تسجيل دخول، إنشاء حساب، نموذج تواصل، اختيار موضوع | `js/main.js` + `js/validation.js` | PASS |
| 10 | تضمين Modal يتم استدعاؤه بواسطة Ajax (نافذتان على الأقل) | نافذتان تُحمَّلان عبر `$.ajax()` من ملفات خارجية | `js/ajax-modals.js` + `ajax/privacy-details.html` + `ajax/verification-details.html` | PASS |
| 11 | استخدام Bootstrap | Offcanvas، Modal، Accordion، Grid/Spacing utilities، نسخة RTL 5.3.3 | `vendor/bootstrap/*` + جميع الصفحات | PASS |
| 12 | استخدام jQuery | Ajax، الأحداث، التعامل مع DOM، محرك الشريط، Validation | `vendor/jquery/jquery.min.js` + `js/*.js` | PASS |
| 13 | رفع الموقع على GitHub | المشروع جاهز مع `.gitignore` وأوامر الرفع في README | `README.md` القسم 7 | تم الرفع على فرع المشروع (انظر ملاحظة أسفل الجدول) |
| 14 | شهادة كورس: Build a responsive website with HTML and CSS – Kevin Powell (Cursa) | إجراء خارجي يقوم به الطالب | — | PENDING STUDENT ACTION |

---

## ملاحظات على الجدول

**البند 6 (WOWSlider):**
بيئة تنفيذ المشروع لا تسمح بالوصول إلى `wowslider.com`، لذلك ملفات المحرك في `wowslider/engine1/`
مكتوبة محلياً بنفس بنية WOWSlider الرسمية وواجهة الاستدعاء نفسها
(`jQuery("#wowslider-container1").wowSlider({...})` مع أصناف `ws_images` و `ws_bullets` و `ws_caption`).
الشريط يعمل فعلياً وتم اختباره. خطوات استبداله بمخرجات البرنامج الرسمي موجودة في `wowslider/README.txt`.
لم تُستخدم مكتبة بديلة (لا Swiper ولا Bootstrap Carousel).

**البند 13 (GitHub):**
تم رفع المشروع على فرع التطوير الخاص بالمستودع. لإنشاء مستودع باسم الطالب،
الأوامر المطلوبة موجودة في `README.md` القسم 7.

**البند 14 (شهادة Cursa):**
متطلب خارجي يجب على الطالب إكماله بنفسه وإرفاق الشهادة مع المشروع.
لم تُنشأ أي شهادة أو ادعاء بوجودها.
