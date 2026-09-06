#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build one product end to end:
  canonical source -> DOCX + PDF -> render every page -> automated QA -> report

usage:  python3 make.py <product_module>
"""
import os, sys, json, glob, shutil, subprocess, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
WORK = os.path.join(ROOT, "_work")
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(WORK, "products"))

import engine, qa


def build(modname):
    mod = importlib.import_module(modname)
    D = mod.DOC
    folder = os.path.join(ROOT, D["folder"])
    os.makedirs(folder, exist_ok=True)
    stem = D["filestem"]
    docx_p = os.path.join(folder, stem + ".docx")
    pdf_p = os.path.join(folder, stem + ".pdf")

    wdir = os.path.join(WORK, "render", D["id"])
    os.makedirs(wdir, exist_ok=True)
    canon = os.path.join(wdir, "canonical.txt")

    engine.dump_canonical(D, canon)
    engine.build_docx(D, docx_p)
    engine.build_pdf(D, pdf_p)
    if os.path.exists(pdf_p + ".html"):
        shutil.move(pdf_p + ".html", os.path.join(wdir, "page.html"))

    # --- render PDF pages ---
    png = os.path.join(wdir, "pdf_png")
    for f in glob.glob(os.path.join(png, "*.png")):
        os.remove(f)
    rep = qa.pdf_report(pdf_p, canon, png)
    qa.contact_sheet(png, os.path.join(wdir, "pdf_contact.png"), cols=6, thumb_w=260)

    # --- render DOCX pages through LibreOffice ---
    drep = qa.docx_report(docx_p)
    lo = os.path.join(wdir, "docx_pdf")
    os.makedirs(lo, exist_ok=True)
    for f in glob.glob(os.path.join(lo, "*")):
        os.remove(f)
    subprocess.run(["soffice", "--headless", "--convert-to", "pdf",
                    "--outdir", lo, docx_p],
                   capture_output=True, timeout=900)
    dpng = os.path.join(wdir, "docx_png")
    for f in glob.glob(os.path.join(dpng, "*.png")):
        os.remove(f)
    os.makedirs(dpng, exist_ok=True)
    lopdf = glob.glob(os.path.join(lo, "*.pdf"))
    if lopdf:
        import pymupdf
        dd = pymupdf.open(lopdf[0])
        drep["checks"]["rendered_pages"] = len(dd)
        for i, p in enumerate(dd, 1):
            p.get_pixmap(dpi=105).save(os.path.join(dpng, "p%03d.png" % i))
        dd.close()
        qa.contact_sheet(dpng, os.path.join(wdir, "docx_contact.png"), cols=6, thumb_w=260)
    else:
        drep["issues"].append(("CRITICAL", "DOCX could not be rendered by LibreOffice"))

    out = {"product": D["title"], "id": D["id"], "pdf": rep, "docx": drep,
           "prompt_numbers": engine.count_prompts(D)}
    with open(os.path.join(wdir, "qa.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)

    print("== %s ==" % D["title"])
    print("PDF pages: %d   DOCX pages: %s" % (rep["pages"], drep["checks"].get("rendered_pages")))
    crit = [i for i in rep["issues"] + drep["issues"] if i[0] == "CRITICAL"]
    majo = [i for i in rep["issues"] + drep["issues"] if i[0] == "MAJOR"]
    print("CRITICAL: %d   MAJOR: %d" % (len(crit), len(majo)))
    for lvl, msg in rep["issues"] + drep["issues"]:
        print("  [%s] %s" % (lvl, msg))
    return out


if __name__ == "__main__":
    build(sys.argv[1])
