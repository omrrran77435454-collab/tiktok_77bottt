مجلد WOWSlider
==============

هذا المجلد يحتوي على شريط الصور المتحرك المستخدم في الصفحة الرئيسية (index.html).

الملفات:
- engine1/style.css     تنسيق الشريط (الصور، النقاط، الأسهم، بطاقة النص).
- engine1/wowslider.js  محرك الشريط: إضافة jQuery باسم wowSlider تعمل على #wowslider-container1.
- engine1/script.js     استدعاء الشريط وتحديد إعداداته (مدة العرض، النقاط، الأسهم...).

صور الشرائح موجودة في: images/slider/slide-1.svg و slide-2.svg و slide-3.svg

ملاحظة مهمة وصريحة حول مصدر ملفات المحرك
----------------------------------------
بيئة تنفيذ هذا المشروع لا تسمح بالوصول إلى موقع wowslider.com لتنزيل النسخة الرسمية
من برنامج WOW Slider، لذلك تمت كتابة ملفات المحرك في هذا المجلد محلياً بنفس
بنية WOWSlider الرسمية (نفس أسماء المجلدات والأصناف والـ API):

    jQuery("#wowslider-container1").wowSlider({ ... });
    <div id="wowslider-container1"> <div class="ws_images"><ul><li><img ...></li></ul></div> </div>
    .ws_images / .ws_active / .ws_bullets / .ws_caption / .ws_next / .ws_prev

إذا رغب الطالب في استخدام مخرجات برنامج WOW Slider الرسمي:
1. حمّل برنامج WOW Slider من الموقع الرسمي wowslider.com (النسخة المجانية).
2. أنشئ شريطاً جديداً وأضف الصور الثلاث من مجلد images/slider.
3. صدّر المشروع (Publish to Folder) ثم انسخ مجلد engine1 الناتج فوق هذا المجلد.
4. استبدل كتلة الشريط في index.html بالكتلة التي يولّدها البرنامج (index.html الناتج عنه).

لا توجد في هذا المجلد أي ملفات منسوخة من مصادر غير مصرح بها.
