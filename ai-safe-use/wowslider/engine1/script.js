/* استدعاء شريط الصور المتحرك WOWSlider في الصفحة الرئيسية */
jQuery(function ($) {
  $("#wowslider-container1").wowSlider({
    effect: "fade",
    duration: 800,
    delay: 5500,
    autoPlay: true,
    stopOnHover: true,
    bullets: true,
    controls: true,
    caption: true
  });
});
