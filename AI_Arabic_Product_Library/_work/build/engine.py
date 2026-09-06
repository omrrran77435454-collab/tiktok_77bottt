#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Arabic AI Product Library — shared build engine.

One canonical source per product  ->  HTML -> PDF (WeasyPrint)
                                  ->  DOCX (python-docx, real RTL WordprocessingML)

The same block list feeds both writers, so Word and PDF can never drift apart.
"""

import os, re, html, json, datetime

HERE     = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.environ.get("APL_FONT_DIR",
    "/tmp/claude-0/-home-user-tiktok-77bottt/a4ed7ef0-1c0a-5c24-ae3e-2d311b4b6b46/scratchpad/fonts/ttf")

TG_URL   = "https://t.me/PromptsArabic"
OWNER    = "برومبتات عربية"

# ------------------------------------------------------------------ inline
AR_RANGE = "؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿"

# Combining Arabic marks (harakat + shadda). They are optional in modern Arabic
# prose, and as zero-width combining glyphs they share the x-position of their
# base letter in the PDF, which makes extractors order them arbitrarily and
# breaks copy and search for the word that carries them. Stripped at build time
# so no product can ship a word that cannot be found.
TASHKEEL = re.compile("[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")

def strip_tashkeel(t):
    return TASHKEEL.sub("", t)

def _esc(t):
    return html.escape(strip_tashkeel(t), quote=False)

def inline(t):
    """`code` -> inline code, **bold** -> strong. Everything else escaped."""
    out, i = [], 0
    pat = re.compile(r"`([^`]+)`|\*\*([^*]+)\*\*")
    for m in pat.finditer(t):
        out.append(_esc(t[i:m.start()]))
        if m.group(1) is not None:
            out.append('<code class="inline">%s</code>' % _esc(m.group(1)))
        else:
            out.append("<strong>%s</strong>" % _esc(m.group(2)))
        i = m.end()
    out.append(_esc(t[i:]))
    return rtl_tail("".join(out))

_VAR_THEN_PUNCT = re.compile(r"(\][ \t]*)[.:،؛;,]+[ \t]*$")
_VAR_AT_LINE_END = re.compile(r"^(.*\S)[ \t]+(\[[^\]\n]+\])[ \t]*$")

def rtl_tail(t):
    """Keep a variable and its brackets together when the text is copied.

    A source line that ENDS with `]` has that bracket relocated to the other end
    of the line by text extractors, which splits `[الموضوع]` apart on copy. Two
    deterministic rewrites remove the hazard without changing meaning:
      1. drop punctuation sitting right after a closing bracket at line end;
      2. move a trailing variable onto its own line, where it always copies
         intact — and which reads better inside a prompt template anyway.
    """
    out = []
    for line in t.split("\n"):
        line = _VAR_THEN_PUNCT.sub(r"\1", line)
        m = _VAR_AT_LINE_END.match(line)
        if m:
            out.append(m.group(1))
            out.append(m.group(2))
        else:
            out.append(line)
    return "\n".join(out)

ORDINALS = ["أولا", "ثانيا", "ثالثا", "رابعا", "خامسا", "سادسا", "سابعا",
            "ثامنا", "تاسعا", "عاشرا", "حادي عشر", "ثاني عشر"]
_NUM_MARKER = re.compile(r"^([ \t]*)(\d{1,2})[.)]\s+")
_DASH_MARKER = re.compile(r"^([ \t]*)[-*]\s+")

def prompt_text(t):
    """Normalise a copyable prompt so every line starts with an Arabic letter.

    A line that begins with a Western digit or an ASCII dash has that leading
    character relocated to the far end of the line when the PDF text is copied,
    and it also corrupts a neighbouring line that holds only a variable. Arabic
    ordinals and a bullet glyph read naturally and copy back exactly."""
    out = []
    for line in t.split("\n"):
        m = _NUM_MARKER.match(line)
        if m:
            i = int(m.group(2))
            if 1 <= i <= len(ORDINALS):
                line = "%s%s. %s" % (m.group(1), ORDINALS[i - 1], line[m.end():])
        else:
            line = _DASH_MARKER.sub(r"\1• ", line)
        out.append(line)
    return rtl_tail("\n".join(out))

def plain(t):
    """Strip inline markup and tashkeel — canonical text used for copy/search QA."""
    return strip_tashkeel(
        re.sub(r"`([^`]+)`", r"\1", re.sub(r"\*\*([^*]+)\*\*", r"\1", t)))

# ------------------------------------------------------------------ HTML
def validate(blocks, where=""):
    """Fail loudly on malformed content instead of rendering it letter by letter."""
    for b in blocks:
        k = b[0]
        if k in ("ul", "ol") and not isinstance(b[1], (list, tuple)):
            raise TypeError("%s: %r items must be a list, got %r" % (where, k, type(b[1])))
        if k == "callout":
            if not isinstance(b[3], (list, tuple)):
                raise TypeError("%s: callout paragraphs must be a list, got %r"
                                % (where, type(b[3])))
        if k == "steps" and any(not isinstance(x, (list, tuple)) or len(x) != 2 for x in b[1]):
            raise TypeError("%s: steps items must be (head, body) pairs" % where)
        if k == "table":
            n = len(b[1])
            for row in b[2]:
                if len(row) != n:
                    raise ValueError("%s: table row %r does not match %d headers"
                                     % (where, row, n))
        if k == "prompt":
            need = ("n", "title", "category", "when", "gives", "text", "example", "output")
            missing = [x for x in need if not b[1].get(x)]
            if missing:
                raise ValueError("%s: prompt %s missing %s"
                                 % (where, b[1].get("n"), missing))
    return blocks

def _blocks_html(blocks, ids=None):
    h = []
    validate(blocks, "html")
    for b in blocks:
        k = b[0]
        if k == "h2":
            _id = ids.pop(0) if ids else None
            h.append('<h2%s>%s</h2>' % (' id="%s"' % _id if _id else "", inline(b[1])))
        elif k == "h3":
            h.append("<h3>%s</h3>" % inline(b[1]))
        elif k == "p":
            h.append("<p>%s</p>" % inline(b[1]))
        elif k == "lead":
            h.append('<p class="lead">%s</p>' % inline(b[1]))
        elif k == "sectionlead":
            h.append('<div class="sectionlead"><p>%s</p></div>' % inline(b[1]))
        elif k == "ul":
            h.append('<ul class="b">%s</ul>' % "".join("<li>%s</li>" % inline(x) for x in b[1]))
        elif k == "ol":
            h.append('<ol class="n">%s</ol>' % "".join("<li>%s</li>" % inline(x) for x in b[1]))
        elif k == "steps":
            li = "".join('<li><span class="sh">%s</span>%s</li>' % (inline(a), inline(c))
                         for a, c in b[1])
            h.append('<ol class="steps">%s</ol>' % li)
        elif k == "code":
            cap = ('<div class="caption">%s</div>' % inline(b[1])) if b[1] else ""
            h.append('<div class="codewrap">%s<pre class="code">%s</pre></div>'
                     % (cap, _esc(b[2])))
        elif k == "promptbox":
            lbl = b[1] or "البرومبت الجاهز للنسخ"
            h.append('<div class="promptbox standalone"><div class="lbl">%s</div>'
                     '<div class="txt">%s</div></div>' % (_esc(lbl), prompt_text(_esc(b[2]))))
        elif k == "callout":
            kind, title, paras = b[1], b[2], b[3]
            body = "".join("<p>%s</p>" % inline(p) for p in paras)
            h.append('<div class="callout %s"><div class="t">%s</div>%s</div>'
                     % (kind, inline(title), body))
        elif k == "table":
            th = "".join("<th>%s</th>" % inline(x) for x in b[1])
            tr = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in row)
                         for row in b[2])
            h.append('<table class="data"><thead><tr>%s</tr></thead><tbody>%s</tbody></table>'
                     % (th, tr))
        elif k == "kv":
            tr = "".join("<tr><td>%s</td><td>%s</td></tr>" % (inline(a), inline(c))
                         for a, c in b[1])
            h.append('<table class="kv">%s</table>' % tr)
        elif k == "divider":
            h.append('<hr class="divider">')
        elif k == "prompt":
            h.append(_prompt_html(b[1]))
        else:
            raise ValueError("unknown block %r" % k)
    return "\n".join(h)

def _prompt_html(p):
    rows = []
    rows.append('<div class="row"><div class="k">متى تستخدمه</div>'
                '<div class="v">%s</div></div>' % inline(p["when"]))
    rows.append('<div class="row"><div class="k">ماذا ستحصل عليه</div>'
                '<div class="v">%s</div></div>' % inline(p["gives"]))
    if p.get("inputs"):
        li = "".join("<li>%s</li>" % inline(x) for x in p["inputs"])
        rows.append('<div class="row"><div class="k">جهّز هذه المعلومات</div>'
                    '<div class="v"><ul class="b">%s</ul></div></div>' % li)
    box = ('<div class="promptbox"><div class="lbl">البرومبت الجاهز للنسخ</div>'
           '<div class="txt">%s</div></div>' % prompt_text(_esc(p["text"])))
    rows.append(box)
    rows.append('<div class="row"><div class="k">مثال استخدام</div>'
                '<div class="v">%s</div></div>' % inline(p["example"]))
    rows.append('<div class="row"><div class="k">النتيجة المتوقعة</div>'
                '<div class="v">%s</div></div>' % inline(p["output"]))
    if p.get("tip"):
        rows.append('<div class="row"><div class="k">ملاحظة تحسين</div>'
                    '<div class="v">%s</div></div>' % inline(p["tip"]))
    return ('<div class="pcard"><div class="head">'
            '<span class="pn">%02d</span><span class="pt">%s</span>'
            '<span class="cat">%s</span></div>'
            '<div class="body">%s</div></div>'
            % (p["n"], inline(p["title"]), inline(p["category"]), "".join(rows)))

def _cover_html(d):
    lines = "".join('<i style="right:%dmm"></i>' % x for x in (30, 66, 102, 138, 174))
    promise = "".join("<span>%s</span>" % _esc(x) for x in d["promise"])
    strip = "".join('<div class="row"><b>%02d</b>%s</div>' % (i, _esc(x))
                    for i, x in enumerate(d.get("cover_index", []), 1))
    return f"""<section class="cover">
  <div class="field"></div>
  <div class="glow"></div>
  <div class="grid-lines">{lines}</div>
  <div class="arc" style="width:196mm;height:196mm;right:-56mm;top:-64mm"></div>
  <div class="arc" style="width:128mm;height:128mm;left:-46mm;bottom:-40mm"></div>
  <div class="topbar">
    <span class="mark">PROMPTS ARABIC</span>
    <span class="kicker">{_esc(d['kicker'])}</span>
  </div>
  <div class="plate">
    <h1>{_esc(d['title'])}</h1>
    <div class="rule"></div>
    <p class="sub">{_esc(d['subtitle'])}</p>
  </div>
  <div class="strip">{strip}</div>
  <div class="promise">{promise}</div>
  <div class="baseline"></div>
  <div class="platform">{_esc(d['platform'])}</div>
  <div class="rights"><b>{OWNER}</b><span>t.me/PromptsArabic</span></div>
</section>"""

def _front_html(d):
    def ul(items):
        return '<ul class="b">%s</ul>' % "".join("<li>%s</li>" % inline(x) for x in items)
    rights = f"""<section class="frontpage">
  <div class="fm-title">حقوق النشر</div><div class="fm-rule"></div>
  <div class="rights-block">
    <p class="owner">{OWNER}</p>
    <p>جميع الحقوق محفوظة لقناة <strong>برومبتات عربية</strong>.</p>
    <p>هذا المنتج مخصص للاستخدام الشخصي للمشتري. لا يجوز إعادة نشره أو بيعه
       أو توزيعه أو اقتباس أجزاء منه لأغراض تجارية دون إذن كتابي من المالك.</p>
    <p>القناة الرسمية: <a class="tg" href="{TG_URL}">{TG_URL}</a></p>
  </div>
  <table class="meta-table">
    <tr><td>اسم المنتج</td><td>{_esc(d['title'])}</td></tr>
    <tr><td>الإصدار</td><td>{_esc(d.get('edition','الإصدار الأول'))}</td></tr>
    <tr><td>اللغة</td><td>العربية</td></tr>
    <tr><td>المقاس</td><td>A4 عمودي — مهيأ للقراءة على الهاتف</td></tr>
    <tr><td>تمت مراجعة معلومات وميزات هذا الدليل حتى تاريخ</td><td>{_esc(d['verified_at'])}</td></tr>
    <tr><td>مصادر التحقق</td><td>{_esc(d['sources_line'])}</td></tr>
  </table>
  <div class="callout"><div class="t">ملاحظة مهمة عن تاريخ المحتوى</div>
    <p>منصات الذكاء الاصطناعي تتغير بسرعة. كل ميزة مذكورة هنا تم التحقق منها من
       المصدر الرسمي بتاريخ {_esc(d['verified_at'])}. إذا مر وقت طويل على هذا التاريخ،
       راجع الصفحة الرسمية للميزة قبل الاعتماد عليها في عمل حساس.</p>
  </div>
</section>"""
    about = f"""<section class="frontpage">
  <div class="fm-title">عن هذا الدليل</div><div class="fm-rule"></div>
  <p class="lead">{inline(d['about'])}</p>
  <h3>لمن هذا الدليل</h3>{ul(d['audience'])}
  <h3>ماذا ستتعلم</h3>{ul(d['learn'])}
</section>
<section class="frontpage">
  <div class="fm-title">قبل أن تبدأ</div><div class="fm-rule"></div>
  <h3>المتطلبات</h3>{ul(d['requirements'])}
  <h3>كيف تستخدم هذا الدليل</h3>{ul(d['howto'])}
  <div class="callout tip"><div class="t">طريقة القراءة الموصى بها</div>
    <p>لا تقرأ الدليل كله دفعة واحدة. اقرأ فصلا واحدا، ثم نفّذ تمرينه على مهمة حقيقية
       من عملك، ثم انتقل. أربعة فصول مطبَّقة أفضل من أربعة عشر فصلا مقروءا.</p></div>
</section>"""
    return rights + about

def _toc_html(d, anchors):
    li = []
    for ch, subs in anchors:
        li.append('<li class="l1"><a href="#%s"><span class="t">%s</span>'
                  '<span class="dots"></span></a></li>' % (ch[0], _esc(ch[1])))
        for s in subs:
            li.append('<li class="l2"><a href="#%s"><span class="t">%s</span>'
                      '<span class="dots"></span></a></li>' % (s[0], _esc(s[1])))
    return ('<section class="toc"><div class="fm-title">الفهرس</div>'
            '<div class="fm-rule"></div><ul>%s</ul></section>' % "".join(li))

def _end_html(d):
    e = d["end"]
    body = _blocks_html(list(e["blocks"]))
    return f"""<section class="endpage">
  <h1 class="chapter"><span class="num">THE END</span>{_esc(e['title'])}</h1>
  {body}
  <div class="endcard">
    <div class="h">{OWNER}</div>
    <p>هذا المنتج من إنتاج قناة برومبتات عربية.<br>لمتابعة الأدلة والبرومبتات الجديدة:</p>
    <p><a href="{TG_URL}">{TG_URL}</a></p>
  </div>
</section>"""

def build_html(d):
    css = open(os.path.join(HERE, "theme.css"), encoding="utf-8").read()
    css = (css.replace("FONTDIR", "file://" + FONT_DIR)
              .replace("ACCENTD", d["accent"][1])
              .replace("ACCENTW", d["accent"][2])
              .replace("ACCENT",  d["accent"][0]))

    anchors, body = [], []
    for ci, ch in enumerate(d["chapters"], 1):
        cid = "ch%d" % ci
        subs, sids = [], []
        for bi, b in enumerate(ch["blocks"]):
            if b[0] == "h2":
                sid = "%s-s%d" % (cid, bi)
                sids.append(sid); subs.append((sid, plain(b[1])))
        anchors.append(((cid, plain(ch["title"])), subs))
        prompts = [b[1] for b in ch["blocks"] if b[0] == "prompt"]
        idx = ""
        if len(prompts) > 1:
            idx = ('<div class="chindex">%s</div>' %
                   "".join('<div class="row"><b>%02d</b><span>%s</span></div>'
                           % (p["n"], _esc(p["title"])) for p in prompts))
        body.append('<h1 class="chapter" id="%s"><span class="num">%s</span>%s</h1>%s%s'
                    % (cid, _esc(ch["num"]), _esc(ch["title"]),
                       _blocks_html(list(ch["blocks"][:1]), None) if ch["blocks"][0][0] == "sectionlead" else "",
                       idx + _blocks_html(list(ch["blocks"][1:] if ch["blocks"][0][0] == "sectionlead" else ch["blocks"]), list(sids))))

    parts = [_cover_html(d), _front_html(d), _toc_html(d, anchors),
             "\n".join(body), _end_html(d)]
    return ("<!doctype html><html dir=\"rtl\" lang=\"ar\"><head><meta charset=\"utf-8\">"
            "<title>%s</title><style>%s</style></head><body>%s</body></html>"
            % (_esc(d["title"]), css, "\n".join(parts)))

def build_pdf(d, out_path):
    import weasyprint, fix_tounicode
    h = build_html(d)
    tmp = out_path + ".html"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(h)
    weasyprint.HTML(filename=tmp).write_pdf(out_path)
    # Repair ligature ToUnicode ordering so Arabic copy/search is exact.
    n = fix_tounicode.fix(out_path, out_path + ".tmp")
    os.replace(out_path + ".tmp", out_path)
    return out_path

# ------------------------------------------------------------------ DOCX
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.section import WD_SECTION
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

AR_CLS  = re.compile("[%s]" % AR_RANGE)
LAT_CLS = re.compile(r"[A-Za-z0-9@#/\\_.+\-]")

def split_runs(text):
    """Split a mixed Arabic/Latin string into (text, is_rtl) runs.
    Neutral characters attach to the run in progress, so an English term
    inside an Arabic sentence becomes its own LTR run and cannot flip the line."""
    if not text:
        return []
    out, buf, cur = [], [], None
    for ch in text:
        if AR_CLS.match(ch):
            t = True
        elif LAT_CLS.match(ch):
            t = False
        else:
            t = None                       # neutral
        if t is None or cur is None or t == cur:
            buf.append(ch)
            if cur is None and t is not None:
                cur = t
        else:
            out.append(("".join(buf), cur)); buf = [ch]; cur = t
    if buf:
        out.append(("".join(buf), cur if cur is not None else True))
    return out

PPR_ORDER = ["pStyle","keepNext","keepLines","pageBreakBefore","framePr","widowControl",
  "numPr","suppressLineNumbers","pBdr","shd","tabs","suppressAutoHyphens","kinsoku",
  "wordWrap","overflowPunct","topLinePunct","autoSpaceDE","autoSpaceDN","bidi",
  "adjustRightInd","snapToGrid","spacing","ind","contextualSpacing","mirrorIndents",
  "suppressOverlap","jc","textDirection","textAlignment","textboxTightWrap","outlineLvl",
  "divId","cnfStyle","rPr","sectPr","pPrChange"]

RPR_ORDER = ["rStyle","rFonts","b","bCs","i","iCs","caps","smallCaps","strike","dstrike",
  "outline","shadow","emboss","imprint","noProof","snapToGrid","vanish","webHidden","color",
  "spacing","w","kern","position","sz","szCs","highlight","u","effect","bdr","shd","fitText",
  "vertAlign","rtl","cs","em","lang","eastAsianLayout","specVanish","oMath"]

TBLPR_ORDER = ["tblStyle","tblpPr","tblOverlap","bidiVisual","tblStyleRowBandSize",
  "tblStyleColBandSize","tblW","jc","tblCellSpacing","tblInd","tblBorders","shd","tblLayout",
  "tblCellMar","tblLook","tblCaption","tblDescription","tblPrChange"]

TCPR_ORDER = ["cnfStyle","tcW","gridSpan","hMerge","vMerge","tcBorders","shd","noWrap",
  "tcMar","textDirection","tcFitText","vAlign","hideMark","headers","cellIns","cellDel",
  "cellMerge","tcPrChange"]

def _put(parent, tag, order, attrs=None, replace=True):
    """Insert <w:tag> into `parent` at its schema-correct position."""
    full = qn("w:" + tag)
    el = parent.find(full)
    if el is not None:
        if not replace:
            return el
        parent.remove(el)
    el = OxmlElement("w:" + tag)
    for k, v in (attrs or {}).items():
        el.set(qn(k), v)
    idx = order.index(tag)
    anchor = None
    for child in parent:
        name = child.tag.split("}")[-1]
        if name in order and order.index(name) > idx:
            anchor = child
            break
    if anchor is None:
        parent.append(el)
    else:
        anchor.addprevious(el)
    return el

def _pr(p):
    return p._p.get_or_add_pPr()

def set_rtl_par(p, rtl=True):
    _put(_pr(p), "bidi", PPR_ORDER, {"w:val": "1" if rtl else "0"})

def keep_with_next(p, on=True):
    _put(_pr(p), "keepNext", PPR_ORDER, {"w:val": "1" if on else "0"})

def keep_lines(p):
    _put(_pr(p), "keepLines", PPR_ORDER, {"w:val": "1"})

def widow_control(p):
    _put(_pr(p), "widowControl", PPR_ORDER, {"w:val": "1"})

def shade(el_pr, fill, order=None):
    _put(el_pr, "shd", order or PPR_ORDER,
         {"w:val": "clear", "w:color": "auto", "w:fill": fill})

def border(pPr, side, sz, color):
    pbdr = _put(pPr, "pBdr", PPR_ORDER, replace=False)
    b = pbdr.find(qn("w:" + side))
    if b is not None:
        pbdr.remove(b)
    b = OxmlElement("w:%s" % side)
    b.set(qn("w:val"), "single"); b.set(qn("w:sz"), str(sz))
    b.set(qn("w:space"), "6"); b.set(qn("w:color"), color)
    sides = ["top", "left", "bottom", "right", "between", "bar"]
    idx = sides.index(side)
    anchor = None
    for child in pbdr:
        nm = child.tag.split("}")[-1]
        if nm in sides and sides.index(nm) > idx:
            anchor = child; break
    if anchor is None:
        pbdr.append(b)
    else:
        anchor.addprevious(b)

def add_text(p, text, *, bold=False, size=None, color=None, mono=False, rtl_par=True):
    for seg, is_rtl in split_runs(strip_tashkeel(text)):
        r = p.add_run(seg)
        r.bold = bold
        if size: r.font.size = Pt(size)
        if color: r.font.color.rgb = RGBColor.from_string(color)
        r.font.name = "JetBrains Mono" if mono else "IBM Plex Sans Arabic"
        rPr = r._r.get_or_add_rPr()
        nm = "JetBrains Mono" if mono else "IBM Plex Sans Arabic"
        _put(rPr, "rFonts", RPR_ORDER,
             {"w:ascii": nm, "w:hAnsi": nm, "w:cs": nm, "w:eastAsia": nm})
        if size:
            _put(rPr, "szCs", RPR_ORDER, {"w:val": str(int(round(size * 2)))})
        if bold:
            _put(rPr, "bCs", RPR_ORDER, {"w:val": "1"})
        if is_rtl and not mono:
            _put(rPr, "rtl", RPR_ORDER, {"w:val": "1"})
            _put(rPr, "cs", RPR_ORDER, {"w:val": "1"})
        else:
            _put(rPr, "rtl", RPR_ORDER, {"w:val": "0"})
    return p

def _style(doc, name, *, size, bold=False, color="17140F", space_before=0,
           space_after=6, line=1.5, base="Normal"):
    st = doc.styles.add_style(name, 1)          # 1 = paragraph style
    st.base_style = doc.styles[base]
    f = st.font
    f.name = "IBM Plex Sans Arabic"; f.size = Pt(size); f.bold = bold
    f.color.rgb = RGBColor.from_string(color)
    pf = st.paragraph_format
    pf.space_before = Pt(space_before); pf.space_after = Pt(space_after)
    pf.line_spacing = line
    pf.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pf.widow_control = True
    rpr = st.element.get_or_add_rPr()
    _put(rpr, "rFonts", RPR_ORDER, {"w:ascii": "IBM Plex Sans Arabic",
        "w:hAnsi": "IBM Plex Sans Arabic", "w:cs": "IBM Plex Sans Arabic",
        "w:eastAsia": "IBM Plex Sans Arabic"})
    _put(rpr, "szCs", RPR_ORDER, {"w:val": str(int(round(size * 2)))})
    ppr = st.element.get_or_add_pPr()
    _put(ppr, "bidi", PPR_ORDER, {"w:val": "1"})
    return st

def _make_styles(doc, accent):
    n = doc.styles["Normal"]
    n.font.name = "IBM Plex Sans Arabic"; n.font.size = Pt(11)
    n.paragraph_format.line_spacing = 1.6
    n.paragraph_format.space_after = Pt(6)
    n.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    rpr = n.element.get_or_add_rPr()
    _put(rpr, "rFonts", RPR_ORDER, {"w:ascii": "IBM Plex Sans Arabic",
        "w:hAnsi": "IBM Plex Sans Arabic", "w:cs": "IBM Plex Sans Arabic",
        "w:eastAsia": "IBM Plex Sans Arabic"})

    ac = accent.lstrip("#").upper()
    _style(doc, "APL Title",     size=30, bold=True, space_after=8,  line=1.25)
    _style(doc, "APL Subtitle",  size=13, color="3A342C", space_after=14, line=1.6)
    _style(doc, "APL H1",        size=20, bold=True, space_before=6, space_after=10, line=1.35)
    _style(doc, "APL H2",        size=14, bold=True, space_before=14, space_after=6, line=1.4)
    _style(doc, "APL H3",        size=12, bold=True, color="3A342C", space_before=10, space_after=4, line=1.45)
    _style(doc, "APL Body",      size=11, space_after=7, line=1.65)
    _style(doc, "APL Lead",      size=12, color="3A342C", space_after=9, line=1.7)
    _style(doc, "APL Bullet",    size=11, space_after=3, line=1.55)
    _style(doc, "APL Prompt",    size=10.5, space_after=3, line=1.7)
    _style(doc, "APL PromptLbl", size=9, bold=True, color=ac, space_after=3, line=1.3)
    _style(doc, "APL Callout",   size=10.5, space_after=4, line=1.6)
    _style(doc, "APL Caption",   size=8.5, color="6E665A", space_after=3, line=1.35)
    _style(doc, "APL Code",      size=9, space_after=2, line=1.35)
    c = doc.styles["APL Code"]
    c.font.name = "JetBrains Mono"
    cr = c.element.get_or_add_rPr()
    _put(cr, "rFonts", RPR_ORDER, {"w:ascii": "JetBrains Mono",
        "w:hAnsi": "JetBrains Mono", "w:cs": "JetBrains Mono",
        "w:eastAsia": "JetBrains Mono"})
    cp = c.element.get_or_add_pPr()
    _put(cp, "bidi", PPR_ORDER, {"w:val": "0"})
    c.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT

SECTPR_ORDER = ["footnotePr","endnotePr","type","pgSz","pgMar","paperSrc","pgBorders",
  "lnNumType","pgNumType","cols","formProt","vAlign","noEndnote","titlePg","textDirection",
  "bidi","rtlGutter","docGrid","printerSettings","sectPrChange"]

def _sec_rtl(section):
    _put(section._sectPr, "bidi", SECTPR_ORDER, {"w:val": "1"})

def _field(p, instr):
    r = p.add_run()
    fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "begin"); r._r.append(fc)
    r = p.add_run()
    it = OxmlElement("w:instrText"); it.set(qn("xml:space"), "preserve"); it.text = instr
    r._r.append(it)
    r = p.add_run()
    fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "separate"); r._r.append(fc)
    r = p.add_run("1")
    r = p.add_run()
    fc = OxmlElement("w:fldChar"); fc.set(qn("w:fldCharType"), "end"); r._r.append(fc)

def _footer(doc, section):
    f = section.footer
    p = f.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_rtl_par(p)
    add_text(p, "برومبتات عربية · ", size=8, color="9A9184")
    r = p.add_run("t.me/PromptsArabic")
    r.font.size = Pt(8); r.font.name = "JetBrains Mono"
    r.font.color.rgb = RGBColor.from_string("9A9184")
    rPr = r._r.get_or_add_rPr()
    el = OxmlElement("w:rtl"); el.set(qn("w:val"), "0"); rPr.append(el)
    p2 = f.add_paragraph(); p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    set_rtl_par(p2)
    r = p2.add_run(); r.font.size = Pt(8.5)
    _field(p2, " PAGE ")

def _p(doc, style, text=None, **kw):
    p = doc.add_paragraph(style=style)
    set_rtl_par(p, kw.pop("rtl", True))
    widow_control(p)
    if text:
        add_text(p, text, **kw)
    return p

def _docx_blocks(doc, blocks, accent):
    validate(blocks, "docx")
    ac = accent.lstrip("#").upper()
    for b in blocks:
        k = b[0]
        if k == "h2":
            p = _p(doc, "APL H2", plain(b[1])); keep_with_next(p); keep_lines(p)
        elif k == "h3":
            p = _p(doc, "APL H3", plain(b[1])); keep_with_next(p); keep_lines(p)
        elif k == "p":
            _p(doc, "APL Body", plain(b[1]))
        elif k == "lead":
            _p(doc, "APL Lead", plain(b[1]))
        elif k == "sectionlead":
            p = _p(doc, "APL Lead", plain(b[1]))
            pPr = _pr(p); shade(pPr, "FBF8F3"); border(pPr, "right", 18, ac)
            p.paragraph_format.space_before = Pt(6); p.paragraph_format.space_after = Pt(10)
        elif k == "ul":
            for x in b[1]:
                p = _p(doc, "APL Bullet", "•  " + plain(x))
                p.paragraph_format.right_indent = Mm(0)
                p.paragraph_format.left_indent = Mm(4)
        elif k == "ol":
            for i, x in enumerate(b[1], 1):
                _p(doc, "APL Bullet", "%d.  %s" % (i, plain(x)))
        elif k == "steps":
            for i, (a, c) in enumerate(b[1], 1):
                p = _p(doc, "APL Bullet"); keep_lines(p)
                add_text(p, "%d.  " % i, bold=True, color=ac)
                add_text(p, plain(a), bold=True)
                if c:
                    add_text(p, " — " + plain(c))
        elif k == "code":
            if b[1]:
                p = _p(doc, "APL Caption", plain(b[1])); keep_with_next(p)
            first = True
            for line in b[2].split("\n"):
                p = doc.add_paragraph(style="APL Code")
                set_rtl_par(p, False)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                keep_lines(p)
                pPr = _pr(p); shade(pPr, "F3F0EA")
                add_text(p, line if line else " ", mono=True, size=9)
                first = False
        elif k == "promptbox":
            q = _p(doc, "APL PromptLbl", b[1] or "البرومبت الجاهز للنسخ"); keep_with_next(q)
            for line in prompt_text(plain(b[2])).split("\n"):
                p = _p(doc, "APL Prompt", line if line.strip() else " ")
                keep_lines(p)
                shade(_pr(p), "FBF8F3")
                p.paragraph_format.space_after = Pt(0)
            doc.add_paragraph(style="APL Body")
        elif k == "callout":
            kind, title, paras = b[1], b[2], b[3]
            col = {"warn": "B4472F", "tip": "2F7D62"}.get(kind, ac)
            fill = {"warn": "FDF4F1", "tip": "F1F8F4"}.get(kind, "FBF8F3")
            p = _p(doc, "APL Callout"); keep_with_next(p); keep_lines(p)
            add_text(p, plain(title), bold=True, color=col)
            pPr = _pr(p); shade(pPr, fill); border(pPr, "right", 18, col)
            for i, t in enumerate(paras):
                p = _p(doc, "APL Callout", plain(t)); keep_lines(p)
                pPr = _pr(p); shade(pPr, fill); border(pPr, "right", 18, col)
        elif k == "table":
            _docx_table(doc, b[1], b[2], ac)
        elif k == "kv":
            _docx_table(doc, None, [[a, c] for a, c in b[1]], ac)
        elif k == "divider":
            p = _p(doc, "APL Body")
            border(_pr(p), "bottom", 6, "E6E0D6")
        elif k == "prompt":
            _docx_prompt(doc, b[1], ac)

def _docx_table(doc, head, rows, ac):
    ncol = len(head) if head else len(rows[0])
    t = doc.add_table(rows=0, cols=ncol)
    t.style = "Table Grid"
    _put(t._tbl.tblPr, "bidiVisual", TBLPR_ORDER, {"w:val": "1"})
    if head:
        cells = t.add_row().cells
        for i, x in enumerate(head):
            cells[i].text = ""
            p = cells[i].paragraphs[0]; p.style = doc.styles["APL Body"]
            set_rtl_par(p); add_text(p, plain(x), bold=True, size=9.5)
            shade(cells[i]._tc.get_or_add_tcPr(), "F5F0E7", TCPR_ORDER)
    for row in rows:
        cells = t.add_row().cells
        for i, x in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]; p.style = doc.styles["APL Body"]
            set_rtl_par(p); add_text(p, plain(x), size=9.5)
    doc.add_paragraph(style="APL Body")

def _docx_prompt(doc, pr, ac):
    p = _p(doc, "APL H3"); keep_with_next(p); keep_lines(p)
    add_text(p, "برومبت %02d — " % pr["n"], bold=True, color=ac)
    add_text(p, plain(pr["title"]), bold=True)
    p2 = _p(doc, "APL Caption", plain(pr["category"])); keep_with_next(p2)

    def row(label, value):
        q = _p(doc, "APL PromptLbl", label); keep_with_next(q)
        _p(doc, "APL Body", plain(value))

    row("متى تستخدمه", pr["when"])
    row("ماذا ستحصل عليه", pr["gives"])
    if pr.get("inputs"):
        q = _p(doc, "APL PromptLbl", "جهّز هذه المعلومات"); keep_with_next(q)
        for x in pr["inputs"]:
            _p(doc, "APL Bullet", "•  " + plain(x))
    q = _p(doc, "APL PromptLbl", "البرومبت الجاهز للنسخ"); keep_with_next(q)
    for line in prompt_text(plain(pr["text"])).split("\n"):
        p = _p(doc, "APL Prompt", line if line.strip() else " ")
        keep_lines(p)
        pPr = _pr(p); shade(pPr, "FBF8F3")
        p.paragraph_format.space_after = Pt(0)
    doc.add_paragraph(style="APL Body")
    row("مثال استخدام", pr["example"])
    row("النتيجة المتوقعة", pr["output"])
    if pr.get("tip"):
        row("ملاحظة تحسين", pr["tip"])
    p = _p(doc, "APL Body")
    border(_pr(p), "bottom", 6, "E6E0D6")

def build_docx(d, out_path):
    doc = Document()
    ac = d["accent"][0]
    _make_styles(doc, ac)
    s = doc.sections[0]
    s.page_width, s.page_height = Mm(210), Mm(297)
    s.top_margin, s.bottom_margin = Mm(20), Mm(18)
    s.left_margin, s.right_margin = Mm(18), Mm(18)
    _sec_rtl(s)
    _footer(doc, s)

    acs = ac.lstrip("#").upper()
    # --- cover ---
    p = _p(doc, "APL Body"); p.paragraph_format.space_after = Pt(90)
    p = _p(doc, "APL Body", d["kicker"], color=acs, bold=True, size=11)
    p = _p(doc, "APL Title", d["title"])
    p = _p(doc, "APL Subtitle", d["subtitle"])
    p = _p(doc, "APL Body"); p.paragraph_format.space_after = Pt(24)
    p = _p(doc, "APL Body", " · ".join(d["promise"]), color="6E665A", size=10)
    p = _p(doc, "APL Body"); p.paragraph_format.space_after = Pt(40)
    p = _p(doc, "APL H3", d["platform"], color=acs)
    p = _p(doc, "APL Body", "برومبتات عربية", bold=True, size=10)
    p = _p(doc, "APL Body", "t.me/PromptsArabic", size=9, color="6E665A")
    doc.add_page_break()

    # --- rights ---
    _p(doc, "APL H1", "حقوق النشر")
    _p(doc, "APL H3", "برومبتات عربية")
    _p(doc, "APL Body", "جميع الحقوق محفوظة لقناة برومبتات عربية.")
    _p(doc, "APL Body",
       "هذا المنتج مخصص للاستخدام الشخصي للمشتري. لا يجوز إعادة نشره أو بيعه أو "
       "توزيعه أو اقتباس أجزاء منه لأغراض تجارية دون إذن كتابي من المالك.")
    p = _p(doc, "APL Body")
    add_text(p, "القناة الرسمية: ")
    r = p.add_run("https://t.me/PromptsArabic")
    r.bold = True; r.font.name = "JetBrains Mono"; r.font.size = Pt(10.5)
    r.font.color.rgb = RGBColor.from_string(acs)
    rPr = r._r.get_or_add_rPr()
    el = OxmlElement("w:rtl"); el.set(qn("w:val"), "0"); rPr.append(el)
    _docx_blocks(doc, [
        ("kv", [("اسم المنتج", d["title"]),
                ("الإصدار", d.get("edition", "الإصدار الأول")),
                ("اللغة", "العربية"),
                ("المقاس", "A4 عمودي — مهيأ للقراءة على الهاتف"),
                ("تمت مراجعة معلومات وميزات هذا الدليل حتى تاريخ", d["verified_at"]),
                ("مصادر التحقق", d["sources_line"])]),
        ("callout", "note", "ملاحظة مهمة عن تاريخ المحتوى",
         ["منصات الذكاء الاصطناعي تتغير بسرعة. كل ميزة مذكورة هنا تم التحقق منها من "
          "المصدر الرسمي بتاريخ %s. إذا مر وقت طويل على هذا التاريخ، راجع الصفحة "
          "الرسمية للميزة قبل الاعتماد عليها في عمل حساس." % d["verified_at"]]),
    ], ac)
    doc.add_page_break()

    # --- about ---
    _p(doc, "APL H1", "عن هذا الدليل")
    _docx_blocks(doc, [
        ("lead", d["about"]),
        ("h3", "لمن هذا الدليل"), ("ul", d["audience"]),
        ("h3", "ماذا ستتعلم"),    ("ul", d["learn"]),
    ], ac)
    doc.add_page_break()
    _p(doc, "APL H1", "قبل أن تبدأ")
    _docx_blocks(doc, [
        ("h3", "المتطلبات"),      ("ul", d["requirements"]),
        ("h3", "كيف تستخدم هذا الدليل"), ("ul", d["howto"]),
        ("callout", "tip", "طريقة القراءة الموصى بها",
         ["لا تقرأ الدليل كله دفعة واحدة. اقرأ فصلا واحدا، ثم نفّذ تمرينه على مهمة حقيقية "
          "من عملك، ثم انتقل. أربعة فصول مطبقة أفضل من أربعة عشر فصلا مقروءا."]),
    ], ac)
    doc.add_page_break()

    # --- TOC (live Word field) ---
    _p(doc, "APL H1", "الفهرس")
    _p(doc, "APL Caption",
       "لتحديث أرقام الصفحات في Word: اضغط داخل الفهرس ثم F9، أو Ctrl+A ثم F9.")
    p = doc.add_paragraph(); set_rtl_par(p)
    _field(p, ' TOC \\o "1-3" \\h \\z \\u ')
    doc.add_page_break()

    # --- chapters ---
    for i, ch in enumerate(d["chapters"]):
        if i:
            doc.add_page_break()
        p = _p(doc, "APL Caption", ch["num"], color=acs, bold=True); keep_with_next(p)
        p = _p(doc, "APL H1", plain(ch["title"])); keep_with_next(p)
        border(_pr(p), "bottom", 18, acs)
        _docx_blocks(doc, list(ch["blocks"]), ac)

    # --- end ---
    doc.add_page_break()
    e = d["end"]
    p = _p(doc, "APL H1", plain(e["title"])); border(_pr(p), "bottom", 18, acs)
    _docx_blocks(doc, list(e["blocks"]), ac)
    _p(doc, "APL H3", "برومبتات عربية")
    _p(doc, "APL Body", "هذا المنتج من إنتاج قناة برومبتات عربية. لمتابعة الأدلة والبرومبتات الجديدة:")
    p = _p(doc, "APL Body")
    r = p.add_run("https://t.me/PromptsArabic")
    r.bold = True; r.font.name = "JetBrains Mono"; r.font.size = Pt(11)
    r.font.color.rgb = RGBColor.from_string(acs)
    rPr = r._r.get_or_add_rPr()
    el = OxmlElement("w:rtl"); el.set(qn("w:val"), "0"); rPr.append(el)

    doc.save(out_path)
    return out_path

# ------------------------------------------------------------------ canonical dump
def dump_canonical(d, path):
    """Flatten every user-visible string, for copy/search verification."""
    lines = [plain(x) for x in
             [d["title"], d["subtitle"], d["kicker"], d["about"]]
             + list(d["promise"]) + list(d["audience"]) + list(d["learn"])
             + list(d["requirements"]) + list(d["howto"])]
    def walk(blocks):
        for b in blocks:
            k = b[0]
            if k in ("h2", "h3", "p", "lead", "sectionlead"):
                lines.append(plain(b[1]))
            elif k in ("ul", "ol"):
                lines.extend(plain(x) for x in b[1])
            elif k == "steps":
                lines.extend(plain(a) + " " + plain(c) for a, c in b[1])
            elif k == "code":
                if b[1]: lines.append(plain(b[1]))
                lines.append(b[2])
            elif k == "promptbox":
                if b[1]: lines.append(plain(b[1]))
                lines.append(prompt_text(plain(b[2])))
            elif k == "callout":
                lines.append(plain(b[2])); lines.extend(plain(x) for x in b[3])
            elif k == "table":
                lines.extend(plain(x) for x in b[1])
                for row in b[2]: lines.extend(plain(c) for c in row)
            elif k == "kv":
                for a, c in b[1]: lines.append(plain(a)); lines.append(plain(c))
            elif k == "prompt":
                p = b[1]
                lines.extend([plain(p["title"]), plain(p["category"]), plain(p["when"]),
                              plain(p["gives"]), prompt_text(plain(p["text"])), plain(p["example"]),
                              plain(p["output"])])
                lines.extend(plain(x) for x in p.get("inputs", []))
                if p.get("tip"): lines.append(plain(p["tip"]))
    for ch in d["chapters"]:
        lines.append(plain(ch["title"])); walk(ch["blocks"])
    lines.append(plain(d["end"]["title"])); walk(d["end"]["blocks"])
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    return lines

def count_prompts(d):
    n = []
    for ch in d["chapters"]:
        for b in ch["blocks"]:
            if b[0] == "prompt":
                n.append(b[1]["n"])
    return n
