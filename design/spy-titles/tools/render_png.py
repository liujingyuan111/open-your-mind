"""Render every PNG listed in ASSET_MANIFEST.json from its SVG source.

Uses Playwright with the locally installed Microsoft Edge (or Chrome via
--channel chrome). Fonts come from the system: Noto Sans SC must be installed.

Usage (from repo root): python design/spy-titles/tools/render_png.py [--channel msedge]
"""
import argparse
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]


def svg_size(path):
    head = path.read_text(encoding="utf-8")[:400]
    w = re.search(r'width="([\d.]+)"', head)
    h = re.search(r'height="([\d.]+)"', head)
    return int(float(w.group(1))), int(float(h.group(1)))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--channel", default="msedge")
    args = ap.parse_args()
    manifest = json.loads((ROOT / "ASSET_MANIFEST.json").read_text(encoding="utf-8"))
    jobs = [a for a in manifest["assets"] if a["asset_type"] == "export_png"]
    jobs.sort(key=lambda a: a["render"]["after_frames"])
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=args.channel)
        for job in jobs:
            src = ROOT / job["render"]["from"]
            dest = REPO / job["path"]
            dest.parent.mkdir(parents=True, exist_ok=True)
            w, h = svg_size(src)
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=1)
            page.goto(src.as_uri())
            page.evaluate("document.fonts.ready")
            if job["render"]["show"]:
                page.evaluate(f"document.getElementById('{job['render']['show']}').removeAttribute('display')")
            page.screenshot(path=str(dest), omit_background=job["render"]["transparent"], clip={"x": 0, "y": 0, "width": w, "height": h})
            page.close()
            print(f"{dest.relative_to(REPO)}  {w}x{h}")
        browser.close()


if __name__ == "__main__":
    main()
