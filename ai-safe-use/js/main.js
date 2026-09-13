/* =========================================================
   الاستخدام الآمن للذكاء الاصطناعي
   ملف الجافاسكربت الوحيد في المشروع (jQuery)
   ========================================================= */

$(document).ready(function () {

  /* ---------- 1) إعدادات إشعارات Toastr ---------- */
  toastr.options = {
    rtl: true,
    positionClass: "toast-top-left",
    timeOut: 4000,
    progressBar: true
  };

  /* ---------- 2) زر القائمة في الجوال ---------- */
  $(".menu-btn").on("click", function () {
    $(".nav").toggleClass("open");
  });

  /* ---------- 3) تشغيل شريط الصور المتحرك ---------- */
  $("#wowslider-container1").wowSlider();

  /* ---------- 4) النوافذ المنبثقة مع Ajax ----------
     عند تشغيل الموقع من خادم محلي (http) يتم تحميل الملف بـ Ajax.
     وعند فتح الموقع مباشرة من الجهاز (file) يمنع المتصفح Ajax،
     لذلك نعرض نسخة احتياطية مكتوبة هنا حتى تعمل النافذة في الحالتين.   */

  var offlineText = {
    privacy:
      "<h3>كيف تحمي بياناتك؟</h3>" +
      "<ul><li>لا تكتب كلمات المرور أو رموز التحقق.</li>" +
      "<li>لا ترفع صور الهوية أو الوثائق الرسمية.</li>" +
      "<li>لا تشارك بيانات أشخاص آخرين بدون إذنهم.</li>" +
      "<li>احذف المحادثات التي لم تعد تحتاجها.</li></ul>",
    verification:
      "<h3>كيف تتحقق من المعلومات؟</h3>" +
      "<ol><li>اسأل عن مصدر المعلومة.</li>" +
      "<li>افتح المصدر وتأكد أنه موجود فعلاً.</li>" +
      "<li>قارن المعلومة بكتاب دراسي أو موقع رسمي.</li>" +
      "<li>في المواضيع المهمة اسأل مختصاً.</li></ol>"
  };

  // إذا كانت الصفحة داخل مجلد html نحتاج الرجوع خطوة للخلف
  var folder = location.pathname.indexOf("/html/") > -1 ? "../" : "";

  $(".ajax-btn").on("click", function () {
    var name = $(this).data("file");                       // privacy أو verification
    var box = $($(this).data("bs-target")).find(".modal-body");

    box.html("<p>جارٍ التحميل...</p>");

    // الحالة الأولى: فتح الموقع مباشرة من الملفات
    if (location.protocol === "file:") {
      box.html(offlineText[name]);
      return;
    }

    // الحالة الثانية: تشغيل الموقع عبر خادم (Ajax الحقيقي)
    $.ajax({
      url: folder + "ajax/" + name + ".html",
      type: "GET",
      dataType: "html"
    })
      .done(function (data) {
        box.html(data);
      })
      .fail(function () {
        box.html(offlineText[name]);
      });
  });

  /* ---------- 5) تبويبات صفحة الحساب ---------- */
  $(".tab").on("click", function () {
    var target = $(this).data("target");                   // login أو register
    $(".tab").removeClass("active");
    $(this).addClass("active");
    $(".tab-box").hide();
    $("#" + target).show();
  });

  /* ---------- 6) التحقق من نموذج تسجيل الدخول ---------- */
  $("#loginForm").validate({
    rules: {
      loginEmail: { required: true, email: true },
      loginPassword: { required: true, minlength: 6 }
    },
    messages: {
      loginEmail: {
        required: "يرجى إدخال البريد الإلكتروني",
        email: "يرجى إدخال بريد إلكتروني صحيح"
      },
      loginPassword: {
        required: "يرجى إدخال كلمة المرور",
        minlength: "كلمة المرور يجب ألا تقل عن 6 أحرف"
      }
    },
    submitHandler: function (form) {
      form.reset();
      toastr.success("تم تسجيل الدخول بنجاح");
      return false;
    }
  });

  /* ---------- 7) التحقق من نموذج إنشاء الحساب ---------- */
  $("#registerForm").validate({
    rules: {
      regName: { required: true },
      regEmail: { required: true, email: true },
      regPassword: { required: true, minlength: 6 }
    },
    messages: {
      regName: { required: "يرجى إدخال الاسم" },
      regEmail: {
        required: "يرجى إدخال البريد الإلكتروني",
        email: "يرجى إدخال بريد إلكتروني صحيح"
      },
      regPassword: {
        required: "يرجى إدخال كلمة المرور",
        minlength: "كلمة المرور يجب ألا تقل عن 6 أحرف"
      }
    },
    submitHandler: function (form) {
      form.reset();
      toastr.success("تم إنشاء الحساب بنجاح");
      return false;
    }
  });

  /* ---------- 8) التحقق من نموذج التواصل ---------- */
  $("#contactForm").validate({
    rules: {
      contactName: { required: true },
      contactPhone: { required: true },
      contactMessage: { required: true, minlength: 10 }
    },
    messages: {
      contactName: { required: "يرجى إدخال الاسم" },
      contactPhone: { required: "يرجى إدخال رقم الهاتف" },
      contactMessage: {
        required: "يرجى كتابة الرسالة",
        minlength: "الرسالة يجب ألا تقل عن 10 أحرف"
      }
    },
    submitHandler: function (form) {
      form.reset();
      toastr.success("تم إرسال النموذج بنجاح");
      return false;
    }
  });

});
