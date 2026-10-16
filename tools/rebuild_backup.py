#!/usr/bin/env python3
"""Rebuild the backup copy of the book embedded in index.html.

index.html carries the whole book (chapters, characters, timeline, recaps) in
<script id="book-data">, used when loader.js can't fetch the separate files.
This script redoes what loader.js does in the browser and writes the result
back into index.html, so the backup always matches ch01.md … ch20.md and the
JSON files.

    python3 tools/rebuild_backup.py          # update index.html
    python3 tools/rebuild_backup.py --check  # exit 1 if index.html is stale

Files are looked up in chapters/ and data/ first, then at the repo root
(same fallback as loader.js). Keep the parsing below in step with loader.js.
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
BOX = re.compile(r'(<script type="application/json" id="book-data">)(.*?)(</script>)', re.S)
NUMS = "零一二三四五六七八九"
BOOK_KEYS = ["title", "series", "series_no", "desc", "blurb", "epigraph", "foot", "toc_note_extra", "series_nav"]


def find(folder, name):
    for p in (ROOT / folder / name, ROOT / name):
        if p.is_file():
            return p
    return None


def read_json(name):
    p = find("data", name)
    if not p:
        print(f"warning: {name} not found, keeping the embedded copy", file=sys.stderr)
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def cn(n):
    if n < 10:
        return NUMS[n]
    if n < 20:
        return "十" + (NUMS[n % 10] if n % 10 else "")
    return NUMS[n // 10] + "十" + (NUMS[n % 10] if n % 10 else "")


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def count(s):
    return len(re.sub(r"\s", "", s))


def quotes(s):
    """Straight quotes to curly ones, only when they pair up."""
    if s.count('"') % 2:
        return s
    parts = s.split('"')
    s = "".join(p + ("“" if i % 2 == 0 else "”") if i < len(parts) - 1 else p for i, p in enumerate(parts))
    if s.count("'") % 2:
        return s
    parts = s.split("'")
    return "".join(p + ("‘" if i % 2 == 0 else "’") if i < len(parts) - 1 else p for i, p in enumerate(parts))


class Marker:
    """Wraps the first mention of each character in a chapter, like loader.js."""

    def __init__(self, people):
        ms = []
        for p in people or []:
            for m in p.get("mark") or [p["name"]]:
                ms.append((m, p["id"]))
        ms.sort(key=lambda m: -len(m[0]))  # stable, like Array.prototype.sort
        self.ids = {}
        for m, i in ms:
            self.ids[m] = i  # later duplicates win, as in loader.js
        self.re = re.compile("|".join(re.escape(m) for m, _ in ms)) if ms else None

    def __call__(self, text, used):
        s = esc(text)
        if not self.re:
            return s

        def rep(mo):
            m = mo.group(0)
            i = self.ids[m]
            if i in used:
                return m
            used.add(i)
            return f'<b class="rn" data-c="{i}">{m}</b>'

        return self.re.sub(rep, s)


def parse(md):
    md = re.sub(r"\r\n?", "\n", md).lstrip("﻿")
    lines = [x.strip() for x in md.split("\n")]
    lines = [x for x in lines if x]
    head = ""
    if lines and re.match(r"^#+\s", lines[0]):
        head = re.sub(r"^#+\s*", "", lines.pop(0)).strip()
    m = re.match(r"^第(.+?)章[\s　]*(.+)$", head)
    return (m.group(2).strip() if m else head), lines


def build(n, md, old, chao, mark):
    title, lines = parse(md)
    used, paras, out, chars = set(), [], [], 0
    for raw in lines:
        if re.fullmatch(r"-{3,}|\*{3,}|\* \* \*", raw):
            out.append('<div class="brk" aria-hidden="true"><i></i><i></i><i></i></div>')
            continue
        t = quotes(raw)
        k = len(paras)
        chars += count(t)
        paras.append(t)
        cls = ' class="chao"' if (raw in chao or t in chao) else ""
        out.append(f'<p{cls} data-p="{k}">{mark(t, used)}</p>')
    return {"n": n, "cn": cn(n), "title": title or (old or {}).get("title", ""), "era": "", "chars": chars,
            "mins": max(1, math.ceil(chars / 400)), "html": "\n".join(out), "paras": paras,
            "recap": (old or {}).get("recap", "")}


def rebuild(D):
    B = read_json("book.json")
    if B:
        for k in BOOK_KEYS:
            if k in B:
                D[k] = B[k]
        if isinstance(B.get("chao"), list):
            D["chao"] = B["chao"]
    chao = set(D.get("chao") or [])
    P = read_json("characters.json")
    if P and P.get("people"):
        D["people"] = P
    T = read_json("timeline.json")
    if T and T.get("events"):
        D["timeline"] = T
    if D.get("timeline") and B and "timeline_lede" in B:
        D["timeline"]["lede"] = B["timeline_lede"]
    R = read_json("recaps.json")
    mark = Marker((D.get("people") or {}).get("people"))
    chapters = []
    for i, old in enumerate(D["chapters"]):
        name = f"ch{i + 1:02d}.md"
        p = find("chapters", name)
        if p:
            c = build(i + 1, p.read_text(encoding="utf-8"), old, chao, mark)
        else:
            print(f"warning: {name} not found, keeping the embedded copy", file=sys.stderr)
            c = old
        if R and str(i + 1) in R:
            c["recap"] = R[str(i + 1)]
        chapters.append(c)
    D["chapters"] = chapters
    D["total"] = sum(c["chars"] for c in chapters)
    return D


def main():
    check = "--check" in sys.argv[1:]
    html = INDEX.read_text(encoding="utf-8")
    m = BOX.search(html)
    if not m:
        sys.exit("index.html: book-data block not found")
    D = rebuild(json.loads(m.group(2)))
    data = json.dumps(D, ensure_ascii=False).replace("</", "<\\/")
    new = html[:m.start(2)] + data + html[m.end(2):]
    if new == html:
        print("index.html backup is up to date")
        return
    if check:
        sys.exit("index.html backup is out of date; run: python3 tools/rebuild_backup.py")
    INDEX.write_text(new, encoding="utf-8")
    print("index.html backup rebuilt")


if __name__ == "__main__":
    main()
