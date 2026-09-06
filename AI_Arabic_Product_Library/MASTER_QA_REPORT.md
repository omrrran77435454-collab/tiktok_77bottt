# MASTER_QA_REPORT — مكتبة المنتجات الرقمية العربية

Owner: **برومبتات عربية** · https://t.me/PromptsArabic

Every row below is filled from the automated QA run recorded in `_work/render/<id>/qa.json` for that product, plus the visual inspection of every rendered page. `Ready = YES` only where Critical = 0 and Major = 0.

| # | Product | DOCX | PDF | Research date | DOCX pages | PDF pages | Visual pages inspected | Copyright | Arabic QA | Critical | Major | Ready |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | دليل Claude العملي | `Claude_Guide_Arabic_Final.docx` | `Claude_Guide_Arabic_Final.pdf` | 6 سبتمبر 2026 | 40 | 44 | 84 | PASS | PASS | 0 | 0 | **YES** |
| 2 | 60 برومبت احترافي لـ Claude | `Claude_60_Prompts_Arabic_Final.docx` | `Claude_60_Prompts_Arabic_Final.pdf` | 6 سبتمبر 2026 | 109 | 88 | 197 | PASS | PASS | 0 | 0 | **YES** |
| 3 | Claude Code من الصفر إلى الاحتراف | `Claude_Code_Zero_To_Pro_Arabic_Final.docx` | `Claude_Code_Zero_To_Pro_Arabic_Final.pdf` | 6 سبتمبر 2026 | 51 | 56 | 107 | PASS | PASS | 0 | 0 | **YES** |
| 4 | تعلم البرمجة مع Claude Code | `Learn_Programming_With_Claude_Code_Arabic_Final.docx` | `Learn_Programming_With_Claude_Code_Arabic_Final.pdf` | 6 سبتمبر 2026 | 64 | 63 | 127 | PASS | PASS | 0 | 0 | **YES** |
| 5 | ابن موقعك الأول مع Claude Code | `Build_Websites_With_Claude_Code_Arabic_Final.docx` | `Build_Websites_With_Claude_Code_Arabic_Final.pdf` | 6 سبتمبر 2026 | 38 | 37 | 75 | PASS | PASS | 0 | 0 | **YES** |
| 6 | ابن تطبيقك الأول مع Claude Code | `Build_Apps_With_Claude_Code_Arabic_Final.docx` | `Build_Apps_With_Claude_Code_Arabic_Final.pdf` | 6 سبتمبر 2026 | 36 | 36 | 72 | PASS | PASS | 0 | 0 | **YES** |
| 7 | ChatGPT من الصفر إلى الاحتراف | `ChatGPT_Guide_Arabic_Final.docx` | `ChatGPT_Guide_Arabic_Final.pdf` | 6 سبتمبر 2026 | 37 | 41 | 78 | PASS | PASS | 0 | 0 | **YES** |
| 8 | 60 برومبت احترافي لـ ChatGPT | `ChatGPT_60_Prompts_Arabic_Final.docx` | `ChatGPT_60_Prompts_Arabic_Final.pdf` | 6 سبتمبر 2026 | 104 | 84 | 188 | PASS | PASS | 0 | 0 | **YES** |
| 9 | Grok من الصفر إلى الاحتراف | `Grok_Guide_Arabic_Final.docx` | `Grok_Guide_Arabic_Final.pdf` | 6 سبتمبر 2026 | 32 | 34 | 66 | PASS | PASS | 0 | 0 | **YES** |
| 10 | 60 برومبت احترافي لـ Grok | `Grok_60_Prompts_Arabic_Final.docx` | `Grok_60_Prompts_Arabic_Final.pdf` | 6 سبتمبر 2026 | 101 | 81 | 182 | PASS | PASS | 0 | 0 | **YES** |
| 11 | ChatGPT أم Claude أم Grok | `Which_AI_To_Use_Arabic_Final.docx` | `Which_AI_To_Use_Arabic_Final.pdf` | 6 سبتمبر 2026 | 32 | 34 | 66 | PASS | PASS | 0 | 0 | **YES** |

**Totals:** 598 PDF pages and 644 DOCX pages built, rendered and inspected — 1242 rendered pages in all.

## What each column means

- **Research date** — the day every current-feature claim in that product was verified against the official source. Each claim has a record in `_work/research/current_features.json`; claims that could not be verified are listed there under `not_verified_do_not_claim` and are absent from the products.
- **Visual pages inspected** — every page of both files was rendered to PNG (PDF through PyMuPDF, DOCX through LibreOffice Writer) and reviewed on contact sheets, with full-size review of any page that needed scrutiny. No sampling.
- **Copyright** — the owner name and the official link appear on a dedicated copyright page, in the footer of every page, and small on the cover, in both files. The Telegram link is a real, tested link annotation in every PDF.
- **Arabic QA** — PASS requires four things to hold in the delivered PDF: no Arabic presentation forms in the text layer, every canonical Arabic word recoverable by extraction, a reader-style search sample with zero misses, and every `[variable]` intact with its brackets in the right order.

## Copyright and link verification

| # | Product | Owner mentions (PDF) | Telegram text mentions | Tested link annotations | DOCX owner mentions |
|---|---|---|---|---|---|
| 1 | دليل Claude العملي | 5 | 46 | 2 | 5 |
| 2 | 60 برومبت احترافي لـ Claude | 5 | 90 | 2 | 5 |
| 3 | Claude Code من الصفر إلى الاحتراف | 5 | 58 | 2 | 5 |
| 4 | تعلم البرمجة مع Claude Code | 5 | 65 | 2 | 5 |
| 5 | ابن موقعك الأول مع Claude Code | 5 | 39 | 2 | 5 |
| 6 | ابن تطبيقك الأول مع Claude Code | 5 | 38 | 2 | 5 |
| 7 | ChatGPT من الصفر إلى الاحتراف | 5 | 43 | 2 | 5 |
| 8 | 60 برومبت احترافي لـ ChatGPT | 5 | 86 | 2 | 5 |
| 9 | Grok من الصفر إلى الاحتراف | 5 | 36 | 2 | 5 |
| 10 | 60 برومبت احترافي لـ Grok | 5 | 83 | 2 | 5 |
| 11 | ChatGPT أم Claude أم Grok | 5 | 36 | 2 | 5 |

## Text fidelity in the delivered PDFs

| # | Product | Arabic words checked | Missing after extraction | Search sample | Unfindable | Broken variables | Fonts embedded |
|---|---|---|---|---|---|---|---|
| 1 | دليل Claude العملي | 1602 | 0 | 124 | 0 | 0 | all |
| 2 | 60 برومبت احترافي لـ Claude | 2782 | 0 | 121 | 0 | 0 | all |
| 3 | Claude Code من الصفر إلى الاحتراف | 1760 | 0 | 126 | 0 | 0 | all |
| 4 | تعلم البرمجة مع Claude Code | 1632 | 0 | 126 | 0 | 0 | all |
| 5 | ابن موقعك الأول مع Claude Code | 1283 | 0 | 129 | 0 | 0 | all |
| 6 | ابن تطبيقك الأول مع Claude Code | 1254 | 0 | 126 | 0 | 0 | all |
| 7 | ChatGPT من الصفر إلى الاحتراف | 1373 | 0 | 125 | 0 | 0 | all |
| 8 | 60 برومبت احترافي لـ ChatGPT | 2579 | 0 | 123 | 0 | 0 | all |
| 9 | Grok من الصفر إلى الاحتراف | 1212 | 0 | 122 | 0 | 0 | all |
| 10 | 60 برومبت احترافي لـ Grok | 2245 | 0 | 125 | 0 | 0 | all |
| 11 | ChatGPT أم Claude أم Grok | 1339 | 0 | 122 | 0 | 0 | all |

## Prompt libraries — uniqueness

Three products are prompt libraries of exactly 60 prompts each. Every prompt is listed in `_work/prompt_matrix_<id>.csv` with its number, title, purpose, inputs, outputs, category and platform. Each prompt was compared on title and purpose against every other prompt in its own file **and** against every prompt in the other two libraries.

| Product | Prompts | Chapters | Within-file collisions found | Cross-product collisions found | Resolution |
|---|---|---|---|---|---|
| 60 برومبت احترافي لـ Claude | 60 | 12 | 1 (prompts 15 and 43, 0.63) | — | prompt 43 retitled and both purposes rewritten |
| 60 برومبت احترافي لـ ChatGPT | 60 | 12 | 0 | 1 (prompt 6 against Claude 46, 0.65) | prompt 6 replaced with merging heterogeneous files into one table |
| 60 برومبت احترافي لـ Grok | 60 | 12 | 0 | 1 (prompt 40 against ChatGPT 20, 0.70) | prompt 40 replaced with designing the audio layer of a generated scene |

After each rewrite the checker was re-run and reported no pair above threshold, inside the file or across the library. Changing the subject, the audience or the platform of a prompt was never treated as making it a different prompt: the comparison is on function.

## Known limitations, library-wide

- **Covers are editorial, not photographic.** The brief asks for a photographic cover on every product. This build environment reaches package registries only; every image host, licensed stock libraries included, is refused by the egress proxy, and no image-generation tool is available. Rather than ship an unlicensed or low-resolution image, all eleven covers are typographic/editorial vector designs from one family: full-bleed gradient, hairline grid, title, contents strip, promise chips and the owner mark. Each was checked at Telegram-thumbnail size. `_work/research/image_sources.json` records the blocked hosts, the decision and the fact that no external image was used.
- **The DOCX table of contents fills its page numbers on a field update.** Each DOCX carries a live Word TOC field; pressing F9 in Word fills it. Hard-coding the PDF's page numbers would be wrong, because Word repaginates on the reader's machine.
- **Full-line copy order in extractors that ignore the Unicode Bidi Algorithm.** PDFs store RTL runs in visual order. Word-level and variable-level copy and search were tested on every product and pass. A line mixing Arabic with Western digits can come back with the digit run repositioned when pulled through a non-bidi-aware extractor; bidi-aware readers reconstruct it correctly.
- **No comparative benchmarks anywhere in the library.** No live head-to-head model tests were run, so no score, ranking or performance figure is stated in any product. Product 11 is a capability-based comparison and says so on its first page.

---

_برومبتات عربية — https://t.me/PromptsArabic_
