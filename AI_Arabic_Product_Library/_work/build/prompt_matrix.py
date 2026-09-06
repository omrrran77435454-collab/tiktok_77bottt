#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Write _work/prompt_matrix_<id>.csv and fail on duplicate prompt functions."""
import os, sys, csv, importlib, difflib
HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.abspath(os.path.join(HERE, ".."))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(WORK, "products"))

def build(modname):
    mod = importlib.import_module(modname); D = mod.DOC
    rows = []
    for ch in D["chapters"]:
        for b in ch["blocks"]:
            if b[0] == "prompt":
                p = b[1]
                rows.append({
                    "number": p["n"], "title": p["title"],
                    "purpose": p["gives"],
                    "inputs": " | ".join(p.get("inputs", [])),
                    "outputs": p["output"],
                    "category": p["category"],
                    "platform": D["platform"],
                })
    out = os.path.join(WORK, "prompt_matrix_%s.csv" % D["id"])
    with open(out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["number", "title", "purpose", "inputs",
                                          "outputs", "category", "platform"])
        w.writeheader(); w.writerows(rows)

    nums = [r["number"] for r in rows]
    problems = []
    if nums != list(range(1, len(nums) + 1)):
        problems.append("numbering is not sequential 1..%d" % len(nums))
    # function-overlap check: title + purpose describe what the prompt DOES
    sig = {r["number"]: (r["title"] + " " + r["purpose"]) for r in rows}
    near = []
    for i in nums:
        for j in nums:
            if i < j:
                s = difflib.SequenceMatcher(None, sig[i], sig[j]).ratio()
                if s > 0.62:
                    near.append((i, j, round(s, 2)))
    if near:
        problems.append("prompt pairs with overlapping function: %s" % near)
    print("wrote %s | %d prompts | %d categories" %
          (os.path.basename(out), len(rows), len({r["category"] for r in rows})))
    for p in problems:
        print("  ISSUE:", p)
    return problems

if __name__ == "__main__":
    sys.exit(1 if build(sys.argv[1]) else 0)
