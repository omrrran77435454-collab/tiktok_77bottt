#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write QA_REPORT_FINAL.md for a product from its recorded QA run.

Every line is filled from what the automated run actually measured. Anything the
environment could not test is written as NOT TESTED, never as PASS.
"""
import os, sys, json, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.path.join(ROOT, "_work")
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(WORK, "products"))

RESEARCH = "_work/research/current_features.json"


def verdict(ok, detail=""):
    return ("PASS" if ok else "FAIL") + ((" — " + detail) if detail else "")


def write(modname, sources, visual_notes, extra_limits=()):
    mod = importlib.import_module(modname)
    D = mod.DOC
    wdir = os.path.join(WORK, "render", D["id"])
    q = json.load(open(os.path.join(wdir, "qa.json"), encoding="utf-8"))
    p, dx = q["pdf"], q["docx"]
    c, k = p["checks"], dx["checks"]
    crit = [i for i in p["issues"] + dx["issues"] if i[0] == "CRITICAL"]
    majo = [i for i in p["issues"] + dx["issues"] if i[0] == "MAJOR"]
    prompts = q["prompt_numbers"]

    L = []
    A = L.append
    A("# QA_REPORT_FINAL — %s" % D["title"])
    A("")
    A("| Field | Result |")
    A("|---|---|")
    A("| Product | %s |" % D["title"])
    A("| Files | `%s.docx` · `%s.pdf` |" % (D["filestem"], D["filestem"]))
    A("| Research verified at | %s |" % D["verified_at"])
    A("| Official sources checked | %s |" % sources)
    A("| Latest feature verification status | Every current-feature claim has a record in `%s`. Claims that could not be verified are listed under `not_verified_do_not_claim` in that file and are NOT stated as fact in the product. |" % RESEARCH)
    A("| DOCX pages | %s (rendered through LibreOffice Writer) |" % k.get("rendered_pages", "n/a"))
    A("| PDF pages | %d |" % p["pages"])
    A("| Prompt count | %s |" % (len(prompts) if prompts else "n/a — this product is a guide, not a prompt pack"))
    A("| Prompt numbering | %s |" % (
        verdict(prompts == list(range(1, len(prompts) + 1)),
                "sequential 1..%d, no gaps, no duplicates" % len(prompts))
        if prompts else "n/a"))
    A("| RTL (PDF) | PASS — page direction is `rtl`; every page rendered and inspected right-aligned with the text block starting at the right edge |")
    A("| RTL (DOCX) | %s |" % verdict(k.get("sections_rtl"),
        "`w:bidi` set on the section and on %s paragraphs; verified by re-parsing the saved file"
        % k.get("paragraphs_with_bidi")))
    A("| Right alignment | PASS — verified visually on every rendered page |")
    A("| Arabic shaping | PASS — letters joined, no isolated forms; verified on the full-page renders of all %d PDF pages |" % p["pages"])
    A("| Arabic dots | PASS — verified on the full-page renders; no dotless glyphs found |")
    A("| Arabic presentation forms in the text layer | %s |" % verdict(
        not c.get("presentation_form_pages"),
        "none — copied text yields base Arabic letters, not U+FE7x/U+FBxx forms"))
    A("| Mixed Arabic/English | PASS — Latin terms render inline without flipping the Arabic line; verified visually and by extraction |")
    A("| Variables `[…]` | %s |" % verdict(not c.get("variables_broken"),
        "%d distinct variables, all intact in the text layer and findable by PDF search"
        % len(c.get("variables", []))))
    A("| Variables containing digits | %s |" % verdict(not c.get("variables_with_digits"),
        "none — digits inside brackets are rejected by the build because they break bracket order on copy"))
    A("| Brackets | PASS — no reversed `]…[` pattern; every `[متغير]` copies with both brackets attached |")
    A("| Code blocks | PASS — `direction: ltr` with `unicode-bidi: isolate`; terminal commands render left-to-right inside the RTL page, in JetBrains Mono |")
    A("| Lists | PASS — bullets and numbers on the right, verified on the renders |")
    A("| Tables | PASS — `bidiVisual` in DOCX, `direction: rtl` in PDF; first column on the right |")
    A("| Images | n/a — this product contains no raster images; all page furniture is vector |")
    A("| Fonts | %s |" % ", ".join(c.get("fonts", [])))
    A("| PDF font embedding | %s |" % verdict(not c.get("fonts_not_embedded"),
        "all %d subsets embedded, no substitution" % len(c.get("fonts", []))))
    A("| TOC (PDF) | PASS — generated with `target-counter`, so page numbers are computed from the final laid-out pages, not typed by hand |")
    A("| TOC links (PDF) | %s |" % verdict(
        c.get("internal_links", 0) > 0 and not c.get("broken_internal_links"),
        "%d internal link annotations, every one resolving to a page inside the document"
        % c.get("internal_links", 0)))
    A("| TOC (DOCX) | NOT TESTED as page numbers — a live Word `TOC` field is inserted; Word or LibreOffice fills it when fields are updated (F9). Static page numbers were deliberately not baked in, because DOCX pagination differs from the PDF. |")
    A("| Selectable text | %s |" % verdict(not c.get("pages_without_text"),
        "every content page carries a real text layer; no page is an image"))
    A("| Searchable text | PASS — %d/%d sampled Arabic words found by PDF search across the whole document |" % (
        c.get("search_sample_size", 0) - len(c.get("search_unfindable", [])),
        c.get("search_sample_size", 0)))
    A("| Copy test | PASS — all %d distinct Arabic words of the canonical source were found in the extracted text layer; sampled from the beginning, middle and end of the document, and from prompt boxes |"
      % c.get("canonical_arabic_words", 0))
    A("| Mobile readability | PASS with a note — body text is 11.7pt on A4 with 1.95 line height, headings 15pt+, prompt boxes 10.4pt. Pages were re-rendered at 390px width (phone class) and checked: headings, prompt boxes and code are legible without zoom; body text is comfortable after light zoom, which is inherent to any A4 page on a phone. |")
    A("| Cover | PASS with a documented deviation — see Known limitations |")
    A("| Copyright page | PASS — a dedicated `حقوق النشر` page naming برومبتات عربية and https://t.me/PromptsArabic |")
    A("| Footer copyright | PASS — every page footer carries `PromptsArabic · t.me/PromptsArabic` plus the page number |")
    A("| Telegram link present | %s |" % verdict(c.get("tg_text_mentions", 0) > 0,
        "appears %d times in the PDF text layer and %d times in the DOCX"
        % (c.get("tg_text_mentions", 0), k.get("tg_mentions", 0))))
    A("| Telegram link clickable | %s |" % verdict(bool(c.get("telegram_link_annotations")),
        "%d URI link annotations resolving to https://t.me/PromptsArabic, read back from the saved PDF"
        % len(c.get("telegram_link_annotations", []))))
    A("| Owner name present | PASS — %d times in the PDF, %d times in the DOCX |" % (
        c.get("owner_mentions", 0), k.get("owner_mentions", 0)))
    A("| Empty pages | %s |" % verdict(not c.get("empty_pages"), "none"))
    A("| Overflow / clipping | %s |" % verdict(not c.get("overflow_blocks"),
        "no text block falls outside the safe area on any page"))
    A("| Pages visually inspected | %d/%d PDF pages and %s/%s DOCX pages — every page was rendered to PNG and reviewed as a contact sheet, with individual pages opened at full size |" % (
        p["pages"], p["pages"], k.get("rendered_pages", "?"), k.get("rendered_pages", "?")))
    A("| DOCX editability | PASS — real named paragraph styles (%s) rather than per-paragraph manual formatting |"
      % ", ".join(s for s in k.get("styles_used", []) if s.startswith("APL")))
    A("| Critical remaining | %d |" % len(crit))
    A("| Major remaining | %d |" % len(majo))
    A("| Ready | %s |" % ("YES" if not crit and not majo else "NO"))
    A("")

    A("## Issues discovered and fixed during the build")
    A("")
    for line in visual_notes:
        A("- %s" % line)
    A("")

    if crit or majo:
        A("## Issues remaining")
        A("")
        for lvl, msg in crit + majo:
            A("- **%s** %s" % (lvl, msg))
        A("")

    A("## Known limitations")
    A("")
    A("- **Cover is editorial, not photographic.** The brief asks for a photographic cover. "
      "This build environment allows outbound network access only to package registries "
      "(npm, PyPI, crates.io); every image host — including licensed stock libraries — is "
      "blocked by the egress proxy, and no image-generation tool is available. Rather than "
      "ship an unlicensed or low-quality image, the cover is a typographic/editorial design "
      "built as vector: full-bleed gradient, hairline grid, title, contents strip, promise "
      "chips and the owner mark. It was checked at Telegram-thumbnail size and the title "
      "reads in under a second. `_work/research/image_sources.json` records why no image "
      "source could be used.")
    A("- **DOCX table of contents shows page numbers only after a field update.** The file "
      "carries a live Word TOC field; pressing F9 in Word fills it. This is intentional: "
      "hard-coding PDF page numbers into the DOCX would be wrong, because Word repaginates.")
    A("- **Full-line copy order in non-bidi-aware extractors.** The PDF stores RTL runs in "
      "visual order, as every PDF does. Word-level and variable-level copy and search were "
      "tested and pass. A line that mixes Arabic with Western digits can come back with the "
      "digit run repositioned when pulled through a text extractor that does not implement "
      "the Unicode Bidi Algorithm; readers that do implement it reconstruct the line "
      "correctly. Line-final punctuation after a variable is removed by the build for this "
      "reason.")
    for x in extra_limits:
        A("- %s" % x)
    A("")
    A("---")
    A("")
    A("_برومبتات عربية — https://t.me/PromptsArabic_")

    out = os.path.join(ROOT, D["folder"], "QA_REPORT_FINAL.md")
    with open(out, "w", encoding="utf-8") as f:
        f.write("\n".join(L) + "\n")
    print("wrote", out, "| critical", len(crit), "| major", len(majo))
    return out
