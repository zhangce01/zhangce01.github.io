# Publication teaser animations

Each publication on the homepage shows a ~10 s looping animation (light + dark) instead of a
static figure. The animations are small HTML pages driven by a GSAP timeline;
`render.py` steps the timeline frame by frame in headless Chrome and encodes MP4s.
Jekyll ignores this folder (leading underscore); only the rendered files in
`assets/teasers/` are served.

```
_anim/
  lib/        base.css (palette + components), stage.js (clock, icons), gsap, fonts
  src/        one <slug>.html per paper
  assets/     images used inside the animations, one folder per paper
  render.py   src/<slug>.html  ->  assets/teasers/<slug>-{light,dark}.{mp4,webp}
```

## Render

```bash
pip install playwright imageio-ffmpeg pillow    # uses the installed Chrome
python _anim/render.py lens --sheet             # 12-frame contact sheets -> _anim/review/
python _anim/render.py lens --still 6.5         # one full-res frame
python _anim/render.py lens                     # final MP4 + poster, both themes
python _anim/render.py                          # everything
```

Open `src/<slug>.html` in a browser to watch it loop live; add `?theme=dark` for
the dark palette, `?t=4.2` to freeze on a moment.

Then point the paper at it in `_data/publications.yml`:

```yaml
    teaser: lens
    teaser_alt: "LENS: one sentence describing what the animation shows"
```

The site picks `<slug>-light.mp4` or `<slug>-dark.mp4` to match the day / night
theme (`assets/js/teasers.js`); the `.webp` posters are the still fallback.

## Authoring rules

**Stage.** 480 x 300 CSS px, rendered at 1.5x (720 x 450: the site shows it
200-320 px wide, so this stays sharp on 2x screens). `#scene` holds everything; the
runner fades it in over the first 0.35 s and out over the last 0.45 s, so the loop
is seamless. Default length 10.5 s.

**Story.** One concrete running example from the paper (its real images, its
exact question / caption / answers), told in 3 beats: setup and how the baseline
fails, the mechanism doing its thing, then the headline number. Every string and
number must come from the paper; shorten text only where the meaning survives.
Bars start from zero.

**Layout.**
- On the site the venue badge covers the top-left corner. At the smallest
  display width (200 px), keep anything that matters out of x < 200, y < 56 (x < 280 for the long "ACL 20xx (Main)" badge).
  The top-right strip is free real estate (question cards, labels).
- One-line caption at the bottom (`.caption`, 19 px Space Grotesk, <= ~44
  characters) with one or two coloured words (`.hl`, `.good`, `.blue`, ...).
- The teaser is shown 200-320 px wide (320 on a desktop), so: few words,
  11.5 px minimum for anything you need to read, big shapes, strong contrast between states.

**Colour.** Only the tokens in `lib/base.css`, so both themes work:
`--acc` (warm brown) is the method / "ours", `--good` = correct, `--bad` = wrong,
`--base` = baseline bars, `--blue` / `--gold` for a second / third category.
Never hard-code colours, except inside real images.

**Motion.** Entrances are opacity + 6–8 px slides (`power2.out`, 0.3–0.5 s);
pops use `back.out(2)`; things moving across the stage use `power3.inOut`.
Leave ~1 s of hold at the end of each beat so it can be read.

**Clock.** Animate only through `tl` (paused GSAP timeline) or the helpers:
`count(sel, from, to, t0, dur, {decimals})` for numbers, `type(sel, text, t0, dur)`
for typing, `at(t => ...)` for anything else computed from time. No CSS
transitions / animations, no `setTimeout`, no randomness without a fixed seed:
the renderer seeks to arbitrary times and must get the same frame every time.

**Icons.** `<i data-i="check|cross|plus|minus|arrow|zin|zout|search|warn|shield|cursor|bolt" data-s="14">`
becomes an inline SVG in `currentColor`.

`src/lens.html` is the reference example.
