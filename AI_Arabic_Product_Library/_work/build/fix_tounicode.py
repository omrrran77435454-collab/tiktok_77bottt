#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Repair Arabic copy/search fidelity in a WeasyPrint PDF.

Why this is needed
------------------
IBM Plex Sans Arabic puts 241 ligature substitutions in the *required* `rlig`
feature — not only the mandatory lam-alef, but pairs such as "بي" and "سر".
Each of those renders as ONE glyph, and the PDF maps that glyph back to TWO
characters in logical order, while the rest of the RTL run is stored in visual
order. Readers rebuild an RTL run by reversing it character by character, so the
two characters inside the ligature come out swapped: العربي is copied as العريب,
and searching for the word fails.

The fix
-------
Reverse the character sequence of every multi-character ToUnicode mapping whose
codes are all Arabic. After the reversal, a character-level reversal of the
visual run reproduces the exact logical text, so copy, search and extraction all
return the canonical string.

Applied to the final PDF only; the rendered glyphs are untouched, so nothing
about the page image changes.
"""

import re, sys
import pymupdf

ARABIC = lambda c: (0x0600 <= c <= 0x06FF) or (0x0750 <= c <= 0x077F) \
                   or (0xFB50 <= c <= 0xFDFF) or (0xFE70 <= c <= 0xFEFF)

BFCHAR = re.compile(rb"beginbfchar(.*?)endbfchar", re.S)
BFRANGE = re.compile(rb"beginbfrange(.*?)endbfrange", re.S)
PAIR = re.compile(rb"<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>")


def _flip(dst_hex: bytes) -> bytes:
    """Reverse a UTF-16BE sequence of 2+ Arabic units; leave anything else alone."""
    s = dst_hex.decode("ascii")
    if len(s) % 4 or len(s) <= 4:
        return dst_hex
    units = [int(s[i:i + 4], 16) for i in range(0, len(s), 4)]
    if any(0xD800 <= u <= 0xDFFF for u in units):      # surrogate pair — not a ligature
        return dst_hex
    if not all(ARABIC(u) for u in units):
        return dst_hex
    return ("".join("%04X" % u for u in reversed(units))).encode("ascii")


def _patch_cmap(data: bytes):
    changed = [0]

    def do_block(m, kind):
        body = m.group(1)

        def rep(pm):
            src, dst = pm.group(1), pm.group(2)
            new = _flip(dst)
            if new != dst:
                changed[0] += 1
                return b"<" + src + b"> <" + new + b">"
            return pm.group(0)

        return (b"begin" + kind + body_sub(body, rep) + b"end" + kind)

    def body_sub(body, rep):
        return PAIR.sub(rep, body)

    data = BFCHAR.sub(lambda m: do_block(m, b"bfchar"), data)
    # bfrange with <src><srcEnd><dst> triples is not produced by WeasyPrint for
    # these fonts; a two-token bfrange entry is handled the same way as bfchar.
    data = BFRANGE.sub(lambda m: do_block(m, b"bfrange"), data)
    return data, changed[0]


def fix(path: str, out_path: str = None) -> int:
    doc = pymupdf.open(path)
    total = 0
    seen = set()
    for xref in range(1, doc.xref_length()):
        try:
            if doc.xref_get_key(xref, "Type")[1] != "/Font":
                continue
            kind, val = doc.xref_get_key(xref, "ToUnicode")
        except Exception:
            continue
        if kind != "xref":
            continue
        tu = int(val.split()[0])
        if tu in seen:
            continue
        seen.add(tu)
        try:
            data = doc.xref_stream(tu)
        except Exception:
            continue
        if not data or b"beginbf" not in data:
            continue
        new, n = _patch_cmap(data)
        if n:
            doc.update_stream(tu, new)
            total += n
    doc.save(out_path or path, incremental=(out_path is None),
             encryption=pymupdf.PDF_ENCRYPT_KEEP)
    doc.close()
    return total


if __name__ == "__main__":
    print("reordered mappings:", fix(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else None))
