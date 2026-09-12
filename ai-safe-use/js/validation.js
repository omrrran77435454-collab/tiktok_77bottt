/* ==========================================================================
   AI SAFE - التحقق من صحة بيانات النماذج (validation.js)
   يعتمد على إضافة jQuery Validation Plugin
   جميع الرسائل بالعربية.
   مهم: هذا نموذج واجهة أمامية (Front-End) للعرض الدراسي فقط،
        لا يوجد خادم ولا قاعدة بيانات، ولا يتم حفظ كلمات المرور إطلاقاً.
   ========================================================================== */

jQuery(function ($) {
  "use strict";

  /* 1) قاعدة إضافية للتحقق من رقم الهاتف (أرقام فقط مع إمكانية + والمسافات) */
  $.validator.addMethod("phoneAr", function (value, element) {
    return this.optional(element) || /^[+]?[0-9\s-]{9,15}$/.test(value);
  }, "يرجى إدخال رقم هاتف صحيح مثل 778672726");

  /* 2) إعدادات عامة تُستخدم في جميع النماذج */
  var commonSettings = {
    errorClass: "error",
    validClass: "valid-field",
    errorElement: "label",
    onkeyup: false,
    errorPlacement: function (error, element) {
      error.insertAfter(element);
    }
  };

  /* ----------------------------------------------------------------------
     3) نموذج تسجيل الدخول
     ---------------------------------------------------------------------- */
  $("#loginForm").validate($.extend({}, commonSettings, {
    rules: {
      loginEmail: { required: true, email: true },
      loginPassword: { required: true, minlength: 8 }
    },
    messages: {
      loginEmail: {
        required: "يرجى إدخال البريد الإلكتروني",
        email: "يرجى إدخال بريد إلكتروني صحيح"
      },
      loginPassword: {
        required: "يرجى إدخال كلمة المرور",
        minlength: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل"
      }
    },
    submitHandler: function (form) {
      // لا يتم إرسال البيانات إلى أي خادم، ولا يتم تخزين كلمة المرور
      form.reset();
      $(form).find(".valid-field").removeClass("valid-field");
      toastr.success("تم التحقق من البيانات بنجاح", "تسجيل دخول تجريبي");
      return false;
    }
  }));

  /* ----------------------------------------------------------------------
     4) نموذج إنشاء حساب جديد
     ---------------------------------------------------------------------- */
  $("#registerForm").validate($.extend({}, commonSettings, {
    rules: {
      fullName: { required: true, minlength: 3 },
      regEmail: { required: true, email: true },
      regPhone: { required: true, phoneAr: true },
      regPassword: { required: true, minlength: 8 },
      regConfirmPassword: { required: true, equalTo: "#regPassword" }
    },
    messages: {
      fullName: {
        required: "يرجى إدخال الاسم",
        minlength: "الاسم يجب أن يحتوي على 3 أحرف على الأقل"
      },
      regEmail: {
        required: "يرجى إدخال البريد الإلكتروني",
        email: "يرجى إدخال بريد إلكتروني صحيح"
      },
      regPhone: { required: "يرجى إدخال رقم الهاتف" },
      regPassword: {
        required: "يرجى إدخال كلمة المرور",
        minlength: "كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل"
      },
      regConfirmPassword: {
        required: "يرجى تأكيد كلمة المرور",
        equalTo: "كلمتا المرور غير متطابقتين"
      }
    },
    submitHandler: function (form) {
      form.reset();
      $(form).find(".valid-field").removeClass("valid-field");
      toastr.success("تم إنشاء النموذج بنجاح", "نموذج تجريبي");
      return false;
    }
  }));

  /* ----------------------------------------------------------------------
     5) نموذج التواصل
     ---------------------------------------------------------------------- */
  $("#contactForm").validate($.extend({}, commonSettings, {
    rules: {
      contactName: { required: true, minlength: 3 },
      contactPhone: { required: true, phoneAr: true },
      contactSubject: { required: true },
      contactMessage: { required: true, minlength: 10 }
    },
    messages: {
      contactName: {
        required: "يرجى إدخال الاسم",
        minlength: "الاسم يجب أن يحتوي على 3 أحرف على الأقل"
      },
      contactPhone: { required: "يرجى إدخال رقم الهاتف" },
      contactSubject: { required: "يرجى اختيار موضوع الرسالة" },
      contactMessage: {
        required: "يرجى كتابة الرسالة",
        minlength: "الرسالة يجب أن تحتوي على 10 أحرف على الأقل"
      }
    },
    submitHandler: function (form) {
      form.reset();
      $(form).find(".valid-field").removeClass("valid-field");
      toastr.success("تم إرسال رسالتك بنجاح", "شكراً لتواصلك");
      return false;
    }
  }));

});
