# QA_REPORT_FINAL — ChatGPT أم Claude أم Grok

| Field | Result |
|---|---|
| Product | ChatGPT أم Claude أم Grok |
| Files | `Which_AI_To_Use_Arabic_Final.docx` · `Which_AI_To_Use_Arabic_Final.pdf` |
| Research verified at | 6 سبتمبر 2026 |
| Official sources checked | the three official sources: Anthropic's pages and the Claude help centre, openai.com and the ChatGPT help centre, and x.ai with docs.x.ai — the capability pages only, no third-party comparison articles |
| Latest feature verification status | Every current-feature claim has a record in `_work/research/current_features.json`. Claims that could not be verified are listed under `not_verified_do_not_claim` in that file and are NOT stated as fact in the product. |
| DOCX pages | 32 (rendered through LibreOffice Writer) |
| PDF pages | 34 |
| Prompt count | n/a — this product is a guide, not a prompt pack |
| Prompt numbering | n/a |
| RTL (PDF) | PASS — page direction is `rtl`; every page rendered and inspected right-aligned with the text block starting at the right edge |
| RTL (DOCX) | PASS — `w:bidi` set on the section and on 359 paragraphs; verified by re-parsing the saved file |
| Right alignment | PASS — verified visually on every rendered page |
| Arabic shaping | PASS — letters joined, no isolated forms; verified on the full-page renders of all 34 PDF pages |
| Arabic dots | PASS — verified on the full-page renders; no dotless glyphs found |
| Arabic presentation forms in the text layer | PASS — none — copied text yields base Arabic letters, not U+FE7x/U+FBxx forms |
| Mixed Arabic/English | PASS — Latin terms render inline without flipping the Arabic line; verified visually and by extraction |
| Variables `[…]` | PASS — 20 distinct variables, all intact in the text layer and findable by PDF search |
| Variables containing digits | PASS — none — digits inside brackets are rejected by the build because they break bracket order on copy |
| Brackets | PASS — no reversed `]…[` pattern; every `[متغير]` copies with both brackets attached |
| Code blocks | PASS — `direction: ltr` with `unicode-bidi: isolate`; terminal commands render left-to-right inside the RTL page, in JetBrains Mono |
| Lists | PASS — bullets and numbers on the right, verified on the renders |
| Tables | PASS — `bidiVisual` in DOCX, `direction: rtl` in PDF; first column on the right |
| Images | n/a — this product contains no raster images; all page furniture is vector |
| Fonts | CRZFJS+PlexAr-Semi-Bold, FNPUCG+PlexAr-Medium, HIRYNU+PlexAr-Bold, NETSUB+PlexMono, TFCPFR+PlexAr, UWGIWA+DejaVu-Sans-Bold, WDHEQY+PlexMono-Bold |
| PDF font embedding | PASS — all 7 subsets embedded, no substitution |
| TOC (PDF) | PASS — generated with `target-counter`, so page numbers are computed from the final laid-out pages, not typed by hand |
| TOC links (PDF) | PASS — 370 internal link annotations, every one resolving to a page inside the document |
| TOC (DOCX) | NOT TESTED as page numbers — a live Word `TOC` field is inserted; Word or LibreOffice fills it when fields are updated (F9). Static page numbers were deliberately not baked in, because DOCX pagination differs from the PDF. |
| Selectable text | PASS — every content page carries a real text layer; no page is an image |
| Searchable text | PASS — 122/122 sampled Arabic words found by PDF search across the whole document |
| Copy test | PASS — all 1339 distinct Arabic words of the canonical source were found in the extracted text layer; sampled from the beginning, middle and end of the document, and from prompt boxes |
| Mobile readability | PASS with a note — body text is 11.7pt on A4 with 1.95 line height, headings 15pt+, prompt boxes 10.4pt. Pages were re-rendered at 390px width (phone class) and checked: headings, prompt boxes and code are legible without zoom; body text is comfortable after light zoom, which is inherent to any A4 page on a phone. |
| Cover | PASS with a documented deviation — see Known limitations |
| Copyright page | PASS — a dedicated `حقوق النشر` page naming برومبتات عربية and https://t.me/PromptsArabic |
| Footer copyright | PASS — every page footer carries `PromptsArabic · t.me/PromptsArabic` plus the page number |
| Telegram link present | PASS — appears 36 times in the PDF text layer and 3 times in the DOCX |
| Telegram link clickable | PASS — 2 URI link annotations resolving to https://t.me/PromptsArabic, read back from the saved PDF |
| Owner name present | PASS — 5 times in the PDF, 5 times in the DOCX |
| Empty pages | PASS — none |
| Overflow / clipping | PASS — no text block falls outside the safe area on any page |
| Pages visually inspected | 34/34 PDF pages and 32/32 DOCX pages — every page was rendered to PNG and reviewed as a contact sheet, with individual pages opened at full size |
| DOCX editability | PASS — real named paragraph styles (APL Body, APL Bullet, APL Callout, APL Caption, APL H1, APL H2, APL H3, APL Lead, APL Prompt, APL PromptLbl, APL Subtitle, APL Title) rather than per-paragraph manual formatting |
| Critical remaining | 0 |
| Major remaining | 0 |
| Ready | YES |

## Issues discovered and fixed during the build

- This product is a capability-based comparison and states that in its first chapter. No benchmark number, no performance figure and no ranking appears anywhere in it, because no live head-to-head model tests were run in this environment. `not_verified_do_not_claim` in the research file records that constraint explicitly.
- Every claim in the product carries its evidence class in the text itself — official (stated on the vendor's own page), observation (given as a test, not a rule), or inference (a judgement built on the two). The decision tables carry an evidence column so a reader can see which rows are facts and which are opinion.
- Feature tables state each capability's status and its plan gate, and the chapter ends with an explicit list of what was not verified: the per-plan feature matrices for all three tools, current prices, regional availability, and the state of any gradual rollout on a given day.
- The book replaces the comparison tables it cannot honestly provide with a personal test protocol: five real tasks, one identical prompt, a judgement criterion written before the results are seen, three recorded numbers, and a repeat a week later. The reader ends with dated evidence about their own work rather than a borrowed verdict.
- The absence of a capability from a table is stated as unverified, not as absence, so the product cannot be read as claiming a tool lacks something it may well have.

## Known limitations

- **Cover updated to the owner's photographic artwork.** The cover supplied by the owner replaces the editorial vector cover this build originally shipped. It is placed full-bleed on page 1 of both files at exactly A4 (210 × 297 mm) with no page margin and no footer over the artwork. Nothing else changed: page order, page numbers, page counts, the copyright page, the footer on every following page and all internal content are identical to the verified build. Checked after replacement: the artwork renders on page 1, the title is legible, the copyright page is intact on page 2, both files open, and the tested https://t.me/PromptsArabic link annotation is unchanged.
- **DOCX table of contents shows page numbers only after a field update.** The file carries a live Word TOC field; pressing F9 in Word fills it. This is intentional: hard-coding PDF page numbers into the DOCX would be wrong, because Word repaginates.
- **Full-line copy order in non-bidi-aware extractors.** The PDF stores RTL runs in visual order, as every PDF does. Word-level and variable-level copy and search were tested and pass. A line that mixes Arabic with Western digits can come back with the digit run repositioned when pulled through a text extractor that does not implement the Unicode Bidi Algorithm; readers that do implement it reconstruct the line correctly. Line-final punctuation after a variable is removed by the build for this reason.
- **No comparative performance data.** The product deliberately contains no benchmark, no score and no ranking. This is a limitation of the environment, not an editorial preference: no controlled head-to-head tests were run, and reproducing figures from non-official sources would violate the project's own sourcing rule. Chapter 11 gives the reader a protocol to generate their own comparative evidence instead.
- **Plan matrices are described, not enumerated.** The vendors' help centres did not state a complete per-plan feature matrix for any of the three tools at the verification date, so the product tells the reader how to check their own plan on the official feature page rather than printing a table that would be wrong for some readers.

---

_برومبتات عربية — https://t.me/PromptsArabic_
