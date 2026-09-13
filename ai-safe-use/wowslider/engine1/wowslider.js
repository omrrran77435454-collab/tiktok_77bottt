/* =========================================================
   WOWSlider - شريط الصور المتحرك (إضافة jQuery بسيطة)
   الاستخدام: jQuery("#wowslider-container1").wowSlider();
   ========================================================= */

(function ($) {

  $.fn.wowSlider = function () {

    var slider = this;
    var slides = slider.find(".ws_images li");
    var count = slides.length;
    var current = 0;
    var timer;

    if (count === 0) { return; }

    // إضافة نص الشريحة وأزرار التنقل والنقاط
    var caption = $('<p class="ws_caption"></p>').appendTo(slider);
    var images = slider.find(".ws_images");
    images.append('<button type="button" class="ws_prev" aria-label="السابق">&#10095;</button>');
    images.append('<button type="button" class="ws_next" aria-label="التالي">&#10094;</button>');

    var bullets = $('<div class="ws_bullets"></div>').appendTo(images);
    for (var i = 0; i < count; i++) {
      bullets.append('<button type="button" aria-label="شريحة ' + (i + 1) + '"></button>');
    }

    // عرض شريحة معينة
    function showSlide(index) {
      current = (index + count) % count;
      slides.removeClass("ws_active").eq(current).addClass("ws_active");
      bullets.find("button").removeClass("ws_selected").eq(current).addClass("ws_selected");
      caption.text(slides.eq(current).find("img").attr("title"));
    }

    // الانتقال التلقائي كل 5 ثوان
    function startTimer() {
      clearInterval(timer);
      timer = setInterval(function () { showSlide(current + 1); }, 5000);
    }

    slider.on("click", ".ws_next", function () { showSlide(current + 1); startTimer(); });
    slider.on("click", ".ws_prev", function () { showSlide(current - 1); startTimer(); });
    bullets.on("click", "button", function () { showSlide($(this).index()); startTimer(); });

    showSlide(0);
    startTimer();
  };

})(jQuery);
