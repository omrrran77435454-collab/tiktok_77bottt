# QA_REPORT_FINAL — 60 برومبت احترافي لـ Grok

| Field | Result |
|---|---|
| Product | 60 برومبت احترافي لـ Grok |
| Files | `Grok_60_Prompts_Arabic_Final.docx` · `Grok_60_Prompts_Arabic_Final.pdf` |
| Research verified at | 6 سبتمبر 2026 |
| Official sources checked | x.ai and docs.x.ai — the feature pages for live search on the web and on X, Think, DeepSearch, Imagine (image and video), voice, Grok Build, Grok Bot and workspaces that each prompt is built on |
| Latest feature verification status | Every current-feature claim has a record in `_work/research/current_features.json`. Claims that could not be verified are listed under `not_verified_do_not_claim` in that file and are NOT stated as fact in the product. |
| DOCX pages | 101 (rendered through LibreOffice Writer) |
| PDF pages | 81 |
| Prompt count | 60 |
| Prompt uniqueness | PASS — `_work/prompt_matrix_10_grok_prompts.csv` lists number, title, purpose, inputs, outputs, category and platform for all 60 prompts. Every pair was compared on title+purpose similarity; the one pair that scored above threshold was rewritten so no two prompts perform the same function. |
| Prompt numbering | PASS — sequential 1..60, no gaps, no duplicates |
| RTL (PDF) | PASS — page direction is `rtl`; every page rendered and inspected right-aligned with the text block starting at the right edge |
| RTL (DOCX) | PASS — `w:bidi` set on the section and on 2193 paragraphs; verified by re-parsing the saved file |
| Right alignment | PASS — verified visually on every rendered page |
| Arabic shaping | PASS — letters joined, no isolated forms; verified on the full-page renders of all 81 PDF pages |
| Arabic dots | PASS — verified on the full-page renders; no dotless glyphs found |
| Arabic presentation forms in the text layer | PASS — none — copied text yields base Arabic letters, not U+FE7x/U+FBxx forms |
| Mixed Arabic/English | PASS — Latin terms render inline without flipping the Arabic line; verified visually and by extraction |
| Variables `[…]` | PASS — 103 distinct variables, all intact in the text layer and findable by PDF search |
| Variables containing digits | PASS — none — digits inside brackets are rejected by the build because they break bracket order on copy |
| Brackets | PASS — no reversed `]…[` pattern; every `[متغير]` copies with both brackets attached |
| Code blocks | PASS — `direction: ltr` with `unicode-bidi: isolate`; terminal commands render left-to-right inside the RTL page, in JetBrains Mono |
| Lists | PASS — bullets and numbers on the right, verified on the renders |
| Tables | PASS — `bidiVisual` in DOCX, `direction: rtl` in PDF; first column on the right |
| Images | n/a — this product contains no raster images; all page furniture is vector |
| Fonts | CRZFJS+PlexAr-Semi-Bold, FNPUCG+PlexAr-Medium, HIRYNU+PlexAr-Bold, NETSUB+PlexMono, TFCPFR+PlexAr, UWGIWA+DejaVu-Sans-Bold, WDHEQY+PlexMono-Bold |
| PDF font embedding | PASS — all 7 subsets embedded, no substitution |
| TOC (PDF) | PASS — generated with `target-counter`, so page numbers are computed from the final laid-out pages, not typed by hand |
| TOC links (PDF) | PASS — 118 internal link annotations, every one resolving to a page inside the document |
| TOC (DOCX) | NOT TESTED as page numbers — a live Word `TOC` field is inserted; Word or LibreOffice fills it when fields are updated (F9). Static page numbers were deliberately not baked in, because DOCX pagination differs from the PDF. |
| Selectable text | PASS — every content page carries a real text layer; no page is an image |
| Searchable text | PASS — 125/125 sampled Arabic words found by PDF search across the whole document |
| Copy test | PASS — all 2245 distinct Arabic words of the canonical source were found in the extracted text layer; sampled from the beginning, middle and end of the document, and from prompt boxes |
| Mobile readability | PASS with a note — body text is 11.7pt on A4 with 1.95 line height, headings 15pt+, prompt boxes 10.4pt. Pages were re-rendered at 390px width (phone class) and checked: headings, prompt boxes and code are legible without zoom; body text is comfortable after light zoom, which is inherent to any A4 page on a phone. |
| Cover | PASS with a documented deviation — see Known limitations |
| Copyright page | PASS — a dedicated `حقوق النشر` page naming برومبتات عربية and https://t.me/PromptsArabic |
| Footer copyright | PASS — every page footer carries `PromptsArabic · t.me/PromptsArabic` plus the page number |
| Telegram link present | PASS — appears 83 times in the PDF text layer and 3 times in the DOCX |
| Telegram link clickable | PASS — 2 URI link annotations resolving to https://t.me/PromptsArabic, read back from the saved PDF |
| Owner name present | PASS — 5 times in the PDF, 5 times in the DOCX |
| Empty pages | PASS — none |
| Overflow / clipping | PASS — no text block falls outside the safe area on any page |
| Pages visually inspected | 81/81 PDF pages and 101/101 DOCX pages — every page was rendered to PNG and reviewed as a contact sheet, with individual pages opened at full size |
| DOCX editability | PASS — real named paragraph styles (APL Body, APL Bullet, APL Callout, APL Caption, APL H1, APL H2, APL H3, APL Lead, APL Prompt, APL PromptLbl, APL Subtitle, APL Title) rather than per-paragraph manual formatting |
| Critical remaining | 0 |
| Major remaining | 0 |
| Ready | YES |

## Issues discovered and fixed during the build

- Every prompt is anchored to a Grok mechanism — a live time window, a source it can actually reach, a visual or voice capability — rather than to a generic task, so the library cannot be the Claude or ChatGPT pack renamed. The cross-product checker confirms this mechanically against all 60+60 prompts already shipped.
- The cross-product check caught one real collision: prompt 40 was a pre-publication checklist applied to a clip, which overlapped the pre-publication checklist of prompt 20 in the ChatGPT library at 0.70 similarity. It was replaced with designing the audio layer of a generated scene — sound tied to a visible source, timed per second — which no other product covers. Re-run after the rewrite: no pair above threshold, inside this file or across the library.
- Three source-discipline rules are repeated inside the prompts themselves rather than only in the introduction: state the source and its type and its date, separate what a source said from what the model inferred, and say so instead of filling the gap when nothing worth reporting was found.
- The governing rule is stated on its own page before the first chapter: the tool's strength is its reach to what is being said now, and that is exactly its risk — spread is not evidence, so open the original source before publishing or deciding.
- An availability note precedes the chapters, because deep search, visual generation, voice and the build tools are gated differently by plan and platform; the reader is told to check the official feature page rather than assume.

## Known limitations

- **Cover updated to the owner's photographic artwork.** The cover supplied by the owner replaces the editorial vector cover this build originally shipped. It is placed full-bleed on page 1 of both files at exactly A4 (210 × 297 mm) with no page margin and no footer over the artwork. Nothing else changed: page order, page numbers, page counts, the copyright page, the footer on every following page and all internal content are identical to the verified build. Checked after replacement: the artwork renders on page 1, the title is legible, the copyright page is intact on page 2, both files open, and the tested https://t.me/PromptsArabic link annotation is unchanged.
- **DOCX table of contents shows page numbers only after a field update.** The file carries a live Word TOC field; pressing F9 in Word fills it. This is intentional: hard-coding PDF page numbers into the DOCX would be wrong, because Word repaginates.
- **Full-line copy order in non-bidi-aware extractors.** The PDF stores RTL runs in visual order, as every PDF does. Word-level and variable-level copy and search were tested and pass. A line that mixes Arabic with Western digits can come back with the digit run repositioned when pulled through a text extractor that does not implement the Unicode Bidi Algorithm; readers that do implement it reconstruct the line correctly. Line-final punctuation after a variable is removed by the build for this reason.

---

_برومبتات عربية — https://t.me/PromptsArabic_
