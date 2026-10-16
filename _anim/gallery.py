"""Write _anim/review/gallery.html: every rendered teaser, light and dark, side by side."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent
T = ROOT.parent / "assets" / "teasers"
slugs = sorted({p.name.rsplit("-", 1)[0] for p in T.glob("*-light.mp4")})
rows = "\n".join(
    f'<section><h2>{s}</h2><div class="pair">'
    f'<video src="../../assets/teasers/{s}-light.mp4" poster="../../assets/teasers/{s}-light.webp" autoplay muted loop playsinline controls></video>'
    f'<video class="d" src="../../assets/teasers/{s}-dark.mp4" poster="../../assets/teasers/{s}-dark.webp" autoplay muted loop playsinline controls></video>'
    f'<div class="small"><video src="../../assets/teasers/{s}-light.mp4" autoplay muted loop playsinline></video>'
    f'<video class="d" src="../../assets/teasers/{s}-dark.mp4" autoplay muted loop playsinline></video><span>actual size (200 px)</span></div>'
    f'</div></section>' for s in slugs)
html = f"""<!doctype html><meta charset="utf-8"><title>Teaser gallery</title>
<style>
body{{font:14px Inter,system-ui,sans-serif;background:#eceae6;margin:24px;color:#222}}
h2{{font:600 15px system-ui;margin:22px 0 8px}}
.pair{{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}}
video{{width:480px;border-radius:10px;background:#f6f4f0;box-shadow:0 4px 14px -6px rgba(0,0,0,.3)}}
.d{{background:#141311}}
.small{{display:flex;flex-direction:column;gap:8px}} .small video{{width:200px}} .small span{{font-size:12px;color:#777}}
</style>
<h1 style="font:700 20px system-ui">Publication teasers ({len(slugs)})</h1>
{rows}
"""
(ROOT / "review").mkdir(exist_ok=True)
(ROOT / "review" / "gallery.html").write_text(html, encoding="utf-8")
print(f"_anim/review/gallery.html: {len(slugs)} teasers")
