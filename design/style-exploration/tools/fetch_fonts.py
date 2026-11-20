"""Download the OFL fonts used by the style exploration mock-ups.

Fonts are not committed (see .gitignore); run this once before rendering.
Usage (from repo root): python design/style-exploration/tools/fetch_fonts.py
"""
import io
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / "fonts"

FONTS = [
    # (local file name, url, member inside zip or None)
    ("ZCOOLKuaiLe-Regular.ttf", "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf", None),
    ("SmileySans-Oblique.ttf", "https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip", "SmileySans-Oblique.ttf"),
    ("fusion-pixel-12px-proportional-zh_hans.ttf", "https://github.com/TakWolf/fusion-pixel-font/releases/download/2026.11.10/fusion-pixel-font-12px-proportional-ttf-v2026.11.10.zip", "fusion-pixel-12px-proportional-zh_hans.ttf"),
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "open-your-mind-style-exploration"})
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()


def main():
    DEST.mkdir(exist_ok=True)
    for name, url, member in FONTS:
        target = DEST / name
        if target.exists():
            print(f"have {name}")
            continue
        data = fetch(url)
        if member:
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                match = [n for n in z.namelist() if n.endswith(member)]
                if not match:
                    raise SystemExit(f"{member} not in {url}: {z.namelist()[:20]}")
                data = z.read(match[0])
        target.write_bytes(data)
        print(f"got  {name} ({len(data) // 1024} KB)")


if __name__ == "__main__":
    main()
