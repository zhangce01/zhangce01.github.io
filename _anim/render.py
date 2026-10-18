"""Render the teaser animations in _anim/src/*.html to MP4 + poster stills.

    python _anim/render.py                 # every animation, both themes
    python _anim/render.py lens degf       # just these
    python _anim/render.py lens --sheet    # contact sheet only (fast review)
    python _anim/render.py lens --still 6.5
    python _anim/render.py --hd-only       # just the lightbox versions

Outputs (both themes):
    assets/teasers/<slug>-light.mp4, <slug>-dark.mp4        720x450, 30 fps, H.264
    assets/teasers/<slug>-light-hd.mp4, <slug>-dark-hd.mp4  1440x900, 60 fps (click-to-enlarge)
    assets/teasers/<slug>-light.webp, <slug>-dark.webp      poster frame

Needs: pip install playwright imageio-ffmpeg pillow  (uses the installed Chrome,
so no `playwright install` download is required).
"""
import argparse
import base64
import io
import pathlib
import subprocess
import sys

import imageio_ffmpeg
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT.parent / "assets" / "teasers"
REVIEW = ROOT / "review"          # contact sheets / stills (gitignored)
W, H, SCALE, FPS = 480, 300, 1.5, 30
HD_SCALE, HD_FPS = 3.0, 60       # lightbox version (assets/js/teaserzoom.js)
THEMES = ("light", "dark")


def open_page(browser, slug, theme, scale=SCALE):
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=scale)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: m.type == "error" and errors.append(m.text))
    page.goto((SRC / f"{slug}.html").as_uri() + f"?render&theme={theme}")
    page.wait_for_function("window.__ready === true", timeout=20000)
    if errors:
        raise RuntimeError(f"{slug} [{theme}]: " + " | ".join(errors))
    cdp = page.context.new_cdp_session(page)
    return page, cdp


def grab(page, cdp, t, scale=SCALE):
    # seek, then wait two animation frames so Chrome has painted the new state
    # (capturing straight away occasionally grabs a frame with elements missing)
    page.evaluate("t => new Promise(r => { window.__seek(t); "
                  "requestAnimationFrame(() => requestAnimationFrame(r)); })", t)
    shot = cdp.send("Page.captureScreenshot", {
        "format": "png", "optimizeForSpeed": True, "captureBeyondViewport": True,
        "clip": {"x": 0, "y": 0, "width": W, "height": H, "scale": scale},
    })
    return base64.b64decode(shot["data"])


def encode(page, cdp, dest, scale=SCALE, fps=FPS, crf=27):
    duration = page.evaluate("window.__duration")
    n = round(duration * fps)
    cmd = [
        imageio_ffmpeg.get_ffmpeg_exe(), "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", str(fps), "-c:v", "png", "-i", "-",
        "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
        "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-tune", "animation",
        "-x264-params", f"keyint={2 * fps}:min-keyint={fps}",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-movflags", "+faststart", "-an", str(dest),
    ]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for i in range(n):
        ff.stdin.write(grab(page, cdp, i / fps, scale))
    ff.stdin.close()
    if ff.wait() != 0:
        raise RuntimeError(f"ffmpeg failed for {dest}")


def poster(page, cdp, dest):
    t = page.evaluate("window.__poster")
    Image.open(io.BytesIO(grab(page, cdp, t))).convert("RGB").save(dest, "WEBP", quality=82, method=6)


def sheet(page, cdp, dest, cols=4, rows=3):
    duration = page.evaluate("window.__duration")
    k = cols * rows
    ts = [duration * (i + 0.5) / k for i in range(k)]
    tw, th = W, H
    img = Image.new("RGB", (tw * cols, th * rows), "white")
    for j, t in enumerate(ts):
        fr = Image.open(io.BytesIO(grab(page, cdp, t))).convert("RGB").resize((tw, th), Image.LANCZOS)
        img.paste(fr, ((j % cols) * tw, (j // cols) * th))
    img.save(dest)
    return ts


def main():
    sys.stdout.reconfigure(encoding="utf-8")      # repo path may contain non-ASCII
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--sheet", action="store_true", help="contact sheet only")
    ap.add_argument("--still", type=float, help="single full-res still at this time")
    ap.add_argument("--theme", choices=THEMES, help="only this theme")
    ap.add_argument("--hd-only", action="store_true", help="only the 1440x900 / 60 fps lightbox MP4s")
    a = ap.parse_args()

    slugs = a.slugs or sorted(p.stem for p in SRC.glob("*.html"))
    themes = [a.theme] if a.theme else list(THEMES)
    OUT.mkdir(parents=True, exist_ok=True)
    REVIEW.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome")
        for slug in slugs:
            for theme in themes:
                if not a.hd_only:
                    page, cdp = open_page(browser, slug, theme)
                    if a.sheet:
                        ts = sheet(page, cdp, REVIEW / f"{slug}-{theme}-sheet.png")
                        print(f"{slug} [{theme}] sheet @ " + ", ".join(f"{t:.1f}" for t in ts))
                    elif a.still is not None:
                        dest = REVIEW / f"{slug}-{theme}-{a.still:.1f}.png"
                        dest.write_bytes(grab(page, cdp, a.still))
                        print(dest)
                    else:
                        mp4 = OUT / f"{slug}-{theme}.mp4"
                        encode(page, cdp, mp4)
                        poster(page, cdp, OUT / f"{slug}-{theme}.webp")
                        print(f"{slug} [{theme}] {mp4.stat().st_size / 1024:.0f} KB")
                    page.close()
                if not (a.sheet or a.still is not None):
                    page, cdp = open_page(browser, slug, theme, HD_SCALE)
                    hd = OUT / f"{slug}-{theme}-hd.mp4"
                    encode(page, cdp, hd, HD_SCALE, HD_FPS, crf=26)
                    print(f"{slug} [{theme}] HD {hd.stat().st_size / 1024:.0f} KB")
                    page.close()
        browser.close()


if __name__ == "__main__":
    sys.exit(main())
