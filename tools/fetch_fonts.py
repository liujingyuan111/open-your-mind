"""Download the OFL font used by the sketch (B) theme mock-up.

Fonts are not committed (see .gitignore); run once before the H5 preview.
Usage (from repo root): python tools/fetch_fonts.py
"""
import urllib.request
from pathlib import Path

DEST = Path(__file__).resolve().parents[1] / "assets" / "fonts"

FONTS = [
    ("ZCOOLKuaiLe-Regular.ttf",
     "https://raw.githubusercontent.com/google/fonts/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf"),
]


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    for name, url in FONTS:
        target = DEST / name
        if target.exists():
            print(f"have {name}")
            continue
        req = urllib.request.Request(url, headers={"User-Agent": "open-your-mind-round-themes"})
        with urllib.request.urlopen(req, timeout=120) as res:
            data = res.read()
        target.write_bytes(data)
        print(f"got  {name} ({len(data) // 1024} KB)")


if __name__ == "__main__":
    main()
