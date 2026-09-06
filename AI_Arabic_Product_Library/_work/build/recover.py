#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rebuild one product's DOCX and PDF with its photographic cover, then run the
limited cover check: page counts unchanged, cover art present on page 1, title
readable, rights link intact, page 2 undamaged. Not a full QA cycle."""
import os, sys, json, importlib
import engine, qa

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.path.join(ROOT, "_work")
sys.path.insert(0, os.path.join(WORK, "products"))

def run(modname):
    d = importlib.import_module(modname).DOC
    folder = os.path.join(ROOT, d["folder"])
    docx_p = os.path.join(folder, d["filestem"] + ".docx")
    pdf_p  = os.path.join(folder, d["filestem"] + ".pdf")
    wdir   = os.path.join(WORK, "render", d["id"])
    before = json.load(open(os.path.join(wdir, "qa.json"), encoding="utf-8"))

    engine.build_docx(d, docx_p)
    engine.build_pdf(d, pdf_p)
    for junk in (pdf_p + ".html",):
        if os.path.exists(junk):
            os.replace(junk, os.path.join(wdir, "page.html"))

    import pymupdf as fitz
    doc = fitz.open(pdf_p)
    out = {"product": d["title"], "id": d["id"]}
    out["pdf_pages"] = doc.page_count
    out["pdf_pages_before"] = before["pdf"]["pages"]
    p0 = doc[0]
    out["cover_images"] = len(p0.get_images(full=True))
    out["cover_text_chars"] = len(p0.get_text().strip())
    out["page2_chars"] = len(doc[1].get_text().strip())
    out["page2_head"] = doc[1].get_text().strip().split("\n")[0]
    out["tg_link_pages"] = [pg.number + 1 for pg in doc
                            for l in pg.get_links()
                            if l.get("uri", "").startswith("https://t.me/PromptsArabic")]
    txt = "".join(pg.get_text() for pg in doc)
    out["owner_mentions"] = txt.count("برومبتات عربية")
    out["tg_text_mentions"] = txt.count("t.me/PromptsArabic")
    png = os.path.join(wdir, "cover_check")
    os.makedirs(png, exist_ok=True)
    for i in (0, 1):
        doc[i].get_pixmap(dpi=110).save(os.path.join(png, "p%02d.png" % (i + 1)))
    doc.close()

    drep = qa.docx_report(docx_p)
    out["docx_issues"] = drep["issues"]
    out["docx_paragraphs_bidi"] = drep["checks"]["paragraphs_with_bidi"]
    out["docx_owner_mentions"] = drep["checks"]["owner_mentions"]
    print(json.dumps(out, ensure_ascii=False))
    return out

if __name__ == "__main__":
    run(sys.argv[1])
