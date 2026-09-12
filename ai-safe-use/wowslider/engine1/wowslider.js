/* ==========================================================================
   WOWSlider - محرك شريط الصور المتحرك (engine1/wowslider.js)
   إضافة jQuery تعمل على العنصر #wowslider-container1
   الاستدعاء: jQuery("#wowslider-container1").wowSlider({ ... });
   ========================================================================== */

(function ($) {
  "use strict";

  $.fn.wowSlider = function (userOptions) {
    // الإعدادات الافتراضية للشريط
    var options = $.extend({
      effect: "fade",     // نوع الانتقال بين الصور
      duration: 800,      // مدة الانتقال بالمللي ثانية
      delay: 5000,        // مدة بقاء الصورة قبل الانتقال
      autoPlay: true,     // التشغيل التلقائي
      stopOnHover: true,  // إيقاف مؤقت عند مرور الماوس
      bullets: true,      // إظهار النقاط
      controls: true,     // إظهار أزرار التالي والسابق
      caption: true       // إظهار النص فوق الصورة
    }, userOptions);

    return this.each(function () {
      var $slider = $(this);
      var $slides = $slider.find(".ws_images li");
      var count = $slides.length;
      if (count === 0) { return; }

      var current = 0;
      var timer = null;

      // 1) بناء بطاقة النص، والنقاط، وأزرار التنقل
      var $caption = $('<div class="ws_caption" aria-live="polite"></div>');
      if (options.caption) { $slider.append($caption); }

      var $bullets = $('<div class="ws_bullets" role="tablist" aria-label="شرائح العرض"></div>');
      if (options.bullets) {
        for (var i = 0; i < count; i++) {
          $('<button type="button" role="tab"></button>')
            .attr("aria-label", "الشريحة رقم " + (i + 1))
            .attr("data-index", i)
            .appendTo($bullets);
        }
        $slider.append($bullets);
      }

      if (options.controls) {
        $slider.append('<button type="button" class="ws_prev" aria-label="الشريحة السابقة"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></button>');
        $slider.append('<button type="button" class="ws_next" aria-label="الشريحة التالية"><i class="fa-solid fa-chevron-left" aria-hidden="true"></i></button>');
      }

      var $progress = $('<div class="ws_progress"></div>').appendTo($slider);

      // 2) عرض شريحة محددة
      function showSlide(index) {
        current = (index + count) % count;

        $slides.removeClass("ws_active").eq(current).addClass("ws_active");
        $bullets.find("button").removeClass("ws_selected").attr("aria-selected", "false")
          .eq(current).addClass("ws_selected").attr("aria-selected", "true");

        if (options.caption) {
          var $img = $slides.eq(current).find("img");
          // النص يأتي من خاصية title بالشكل: العنوان|الوصف
          var parts = ($img.attr("title") || "").split("|");
          var html = "";
          if (parts[0]) { html += "<h3>" + parts[0].trim() + "</h3>"; }
          if (parts[1]) { html += "<p>" + parts[1].trim() + "</p>"; }
          var link = $img.data("link");
          if (link) {
            html += '<a class="ws_caption_link" href="' + link + '">' +
                    ($img.data("link-text") || "اقرأ المزيد") +
                    ' <i class="fa-solid fa-arrow-left" aria-hidden="true"></i></a>';
          }
          $caption.html(html).removeClass("ws_caption_in");
          void $caption[0].offsetWidth;   // إعادة تشغيل الحركة
          $caption.addClass("ws_caption_in");
        }

        restartProgress();
      }

      // 3) شريط التقدم أسفل الشريحة
      function restartProgress() {
        $progress.stop(true, true).css("width", 0);
        if (options.autoPlay && timer !== null) {
          $progress.animate({ width: "100%" }, options.delay, "linear");
        }
      }

      function next() { showSlide(current + 1); }
      function prev() { showSlide(current - 1); }

      function play() {
        stop();
        if (!options.autoPlay) { return; }
        timer = setInterval(next, options.delay);
        restartProgress();
      }

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        $progress.stop(true).css("width", 0);
      }

      // 4) التفاعل مع المستخدم
      $slider.on("click", ".ws_next", function () { next(); play(); });
      $slider.on("click", ".ws_prev", function () { prev(); play(); });
      $slider.on("click", ".ws_bullets button", function () {
        showSlide(parseInt($(this).attr("data-index"), 10));
        play();
      });

      if (options.stopOnHover) {
        $slider.on("mouseenter focusin", stop).on("mouseleave focusout", play);
      }

      // التنقل بلوحة المفاتيح
      $slider.attr("tabindex", 0).on("keydown", function (e) {
        if (e.key === "ArrowLeft") { next(); play(); }
        if (e.key === "ArrowRight") { prev(); play(); }
      });

      // السحب بالإصبع على الجوال
      var startX = null;
      $slider.on("touchstart", function (e) { startX = e.originalEvent.touches[0].clientX; });
      $slider.on("touchend", function (e) {
        if (startX === null) { return; }
        var diff = e.originalEvent.changedTouches[0].clientX - startX;
        if (Math.abs(diff) > 45) { (diff < 0 ? prev : next)(); play(); }
        startX = null;
      });

      // إيقاف الشريط عند الانتقال إلى تبويب آخر (توفير الموارد)
      $(document).on("visibilitychange", function () {
        if (document.hidden) { stop(); } else { play(); }
      });

      // 5) بدء التشغيل
      $slider.addClass("ws_effect_" + options.effect);
      $slides.find("img").css("transition-duration", options.duration + "ms");
      showSlide(0);
      play();
    });
  };
})(jQuery);
