"""Static checks for the spy-titles asset set.

Covers what can be automated from VISUAL_CONTRACT.md / ASSET_PIPELINE.md:
four-ink palette (+ declared prop variants), no gradient elements, viewBox,
size budgets, manifest completeness, MODE_ASSETS references, PNG dimensions
and glyph coverage. Paper feel, legibility and composition remain manual review.

Usage (from repo root): python design/spy-titles/tools/check_assets.py
"""
import json
import re
import struct
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
ASSET_DIRS = ["masters", "icons", "patterns", "proposal", "export"]
REQUIRED = ["asset_id", "path", "asset_type", "source", "author_or_model", "license", "created_at", "version", "used_by", "notes"]
BUDGET_KB = {"icon": 60, "pattern": 60, "texture": 200, "master": 350, "proposal": 600, "board": 600, "export_png": 2500}
COLOR_ATTRS = ["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"]
FORBIDDEN_TAGS = {"linearGradient", "radialGradient", "meshgradient", "meshGradient"}

errors = []


def fail(msg):
    errors.append(msg)


def local(tag):
    return tag.rsplit("}", 1)[-1]


def png_size(path):
    with path.open("rb") as fh:
        head = fh.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    return struct.unpack(">II", head[16:24])


def main():
    mode_assets = json.loads((REPO / "design" / "MODE_ASSETS.json").read_text(encoding="utf-8"))
    shared = mode_assets["shared"]
    allowed = {v["hex"].lower() for v in shared["palette"].values()}
    allowed |= {v["hex"].lower() for v in shared["prop_variants"].values()}
    manifest = json.loads((ROOT / "ASSET_MANIFEST.json").read_text(encoding="utf-8"))["assets"]
    by_path = {a["path"]: a for a in manifest}

    for a in manifest:
        for key in REQUIRED:
            if a.get(key) in (None, "", []):
                fail(f"{a.get('path')}: manifest field '{key}' is empty")
        if not (REPO / a["path"]).is_file():
            fail(f"{a['path']}: listed in manifest but missing")

    on_disk = {p.relative_to(REPO).as_posix() for d in ASSET_DIRS for p in (ROOT / d).rglob("*") if p.is_file()}
    for p in sorted(on_disk - set(by_path)):
        fail(f"{p}: file not registered in ASSET_MANIFEST.json")

    svg_count = 0
    for a in manifest:
        path = REPO / a["path"]
        if not path.is_file():
            continue
        kb = path.stat().st_size / 1024
        budget = BUDGET_KB.get(a["asset_type"])
        if budget and kb > budget:
            fail(f"{a['path']}: {kb:.0f} KB exceeds {budget} KB budget for {a['asset_type']}")
        if path.suffix == ".svg":
            svg_count += 1
            root = ET.parse(path).getroot()
            if local(root.tag) != "svg" or not root.get("viewBox"):
                fail(f"{a['path']}: root <svg> without viewBox")
            for el in root.iter():
                tag = local(el.tag)
                if tag in FORBIDDEN_TAGS:
                    fail(f"{a['path']}: gradient element <{tag}> is forbidden")
                if tag == "image" and a["asset_type"] != "board":
                    fail(f"{a['path']}: embedded <image> only allowed on review boards")
                values = [el.get(k) for k in COLOR_ATTRS if el.get(k)]
                style = el.get("style") or ""
                values += re.findall(r"(?:fill|stroke|color)\s*:\s*([^;]+)", style)
                for v in values:
                    v = v.strip().lower()
                    if v in ("none", "transparent", "currentcolor") or v.startswith("url("):
                        continue
                    if v not in allowed:
                        fail(f"{a['path']}: colour {v} on <{tag}> is outside the four inks + prop variants")
        elif path.suffix == ".png":
            src = ROOT / a["render"]["from"]
            head = src.read_text(encoding="utf-8")[:400]
            w = int(float(re.search(r'width="([\d.]+)"', head).group(1)))
            h = int(float(re.search(r'height="([\d.]+)"', head).group(1)))
            if png_size(path) != (w, h):
                fail(f"{a['path']}: PNG is {png_size(path)}, source SVG is {(w, h)}")

    asset_root = REPO / shared["asset_root"]
    for key in ["card_shell", "cut_edge", "paper_seam", "paper_shadow", "paper_texture", "paper_texture_tile", "task_mark"]:
        if not (asset_root / shared[key]).is_file():
            fail(f"MODE_ASSETS shared.{key} -> {shared[key]} missing")
    for mode in mode_assets["modes"]:
        for key in ["icon_asset", "pattern_asset"]:
            if not (asset_root / mode[key]).is_file():
                fail(f"MODE_ASSETS {mode['mode_id']}.{key} -> {mode[key]} missing")
        for key in ["ground_role", "accent_role"]:
            if mode[key] not in shared["palette"]:
                fail(f"MODE_ASSETS {mode['mode_id']}.{key} '{mode[key]}' is not a palette role")
        if mode["ground_role"] not in shared["prop_variants"]:
            fail(f"MODE_ASSETS {mode['mode_id']}: no prop variant for ground '{mode['ground_role']}'")

    labels = json.loads((ROOT / "src" / "static-labels.json").read_text(encoding="utf-8"))
    glyphs = json.loads((ROOT / "src" / "glyphs.json").read_text(encoding="utf-8"))["glyphs"]
    text = "".join(labels["labels"]) + "".join(m[f] for m in mode_assets["modes"] for f in labels["mode_asset_fields"])
    for ch in sorted(set(text) - {" "}):
        if ch not in glyphs:
            fail(f"glyph '{ch}' missing from src/glyphs.json - rerun tools/extract_glyphs.py")

    print(f"checked {len(manifest)} manifest entries, {svg_count} SVG, {len(on_disk)} files on disk")
    if errors:
        print(f"{len(errors)} problem(s):")
        for e in errors:
            print(" -", e)
        sys.exit(1)
    print("all asset checks passed")


if __name__ == "__main__":
    main()
