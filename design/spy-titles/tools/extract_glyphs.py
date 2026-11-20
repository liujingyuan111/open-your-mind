"""Extract flattened glyph outlines for the fixed UI labels.

Output: design/spy-titles/src/glyphs.json, consumed by build.mjs, which re-cuts
each outline by hand-cut rules. Only the handful of fixed label characters are
exported, as artwork outlines; the font file itself is never copied.

Usage: python design/spy-titles/tools/extract_glyphs.py [path-to-NotoSansSC-VF.ttf]
"""
import json
import math
import sys
from pathlib import Path

from fontTools.pens.basePen import BasePen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_FONT = Path(r"C:\Windows\Fonts\NotoSansSC-VF.ttf")
WEIGHT = 900
STEP = 55  # font units per facet when flattening curves -> scissor-like facets


class FlatPen(BasePen):
    def __init__(self, glyph_set):
        super().__init__(glyph_set)
        self.contours = []
        self.cur = None

    def _moveTo(self, p):
        self.cur = [p]

    def _lineTo(self, p):
        self.cur.append(p)

    def _curveToOne(self, p1, p2, p3):
        p0 = self._getCurrentPoint()
        length = math.dist(p0, p1) + math.dist(p1, p2) + math.dist(p2, p3)
        n = max(2, math.ceil(length / STEP))
        for i in range(1, n + 1):
            t = i / n
            u = 1 - t
            self.cur.append((
                u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
            ))

    def _qCurveToOne(self, p1, p2):
        p0 = self._getCurrentPoint()
        length = math.dist(p0, p1) + math.dist(p1, p2)
        n = max(2, math.ceil(length / STEP))
        for i in range(1, n + 1):
            t = i / n
            u = 1 - t
            self.cur.append((
                u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
            ))

    def _closePath(self):
        if self.cur:
            if len(self.cur) > 1 and math.dist(self.cur[0], self.cur[-1]) < 0.5:
                self.cur.pop()
            if len(self.cur) > 2:
                self.contours.append(self.cur)
        self.cur = None

    _endPath = _closePath


def label_chars():
    spec = json.loads((ROOT / "src" / "static-labels.json").read_text(encoding="utf-8"))
    modes = json.loads((ROOT.parent / "MODE_ASSETS.json").read_text(encoding="utf-8"))["modes"]
    text = "".join(spec["labels"])
    for mode in modes:
        for field in spec["mode_asset_fields"]:
            text += mode[field]
    return sorted(set(text) - {" "})


def main():
    font_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FONT
    font = TTFont(font_path)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyph_set = font.getGlyphSet(location={"wght": WEIGHT})
    out = {}
    for ch in label_chars():
        name = cmap.get(ord(ch))
        if name is None:
            raise SystemExit(f"font has no glyph for {ch!r}")
        pen = FlatPen(glyph_set)
        glyph_set[name].draw(pen)
        out[ch] = {
            "w": round(glyph_set[name].width),
            # y is flipped to SVG's y-down; baseline stays at 0
            "c": [[v for x, y in c for v in (round(x), round(-y))] for c in pen.contours],
        }
    family = font["name"].getDebugName(1)
    result = {
        "source_font": f"{family} (variable, wght={WEIGHT})",
        "font_license": "SIL Open Font License 1.1",
        "upm": upm,
        "glyphs": out,
    }
    dest = ROOT / "src" / "glyphs.json"
    dest.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{len(out)} glyphs -> {dest.relative_to(ROOT.parents[1])}")


if __name__ == "__main__":
    main()
