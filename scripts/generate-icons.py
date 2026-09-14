#!/usr/bin/env python3
"""
يولّد ملفات الأيقونة من الأصل الرسمي لمنصة "أدوات المعلم".

المصدر: public/brand/teacher-tools-icon.png  (المربّع الأصلي بعد قصّ الهامش الأبيض)
المخرجات: ملفات favicon / apple-touch-icon / PWA داخل public/

القواعد المطبَّقة هنا:
  • لا إعادة تصميم ولا تغيير ألوان ولا إضافة نصوص.
  • قصّ الهامش الأبيض الخارجي فقط مع إبقاء المربّع ذي الزوايا الدائرية كاملاً.
  • الناتج مربّع تماماً، وبلا أي تمديد يشوّه النسبة (LANCZOS فقط).
  • نسخ maskable تُصغَّر داخل منطقة آمنة حتى لا يقصّ نظام التشغيل عناصر مهمّة.

التشغيل (اختياري — الملفات الناتجة مرفوعة في المستودع):
    pip install Pillow && python3 scripts/generate-icons.py
"""
from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "public" / "brand" / "teacher-tools-icon.png"
PUBLIC = ROOT / "public"

# نسبة المحتوى داخل نسخة maskable: معيار الأيقونات القابلة للقصّ يضمن
# دائرة آمنة بقطر 80% من الحافة، فنُبقي الرسم داخل 78% مع حشو بلون الخلفية.
MASKABLE_CONTENT_RATIO = 0.78


def load_master() -> Image.Image:
    if not SOURCE.exists():
        raise SystemExit(f"الأصل غير موجود: {SOURCE}")
    return Image.open(SOURCE).convert("RGB")


def transparent_corners(master: Image.Image) -> Image.Image:
    """
    يجعل الزوايا الأربع خارج المربّع ذي الزوايا الدائرية شفّافة.

    ليس تغييراً في التصميم: المنطقة خارج الحوافّ الدائرية بيضاء في الأصل،
    وإبقاؤها بيضاء يُظهر مربّعاً أبيض حول الأيقونة في تبويب داكن أو على
    خلفية ملوّنة. نستخدم تعبئة انتشارية من الزوايا حتى لا نلمس أي بكسل
    من الرسم نفسه (الورقة العاجية داخل المربّع تبقى كما هي).
    """
    rgba = master.convert("RGBA")
    width, height = rgba.size
    pixels = rgba.load()

    def is_outer_white(x: int, y: int) -> bool:
        r, g, b, a = pixels[x, y]
        return a > 0 and r > 238 and g > 238 and b > 238

    queue = deque(
        point
        for point in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1))
        if is_outer_white(*point)
    )
    seen = set(queue)

    while queue:
        x, y = queue.popleft()
        pixels[x, y] = (0, 0, 0, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in seen:
                if is_outer_white(nx, ny):
                    seen.add((nx, ny))
                    queue.append((nx, ny))
    return rgba


def resize(master: Image.Image, size: int) -> Image.Image:
    return master.resize((size, size), Image.Resampling.LANCZOS)


def background_color(master: Image.Image) -> tuple[int, int, int]:
    """يأخذ لون الخلفية التركوازية من داخل المربّع نفسه (لا لون مخترع)."""
    width = master.size[0]
    return master.getpixel((width // 2, int(width * 0.06)))


def maskable(master: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGB", (size, size), background_color(master))
    inner = max(1, int(size * MASKABLE_CONTENT_RATIO))
    offset = (size - inner) // 2
    canvas.paste(master.resize((inner, inner), Image.Resampling.LANCZOS), (offset, offset))
    return canvas


def main() -> None:
    master = load_master()
    if master.size[0] != master.size[1]:
        raise SystemExit("الأصل ليس مربّعاً — أعد قصّ الهامش أولاً.")

    written: list[str] = []
    rounded = transparent_corners(master)

    # زوايا شفّافة: أفضل على الخلفيات الداكنة والملوّنة.
    for name, size in [
        ("favicon-16x16.png", 16),
        ("favicon-32x32.png", 32),
        ("favicon-48x48.png", 48),
        ("icon-192.png", 192),
        ("icon-512.png", 512),
    ]:
        resize(rounded, size).save(PUBLIC / name, "PNG", optimize=True)
        written.append(name)

    # apple-touch-icon يجب أن تبقى معتمة: iOS يطبّق قناعه الخاص،
    # والشفافية تظهر عنده سوداء.
    for name, size in [("apple-touch-icon.png", 180)]:
        resize(master, size).save(PUBLIC / name, "PNG", optimize=True)
        written.append(name)

    for name, size in [("maskable-icon-192.png", 192), ("maskable-icon-512.png", 512)]:
        maskable(master, size).save(PUBLIC / name, "PNG", optimize=True)
        written.append(name)

    # favicon.ico متعدّد المقاسات (16/32/48) ليعمل في كل المتصفّحات.
    resize(rounded, 48).save(
        PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    written.append("favicon.ico")

    for name in written:
        path = PUBLIC / name
        print(f"  ✓ {name:26} {path.stat().st_size:>7,} bytes")


if __name__ == "__main__":
    main()
