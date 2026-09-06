# QA_REPORT_FINAL — دليل Claude العملي

| Field | Result |
|---|---|
| Product | دليل Claude العملي |
| Files | `Claude_Guide_Arabic_Final.docx` · `Claude_Guide_Arabic_Final.pdf` |
| Research verified at | 6 سبتمبر 2026 |
| Official sources checked | platform.claude.com (models overview, prompting best practices), code.claude.com (Claude Code overview and docs index), support.claude.com (projects, artifacts, memory, web search, research, file uploads, plans and limits) |
| Latest feature verification status | Every current-feature claim has a record in `_work/research/current_features.json`. Claims that could not be verified are listed under `not_verified_do_not_claim` in that file and are NOT stated as fact in the product. |
| DOCX pages | 40 (rendered through LibreOffice Writer) |
| PDF pages | 44 |
| Prompt count | n/a — this product is a guide, not a prompt pack |
| Prompt numbering | n/a |
| RTL (PDF) | PASS — page direction is `rtl`; every page rendered and inspected right-aligned with the text block starting at the right edge |
| RTL (DOCX) | PASS — `w:bidi` set on the section and on 502 paragraphs; verified by re-parsing the saved file |
| Right alignment | PASS — verified visually on every rendered page |
| Arabic shaping | PASS — letters joined, no isolated forms; verified on the full-page renders of all 44 PDF pages |
| Arabic dots | PASS — verified on the full-page renders; no dotless glyphs found |
| Arabic presentation forms in the text layer | PASS — none — copied text yields base Arabic letters, not U+FE7x/U+FBxx forms |
| Mixed Arabic/English | PASS — Latin terms render inline without flipping the Arabic line; verified visually and by extraction |
| Variables `[…]` | PASS — 24 distinct variables, all intact in the text layer and findable by PDF search |
| Variables containing digits | PASS — none — digits inside brackets are rejected by the build because they break bracket order on copy |
| Brackets | PASS — no reversed `]…[` pattern; every `[متغير]` copies with both brackets attached |
| Code blocks | PASS — `direction: ltr` with `unicode-bidi: isolate`; terminal commands render left-to-right inside the RTL page, in JetBrains Mono |
| Lists | PASS — bullets and numbers on the right, verified on the renders |
| Tables | PASS — `bidiVisual` in DOCX, `direction: rtl` in PDF; first column on the right |
| Images | n/a — this product contains no raster images; all page furniture is vector |
| Fonts | CRZFJS+PlexAr-Semi-Bold, FNPUCG+PlexAr-Medium, HIRYNU+PlexAr-Bold, NETSUB+PlexMono, TFCPFR+PlexAr, WDHEQY+PlexMono-Bold |
| PDF font embedding | PASS — all 6 subsets embedded, no substitution |
| TOC (PDF) | PASS — generated with `target-counter`, so page numbers are computed from the final laid-out pages, not typed by hand |
| TOC links (PDF) | PASS — 546 internal link annotations, every one resolving to a page inside the document |
| TOC (DOCX) | NOT TESTED as page numbers — a live Word `TOC` field is inserted; Word or LibreOffice fills it when fields are updated (F9). Static page numbers were deliberately not baked in, because DOCX pagination differs from the PDF. |
| Selectable text | PASS — every content page carries a real text layer; no page is an image |
| Searchable text | PASS — 124/124 sampled Arabic words found by PDF search across the whole document |
| Copy test | PASS — all 1602 distinct Arabic words of the canonical source were found in the extracted text layer; sampled from the beginning, middle and end of the document, and from prompt boxes |
| Mobile readability | PASS with a note — body text is 11.7pt on A4 with 1.95 line height, headings 15pt+, prompt boxes 10.4pt. Pages were re-rendered at 390px width (phone class) and checked: headings, prompt boxes and code are legible without zoom; body text is comfortable after light zoom, which is inherent to any A4 page on a phone. |
| Cover | PASS with a documented deviation — see Known limitations |
| Copyright page | PASS — a dedicated `حقوق النشر` page naming برومبتات عربية and https://t.me/PromptsArabic |
| Footer copyright | PASS — every page footer carries `PromptsArabic · t.me/PromptsArabic` plus the page number |
| Telegram link present | PASS — appears 46 times in the PDF text layer and 3 times in the DOCX |
| Telegram link clickable | PASS — 2 URI link annotations resolving to https://t.me/PromptsArabic, read back from the saved PDF |
| Owner name present | PASS — 5 times in the PDF, 5 times in the DOCX |
| Empty pages | PASS — none |
| Overflow / clipping | PASS — no text block falls outside the safe area on any page |
| Pages visually inspected | 44/44 PDF pages and 40/40 DOCX pages — every page was rendered to PNG and reviewed as a contact sheet, with individual pages opened at full size |
| DOCX editability | PASS — real named paragraph styles (APL Body, APL Bullet, APL Callout, APL Caption, APL H1, APL H2, APL H3, APL Lead, APL Prompt, APL PromptLbl, APL Subtitle, APL Title) rather than per-paragraph manual formatting |
| Critical remaining | 0 |
| Major remaining | 0 |
| Ready | YES |

## Issues discovered and fixed during the build

- Chromium was rejected as the PDF engine: it maps shaped Arabic glyphs back to Unicode Presentation Forms, so copied text was not real Arabic. Rebuilt on WeasyPrint, which maps to base letters.
- IBM Plex Sans Arabic puts 241 ligatures in the required rlig feature, not only lam-alef. Each rendered one glyph mapped to two characters in logical order inside an otherwise visual-order run, so 14 of 24 sampled words were unsearchable and العربي copied as العريب. Fixed by rewriting the ToUnicode CMap of every multi-character Arabic mapping; the sample went from 14 failures to 0.
- The table of contents used a CSS float for page numbers, which printed one number outside the left margin. Rebuilt as a flex row with leader dots and target-counter.
- Arabic ready-to-copy prompts were rendered inside LTR code blocks, which reversed their variables. A dedicated RTL prompt-box block type was added; code blocks are now reserved for terminal and source code.
- Combining Arabic marks (shadda and harakat) share the x-position of their base letter, so words carrying them could not be found by search. The engine now strips tashkeel at build time, and words whose unvocalised form would be ambiguous were rewritten.
- Lines ending with a variable had the closing bracket relocated on copy; the build now moves a trailing variable onto its own line and strips punctuation after a closing bracket.
- Digits inside variables broke bracket order; replaced with Arabic ordinals, and a QA gate now rejects any variable containing digits.
- A malformed callout (a string where a list was expected) rendered one Arabic letter per line across two pages. The engine now validates every block and fails the build instead.
- Word could not be rendered at first: LibreOffice Writer was missing, and WordprocessingML children were appended in the wrong schema order. Both fixed; every DOCX page was then inspected.
- Cover v1 clipped its first promise chip past the right page edge and left a hollow middle. Redesigned: chips no longer use flex, and a contents strip fills the middle band.
- Front matter spilled four lines onto a near-empty page. Split into two intentional pages: عن هذا الدليل and قبل أن تبدأ.
- Body type raised from 11.2pt to 11.7pt after the phone-width render showed body text was tighter than the mobile-first goal.

## Known limitations

- **Cover updated to the owner's photographic artwork.** The cover supplied by the owner replaces the editorial vector cover this build originally shipped. It is placed full-bleed on page 1 of both files at exactly A4 (210 × 297 mm) with no page margin and no footer over the artwork. Nothing else changed: page order, page numbers, page counts, the copyright page, the footer on every following page and all internal content are identical to the verified build. Checked after replacement: the artwork renders on page 1, the title is legible, the copyright page is intact on page 2, both files open, and the tested https://t.me/PromptsArabic link annotation is unchanged.
- **DOCX table of contents shows page numbers only after a field update.** The file carries a live Word TOC field; pressing F9 in Word fills it. This is intentional: hard-coding PDF page numbers into the DOCX would be wrong, because Word repaginates.
- **Full-line copy order in non-bidi-aware extractors.** The PDF stores RTL runs in visual order, as every PDF does. Word-level and variable-level copy and search were tested and pass. A line that mixes Arabic with Western digits can come back with the digit run repositioned when pulled through a text extractor that does not implement the Unicode Bidi Algorithm; readers that do implement it reconstruct the line correctly. Line-final punctuation after a variable is removed by the build for this reason.

---

_برومبتات عربية — https://t.me/PromptsArabic_
