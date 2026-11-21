"""Screenshot the A/B round-screen themes from the H5 build.

Usage: python tools/preview_ab.py [port]
Requires: npm run build:h5 first; playwright + local Microsoft Edge.
Outputs: docs/screenshots/ab/{theme}-{scenario}.png
"""
import functools
import http.server
import socketserver
import sys
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist" / "build" / "h5"
OUT = ROOT / "docs" / "screenshots" / "ab"
SEED = 65  # deals the 15-char answer first in both modes (see tests/seeded-random.test.mjs)

SCENARIOS = ["ready", "verbal-long", "charades-long", "last-call"]


def serve(port):
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(DIST))
    with socketserver.TCPServer(("127.0.0.1", port), handler) as httpd:
        httpd.serve_forever()


def shoot(page, theme, scenario, port):
    page.goto(f"http://127.0.0.1:{port}/#/pages/round/index?theme={theme}&seed={SEED}")
    page.reload()  # hash-only navigation would keep the previous scenario's round state
    page.wait_for_timeout(900)
    if scenario != "ready":
        if scenario.startswith("charades"):
            page.click("text=动作表演")
            page.wait_for_timeout(300)
        page.click("text=开始回合")
        page.wait_for_timeout(700)
        if scenario == "last-call":
            page.evaluate("window.__timeOffset = 53000")
            page.wait_for_timeout(500)
    OUT.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(OUT / f"{theme}-{scenario}.png"))
    print(f"shot {theme}-{scenario}")


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4517
    if not DIST.exists():
        raise SystemExit("dist/build/h5 missing; run npm run build:h5 first")
    fonts_src = ROOT / "assets" / "fonts"
    if fonts_src.exists():
        (DIST / "static" / "fonts").mkdir(parents=True, exist_ok=True)
        for ttf in fonts_src.glob("*.ttf"):
            (DIST / "static" / "fonts" / ttf.name).write_bytes(ttf.read_bytes())
    threading.Thread(target=serve, args=(port,), daemon=True).start()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        # local-round captures Date.now by reference at round creation; wrap it before page scripts run
        page.add_init_script("window.__timeOffset = 0; const real = Date.now.bind(Date); Date.now = () => real() + window.__timeOffset;")
        for theme in ["spy-light", "sketch"]:
            for scenario in SCENARIOS:
                shoot(page, theme, scenario, port)
        browser.close()


if __name__ == "__main__":
    main()
