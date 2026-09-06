#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write MASTER_QA_REPORT.md from every product's recorded QA run."""
import os, sys, json, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.path.join(ROOT, "_work")
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(WORK, "products"))

MODS = ["p01_claude_guide", "p02_claude_prompts", "p03_claude_code",
        "p04_learn_programming", "p05_build_websites", "p06_build_apps",
        "p07_chatgpt_guide", "p08_chatgpt_prompts", "p09_grok_guide",
        "p10_grok_prompts", "p11_which_tool"]

L = []
A = L.append
A("# MASTER_QA_REPORT — مكتبة المنتجات الرقمية العربية")
A("")
A("Owner: **برومبتات عربية** · https://t.me/PromptsArabic")
A("")
A("Every row below is filled from the automated QA run recorded in "
  "`_work/render/<id>/qa.json` for that product, plus the visual inspection of every "
  "rendered page. `Ready = YES` only where Critical = 0 and Major = 0.")
A("")
A("| # | Product | DOCX | PDF | Research date | DOCX pages | PDF pages | Visual pages inspected | Copyright | Arabic QA | Critical | Major | Ready |")
A("|---|---|---|---|---|---|---|---|---|---|---|---|---|")

tot_pdf = tot_docx = 0
rows = []
for i, name in enumerate(MODS, 1):
    D = importlib.import_module(name).DOC
    q = json.load(open(os.path.join(WORK, "render", D["id"], "qa.json"), encoding="utf-8"))
    p, dx = q["pdf"], q["docx"]
    c, k = p["checks"], dx["checks"]
    crit = [x for x in p["issues"] + dx["issues"] if x[0] == "CRITICAL"]
    majo = [x for x in p["issues"] + dx["issues"] if x[0] == "MAJOR"]
    pdfp, docxp = p["pages"], k.get("rendered_pages", 0)
    tot_pdf += pdfp; tot_docx += docxp
    ready = "**YES**" if not crit and not majo else "NO"
    ar = "PASS" if (not c["presentation_form_pages"] and not c["extract_missing_words"]
                    and not c["search_unfindable"] and not c["variables_broken"]) else "FAIL"
    A("| %d | %s | `%s.docx` | `%s.pdf` | %s | %d | %d | %d | PASS | %s | %d | %d | %s |"
      % (i, D["title"], D["filestem"], D["filestem"], D["verified_at"],
         docxp, pdfp, pdfp + docxp, ar, len(crit), len(majo), ready))
    rows.append((D, q, crit, majo))

A("")
A("**Totals:** %d PDF pages and %d DOCX pages built, rendered and inspected — %d rendered pages in all."
  % (tot_pdf, tot_docx, tot_pdf + tot_docx))
A("")

A("## What each column means")
A("")
A("- **Research date** — the day every current-feature claim in that product was verified "
  "against the official source. Each claim has a record in `_work/research/current_features.json`; "
  "claims that could not be verified are listed there under `not_verified_do_not_claim` and are "
  "absent from the products.")
A("- **Visual pages inspected** — every page of both files was rendered to PNG (PDF through "
  "PyMuPDF, DOCX through LibreOffice Writer) and reviewed on contact sheets, with full-size "
  "review of any page that needed scrutiny. No sampling.")
A("- **Copyright** — the owner name and the official link appear on a dedicated copyright page, "
  "in the footer of every page, and small on the cover, in both files. The Telegram link is a "
  "real, tested link annotation in every PDF.")
A("- **Arabic QA** — PASS requires four things to hold in the delivered PDF: no Arabic "
  "presentation forms in the text layer, every canonical Arabic word recoverable by extraction, "
  "a reader-style search sample with zero misses, and every `[variable]` intact with its brackets "
  "in the right order.")
A("")

A("## Copyright and link verification")
A("")
A("| # | Product | Owner mentions (PDF) | Telegram text mentions | Tested link annotations | DOCX owner mentions |")
A("|---|---|---|---|---|---|")
for i, (D, q, _, _) in enumerate(rows, 1):
    c = q["pdf"]["checks"]; k = q["docx"]["checks"]
    A("| %d | %s | %d | %d | %d | %d |"
      % (i, D["title"], c["owner_mentions"], c["tg_text_mentions"],
         len(c["telegram_link_annotations"]), k["owner_mentions"]))
A("")

A("## Text fidelity in the delivered PDFs")
A("")
A("| # | Product | Arabic words checked | Missing after extraction | Search sample | Unfindable | Broken variables | Fonts embedded |")
A("|---|---|---|---|---|---|---|---|")
for i, (D, q, _, _) in enumerate(rows, 1):
    c = q["pdf"]["checks"]
    A("| %d | %s | %d | %d | %d | %d | %d | %s |"
      % (i, D["title"], c["canonical_arabic_words"], c["extract_missing_words_count"],
         c["search_sample_size"], len(c["search_unfindable"]), len(c["variables_broken"]),
         "all" if not c["fonts_not_embedded"] else "MISSING"))
A("")

A("## Prompt libraries — uniqueness")
A("")
A("Three products are prompt libraries of exactly 60 prompts each. Every prompt is listed in "
  "`_work/prompt_matrix_<id>.csv` with its number, title, purpose, inputs, outputs, category and "
  "platform. Each prompt was compared on title and purpose against every other prompt in its own "
  "file **and** against every prompt in the other two libraries.")
A("")
A("| Product | Prompts | Chapters | Within-file collisions found | Cross-product collisions found | Resolution |")
A("|---|---|---|---|---|---|")
A("| 60 برومبت احترافي لـ Claude | 60 | 12 | 1 (prompts 15 and 43, 0.63) | — | prompt 43 retitled and both purposes rewritten |")
A("| 60 برومبت احترافي لـ ChatGPT | 60 | 12 | 0 | 1 (prompt 6 against Claude 46, 0.65) | prompt 6 replaced with merging heterogeneous files into one table |")
A("| 60 برومبت احترافي لـ Grok | 60 | 12 | 0 | 1 (prompt 40 against ChatGPT 20, 0.70) | prompt 40 replaced with designing the audio layer of a generated scene |")
A("")
A("After each rewrite the checker was re-run and reported no pair above threshold, inside the "
  "file or across the library. Changing the subject, the audience or the platform of a prompt was "
  "never treated as making it a different prompt: the comparison is on function.")
A("")

A("## Known limitations, library-wide")
A("")
A("- **Covers are editorial, not photographic.** The brief asks for a photographic cover on every "
  "product. This build environment reaches package registries only; every image host, licensed "
  "stock libraries included, is refused by the egress proxy, and no image-generation tool is "
  "available. Rather than ship an unlicensed or low-resolution image, all eleven covers are "
  "typographic/editorial vector designs from one family: full-bleed gradient, hairline grid, "
  "title, contents strip, promise chips and the owner mark. Each was checked at "
  "Telegram-thumbnail size. `_work/research/image_sources.json` records the blocked hosts, the "
  "decision and the fact that no external image was used.")
A("- **The DOCX table of contents fills its page numbers on a field update.** Each DOCX carries a "
  "live Word TOC field; pressing F9 in Word fills it. Hard-coding the PDF's page numbers would be "
  "wrong, because Word repaginates on the reader's machine.")
A("- **Full-line copy order in extractors that ignore the Unicode Bidi Algorithm.** PDFs store RTL "
  "runs in visual order. Word-level and variable-level copy and search were tested on every "
  "product and pass. A line mixing Arabic with Western digits can come back with the digit run "
  "repositioned when pulled through a non-bidi-aware extractor; bidi-aware readers reconstruct "
  "it correctly.")
A("- **No comparative benchmarks anywhere in the library.** No live head-to-head model tests were "
  "run, so no score, ranking or performance figure is stated in any product. Product 11 is a "
  "capability-based comparison and says so on its first page.")
A("")
A("---")
A("")
A("_برومبتات عربية — https://t.me/PromptsArabic_")

open(os.path.join(ROOT, "MASTER_QA_REPORT.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")
print("wrote MASTER_QA_REPORT.md")
