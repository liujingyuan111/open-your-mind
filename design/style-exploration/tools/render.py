"""Render every style-exploration frame to PNG and build the comparison board.

Usage (from repo root): python design/style-exploration/tools/render.py
Requires fonts from tools/fetch_fonts.py and a local Microsoft Edge.
"""
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
OUT = ROOT / "export"
THEMES = [("sketch", "1 · 手账便签"), ("brutal", "2 · 新粗野主义"), ("win", "3 · Win98 画图"), ("riso", "4 · Riso 报纸拼贴")]
SCREENS = [("verbal", "口头描述 · 15 字长答案 · 语音"), ("charades", "动作表演 · 剩余 8 秒"), ("draw", "你画我猜 · 画手视角")]
BASELINE_BRANCH = "origin/design/spy-titles-round-screen"
BASELINE = [("round-verbal-long", "verbal"), ("round-charades-last-call", "charades")]


def baseline_pngs():
    """Pull candidate A frames from PR #6 for the board, without committing copies."""
    tmp = ROOT / ".baseline"
    tmp.mkdir(exist_ok=True)
    found = {}
    for name, screen in BASELINE:
        dest = tmp / f"{name}.png"
        res = subprocess.run(["git", "-C", str(REPO), "show", f"{BASELINE_BRANCH}:design/spy-titles/export/{name}.png"], capture_output=True)
        if res.returncode == 0:
            dest.write_bytes(res.stdout)
            found[screen] = dest
    return found


def main():
    OUT.mkdir(exist_ok=True)
    page_url = (ROOT / "explore.html").as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge")
        for theme, _ in THEMES:
            for screen, _ in SCREENS:
                page = browser.new_page(viewport={"width": 750, "height": 1624})
                errors = []
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.goto(f"{page_url}?theme={theme}&screen={screen}")
                page.wait_for_function("window.__ready === true", timeout=30000)
                if errors:
                    sys.exit(f"{theme}/{screen}: {errors}")
                dest = OUT / f"{theme}-{screen}.png"
                page.locator(".frame").screenshot(path=str(dest))
                page.close()
                print(dest.relative_to(REPO))

        base = baseline_pngs()
        tw, th, gap, pad, label_w, head = 300, 650, 24, 40, 230, 120
        cols = len(SCREENS)
        rows = [("spy", "A · spy-titles（PR #6，基线）")] + THEMES
        W = pad * 2 + label_w + cols * tw + (cols - 1) * gap
        H = pad * 2 + head + len(rows) * (th + gap)
        cells = []
        for r, (theme, label) in enumerate(rows):
            y = pad + head + r * (th + gap)
            cells.append(f'<div style="position:absolute;left:{pad}px;top:{y + th // 2 - 40}px;width:{label_w - 20}px;font:900 30px \'Noto Sans SC\';color:#f3ead8;line-height:42px">{label}</div>')
            for c, (screen, _) in enumerate(SCREENS):
                x = pad + label_w + c * (tw + gap)
                if theme == "spy":
                    src = base.get(screen)
                    inner = f'<img src="{src.as_uri()}" style="width:{tw}px;height:{th}px">' if src else ""
                    if not src:
                        inner = f'<div style="width:{tw}px;height:{th}px;border:3px dashed #777;color:#999;font:700 26px \'Noto Sans SC\';display:flex;align-items:center;justify-content:center;text-align:center">未做<br>（PR #6 无此屏）</div>'
                else:
                    inner = f'<img src="{(OUT / f"{theme}-{screen}.png").as_uri()}" style="width:{tw}px;height:{th}px">'
                cells.append(f'<div style="position:absolute;left:{x}px;top:{y}px">{inner}</div>')
        for c, (_, label) in enumerate(SCREENS):
            x = pad + label_w + c * (tw + gap)
            cells.append(f'<div style="position:absolute;left:{x}px;top:{pad + 64}px;width:{tw}px;font:700 20px/28px \'Noto Sans SC\';color:#cfc6b4">{label}</div>')
        title = '<div style="position:absolute;left:40px;top:34px;font:900 40px \'Noto Sans SC\';color:#f3ead8">开个脑洞 · 美术风格探索（同一题目 / 规则 / 操作）</div>'
        html = f'<html><body style="margin:0;background:#1b1714"><div style="position:relative;width:{W}px;height:{H}px">{title}{"".join(cells)}</div></body></html>'
        board = ROOT / ".baseline" / "board.html"
        board.write_text(html, encoding="utf-8")
        page = browser.new_page(viewport={"width": W, "height": H})
        page.goto(board.as_uri())
        page.wait_for_load_state("networkidle")
        page.screenshot(path=str(OUT / "comparison-board.png"), full_page=True)
        print((OUT / "comparison-board.png").relative_to(REPO), f"{W}x{H}")
        browser.close()


if __name__ == "__main__":
    main()
