# QA_REPORT_FINAL — 60 برومبت احترافي لـ Claude

| Field | Result |
|---|---|
| Product | 60 برومبت احترافي لـ Claude |
| Files | `Claude_60_Prompts_Arabic_Final.docx` · `Claude_60_Prompts_Arabic_Final.pdf` |
| Research verified at | 6 سبتمبر 2026 |
| Official sources checked | platform.claude.com (Claude prompting best practices — the named techniques the library is built on) and support.claude.com (features referenced by individual prompts) |
| Latest feature verification status | Every current-feature claim has a record in `_work/research/current_features.json`. Claims that could not be verified are listed under `not_verified_do_not_claim` in that file and are NOT stated as fact in the product. |
| DOCX pages | 109 (rendered through LibreOffice Writer) |
| PDF pages | 88 |
| Prompt count | 60 |
| Prompt uniqueness | PASS — `_work/prompt_matrix_02_claude_prompts.csv` lists number, title, purpose, inputs, outputs, category and platform for all 60 prompts. Every pair was compared on title+purpose similarity; the one pair that scored above threshold was rewritten so no two prompts perform the same function. |
| Prompt numbering | PASS — sequential 1..60, no gaps, no duplicates |
| RTL (PDF) | PASS — page direction is `rtl`; every page rendered and inspected right-aligned with the text block starting at the right edge |
| RTL (DOCX) | PASS — `w:bidi` set on the section and on 2343 paragraphs; verified by re-parsing the saved file |
| Right alignment | PASS — verified visually on every rendered page |
| Arabic shaping | PASS — letters joined, no isolated forms; verified on the full-page renders of all 88 PDF pages |
| Arabic dots | PASS — verified on the full-page renders; no dotless glyphs found |
| Arabic presentation forms in the text layer | PASS — none — copied text yields base Arabic letters, not U+FE7x/U+FBxx forms |
| Mixed Arabic/English | PASS — Latin terms render inline without flipping the Arabic line; verified visually and by extraction |
| Variables `[…]` | PASS — 126 distinct variables, all intact in the text layer and findable by PDF search |
| Variables containing digits | PASS — none — digits inside brackets are rejected by the build because they break bracket order on copy |
| Brackets | PASS — no reversed `]…[` pattern; every `[متغير]` copies with both brackets attached |
| Code blocks | PASS — `direction: ltr` with `unicode-bidi: isolate`; terminal commands render left-to-right inside the RTL page, in JetBrains Mono |
| Lists | PASS — bullets and numbers on the right, verified on the renders |
| Tables | PASS — `bidiVisual` in DOCX, `direction: rtl` in PDF; first column on the right |
| Images | n/a — this product contains no raster images; all page furniture is vector |
| Fonts | CRZFJS+PlexAr-Semi-Bold, FNPUCG+PlexAr-Medium, HIRYNU+PlexAr-Bold, NETSUB+PlexMono, TFCPFR+PlexAr, UWGIWA+DejaVu-Sans-Bold, WDHEQY+PlexMono-Bold, XKQQSR+DejaVu-Sans |
| PDF font embedding | PASS — all 8 subsets embedded, no substitution |
| TOC (PDF) | PASS — generated with `target-counter`, so page numbers are computed from the final laid-out pages, not typed by hand |
| TOC links (PDF) | PASS — 196 internal link annotations, every one resolving to a page inside the document |
| TOC (DOCX) | NOT TESTED as page numbers — a live Word `TOC` field is inserted; Word or LibreOffice fills it when fields are updated (F9). Static page numbers were deliberately not baked in, because DOCX pagination differs from the PDF. |
| Selectable text | PASS — every content page carries a real text layer; no page is an image |
| Searchable text | PASS — 121/121 sampled Arabic words found by PDF search across the whole document |
| Copy test | PASS — all 2780 distinct Arabic words of the canonical source were found in the extracted text layer; sampled from the beginning, middle and end of the document, and from prompt boxes |
| Mobile readability | PASS with a note — body text is 11.7pt on A4 with 1.95 line height, headings 15pt+, prompt boxes 10.4pt. Pages were re-rendered at 390px width (phone class) and checked: headings, prompt boxes and code are legible without zoom; body text is comfortable after light zoom, which is inherent to any A4 page on a phone. |
| Cover | PASS with a documented deviation — see Known limitations |
| Copyright page | PASS — a dedicated `حقوق النشر` page naming برومبتات عربية and https://t.me/PromptsArabic |
| Footer copyright | PASS — every page footer carries `PromptsArabic · t.me/PromptsArabic` plus the page number |
| Telegram link present | PASS — appears 90 times in the PDF text layer and 3 times in the DOCX |
| Telegram link clickable | PASS — 2 URI link annotations resolving to https://t.me/PromptsArabic, read back from the saved PDF |
| Owner name present | PASS — 5 times in the PDF, 5 times in the DOCX |
| Empty pages | PASS — none |
| Overflow / clipping | PASS — no text block falls outside the safe area on any page |
| Pages visually inspected | 88/88 PDF pages and 109/109 DOCX pages — every page was rendered to PNG and reviewed as a contact sheet, with individual pages opened at full size |
| DOCX editability | PASS — real named paragraph styles (APL Body, APL Bullet, APL Callout, APL Caption, APL Code, APL H1, APL H2, APL H3, APL Lead, APL Prompt, APL PromptLbl, APL Subtitle, APL Title) rather than per-paragraph manual formatting |
| Critical remaining | 0 |
| Major remaining | 0 |
| Ready | YES |

## Issues discovered and fixed during the build

- Built on the engine hardened during product 01, so the Arabic ligature ToUnicode repair, the tashkeel strip and the variable-bracket rules applied from the first build.
- A line inside a prompt box that begins with a Western digit or an ASCII dash has that character relocated to the far end of the line when copied, and it also corrupted the neighbouring line holding a lone variable ([حالتي] copied as ][حالتي). Five line-marker treatments were tested; lines starting with an Arabic letter copy back exactly. The engine now converts leading 1. 2. 3. to Arabic ordinals and leading - to a bullet glyph, in both the PDF and the DOCX, and in the canonical text used for the copy test.
- A first pass of word disambiguation replaced فسّر too broadly and turned تفسّر into تحلل inside three sentences. Caught on visual inspection of page 17 and reverted to تشرح.
- Prompt 43 and prompt 15 scored 0.63 on function similarity because both were titled as a review looking for problems. Prompt 43 was retitled فحص أمني لكود قبل النشر and both purposes rewritten so the two functions read as clearly distinct.
- The first build ran to 141 pages with large gaps: break-inside: avoid on the whole prompt card pushed any card that did not fit onto a fresh page. Cards may now break, while the copyable prompt box itself never splits, and card spacing was tightened. 141 pages to 88 with no loss of content.
- Chapter opener pages were nearly empty. Each chapter now opens with a numbered index of the five prompts it contains, which fills the page with something a reader uses.

## Known limitations

- **Cover is editorial, not photographic.** The brief asks for a photographic cover. This build environment allows outbound network access only to package registries (npm, PyPI, crates.io); every image host — including licensed stock libraries — is blocked by the egress proxy, and no image-generation tool is available. Rather than ship an unlicensed or low-quality image, the cover is a typographic/editorial design built as vector: full-bleed gradient, hairline grid, title, contents strip, promise chips and the owner mark. It was checked at Telegram-thumbnail size and the title reads in under a second. `_work/research/image_sources.json` records why no image source could be used.
- **DOCX table of contents shows page numbers only after a field update.** The file carries a live Word TOC field; pressing F9 in Word fills it. This is intentional: hard-coding PDF page numbers into the DOCX would be wrong, because Word repaginates.
- **Full-line copy order in non-bidi-aware extractors.** The PDF stores RTL runs in visual order, as every PDF does. Word-level and variable-level copy and search were tested and pass. A line that mixes Arabic with Western digits can come back with the digit run repositioned when pulled through a text extractor that does not implement the Unicode Bidi Algorithm; readers that do implement it reconstruct the line correctly. Line-final punctuation after a variable is removed by the build for this reason.

---

_برومبتات عربية — https://t.me/PromptsArabic_
