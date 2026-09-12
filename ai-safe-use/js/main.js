/* ==========================================================================
   AI SAFE - الملف الرئيسي للجافاسكربت (main.js)
   يعتمد على مكتبة jQuery
   يحتوي على: إعدادات Toastr، تفعيل رابط الصفحة الحالية، أزرار اختيار الموضوع،
              زر العودة للأعلى، وتبويبات صفحة الحساب.
   ========================================================================== */

jQuery(function ($) {
  "use strict";

  /* ----------------------------------------------------------------------
     1) إعدادات إشعارات Toastr بما يناسب الاتجاه من اليمين لليسار (RTL)
     ---------------------------------------------------------------------- */
  if (window.toastr) {
    toastr.options = {
      rtl: true,                        // دعم الاتجاه العربي
      positionClass: "toast-top-left",  // مكان ظهور الإشعار
      closeButton: true,
      progressBar: true,
      newestOnTop: true,
      preventDuplicates: true,
      timeOut: 4000,
      extendedTimeOut: 1500
    };
  }

  /* ----------------------------------------------------------------------
     2) تمييز رابط الصفحة الحالية في القائمة
     ---------------------------------------------------------------------- */
  var currentFile = window.location.pathname.split("/").pop() || "index.html";
  $(".main-nav .nav-item-link, .mobile-nav-link").each(function () {
    var linkFile = ($(this).attr("href") || "").split("/").pop().split("#")[0];
    if (linkFile === currentFile) {
      $(this).addClass("active");
    } else {
      $(this).removeClass("active");
    }
  });

  /* ----------------------------------------------------------------------
     3) أزرار اختيار الموضوع في الصفحة الرئيسية
        عند الضغط: يتم تمييز الزر وإظهار إشعار Toastr (الاستخدام الثالث للمكتبة)
     ---------------------------------------------------------------------- */
  $(".topic-chip").on("click", function () {
    var topic = $(this).data("topic");

    $(".topic-chip").removeClass("is-selected").attr("aria-pressed", "false");
    $(this).addClass("is-selected").attr("aria-pressed", "true");

    // حفظ الاختيار لهذه الجلسة فقط (لا يتم حفظ أي بيانات حساسة)
    try { sessionStorage.setItem("aiSafeTopic", topic); } catch (e) { /* المتصفح قد يمنع التخزين */ }

    if (window.toastr) {
      toastr.success("تم حفظ اختيارك: " + topic, "تم بنجاح");
    }
  });

  // استرجاع الاختيار السابق عند إعادة تحميل الصفحة
  try {
    var savedTopic = sessionStorage.getItem("aiSafeTopic");
    if (savedTopic) {
      $('.topic-chip[data-topic="' + savedTopic + '"]').addClass("is-selected").attr("aria-pressed", "true");
    }
  } catch (e) { /* تجاهل */ }

  /* ----------------------------------------------------------------------
     4) تبويبات صفحة الحساب (تسجيل الدخول / إنشاء حساب)
     ---------------------------------------------------------------------- */
  function activateAuthTab(target) {
    $(".auth-tab").removeClass("active").attr("aria-selected", "false");
    $('.auth-tab[data-target="' + target + '"]').addClass("active").attr("aria-selected", "true");
    $(".auth-panel").attr("hidden", true);
    $("#" + target).removeAttr("hidden");
  }

  $(".auth-tab").on("click", function () {
    activateAuthTab($(this).data("target"));
  });

  // فتح التبويب المطلوب مباشرة عند القدوم من رابط مثل account.html#register
  if ($(".auth-tab").length) {
    var hash = window.location.hash.replace("#", "");
    if (hash === "register" || hash === "login") {
      activateAuthTab(hash);
    }
  }

  /* ----------------------------------------------------------------------
     5) زر العودة إلى الأعلى
     ---------------------------------------------------------------------- */
  var $toTop = $("#backToTop");
  if ($toTop.length) {
    $(window).on("scroll", function () {
      if ($(window).scrollTop() > 400) { $toTop.addClass("is-visible"); }
      else { $toTop.removeClass("is-visible"); }
    });

    $toTop.on("click", function () {
      $("html, body").animate({ scrollTop: 0 }, 400);
    });
  }

  /* ----------------------------------------------------------------------
     6) إغلاق قائمة الجوال بعد الضغط على أي رابط داخلي في نفس الصفحة
     ---------------------------------------------------------------------- */
  $(".offcanvas .mobile-nav-link").on("click", function () {
    var offcanvasEl = document.getElementById("mobileMenu");
    if (offcanvasEl && window.bootstrap) {
      var instance = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (instance) { instance.hide(); }
    }
  });

});
