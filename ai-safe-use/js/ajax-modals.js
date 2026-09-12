/* ==========================================================================
   AI SAFE - تحميل محتوى النوافذ المنبثقة عبر Ajax (ajax-modals.js)
   الفكرة: عند الضغط على زر "اقرأ التفاصيل" يتم جلب ملف HTML خارجي
           من مجلد ajax باستخدام $.ajax ثم عرضه داخل Bootstrap Modal.
   ملاحظة: Ajax يحتاج تشغيل الموقع عبر خادم محلي (http://localhost)
           ولن يعمل عند فتح الملف مباشرة بصيغة file://
   ========================================================================== */

jQuery(function ($) {
  "use strict";

  // كل زر يحمل: data-ajax-url (مسار الملف) و data-bs-target (النافذة المطلوبة)
  $("[data-ajax-url]").on("click", function () {
    var fileUrl = $(this).data("ajax-url");
    var modalId = $(this).data("bs-target");              // مثال: #privacyModal
    var $body = $(modalId).find(".modal-body");

    // 1) إظهار مؤشر التحميل قبل بدء الطلب
    $body.html('<div class="modal-loading"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>جارٍ تحميل المحتوى...</p></div>');

    // 2) طلب Ajax لجلب الملف الخارجي
    $.ajax({
      url: fileUrl,
      type: "GET",
      dataType: "html",
      cache: false
    })
      .done(function (data) {
        // 3) عرض المحتوى القادم من الملف داخل النافذة
        $body.html(data);
      })
      .fail(function (jqXHR) {
        // 4) رسالة واضحة في حال فشل التحميل
        $body.html(
          '<div class="ajax-note">' +
          '<strong>تعذّر تحميل المحتوى (رمز الخطأ: ' + jqXHR.status + ').</strong><br>' +
          'تأكد من تشغيل الموقع عبر خادم محلي مثل: <code>python -m http.server 8000</code>' +
          '</div>'
        );
        if (window.toastr) {
          toastr.error("تعذّر تحميل المحتوى، تأكد من تشغيل الموقع عبر خادم محلي", "خطأ في Ajax");
        }
      });
  });

});
