"""Build assets/data/land.json: the dot matrix of land that the visitor globe draws.

The globe (assets/js/visitorglobe.js) shows land as rows of evenly spaced dots.
Row i sits at latitude LAT0 + i * STEP and holds n = round(360 * cos(lat) / STEP)
dots, so the spacing is the same everywhere on the sphere; dot k of a row is at
longitude -180 + (k + 0.5) * 360 / n. This script decides which of those dots are
land and which country or region each belongs to, and stores them as runs:

    {"lat0": .., "step": .., "codes": ["", "AE", ...],
     "rows": [[n, [start, length, code index, start, length, code index, ...]], ...]}

so the globe can darken the land of the country it is showing.

The outlines are Natural Earth (public domain), not kept in the repo. From
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson download
ne_50m_land, ne_50m_lakes, ne_10m_admin_0_countries_chn and
ne_50m_admin_0_countries (.geojson) and run

    python _visitors/land.py ne_50m_land.geojson ne_50m_lakes.geojson \\
        ne_10m_admin_0_countries_chn.geojson ne_50m_admin_0_countries.geojson

Borders follow Natural Earth's China point-of-view file. That file draws Taiwan
inside China, and the site lists Taiwan as its own region next to "China
mainland", so Taiwan's outline is taken from the default file and laid on top.

Needs numpy and Pillow. Only rerun to change the dot density (STEP).
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

STEP = 0.9            # degrees between neighbouring dots
LAT0, LAT1 = -57.0, 83.6   # no Antarctica
PX = 10               # mask pixels per degree
LAND_SHARE = 0.38     # a dot is land when this much of its cell is
BIG_LAKE = 2.5        # square degrees; smaller lakes are not cut out

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "data", "land.json")


def features(path):
    return json.load(open(path, encoding="utf-8"))["features"]


def polygons(feature):
    """(exterior, holes) for every polygon of a GeoJSON feature"""
    g = feature["geometry"]
    for poly in ([g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]):
        yield poly[0], poly[1:]


def px(ring):
    return [((x + 180) * PX, (90 - y) * PX) for x, y in ring]


def area(ring):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def code_of(feature):
    p = feature["properties"]
    for key in ("ISO_A2_EH", "ISO_A2"):
        c = p.get(key) or ""
        if len(c) == 2 and c.isalpha():
            return c.upper()
    return ""


def main(land_path, lakes_path, countries_path, default_path):
    img = Image.new("L", (360 * PX, 180 * PX), 0)
    draw = ImageDraw.Draw(img)
    for f in features(land_path):
        for ext, holes in polygons(f):
            draw.polygon(px(ext), fill=255)
            for h in holes:
                draw.polygon(px(h), fill=0)
    for f in features(lakes_path):
        for ext, holes in polygons(f):
            if area(ext) >= BIG_LAKE:
                draw.polygon(px(ext), fill=0)
                for h in holes:
                    draw.polygon(px(h), fill=255)
    mask = np.asarray(img, dtype=np.float32) / 255.0
    # summed-area table, so a dot's cell can be averaged in O(1)
    sat = np.zeros((mask.shape[0] + 1, mask.shape[1] + 1), dtype=np.float64)
    sat[1:, 1:] = mask.cumsum(0).cumsum(1)

    # which country each pixel is in: index into codes, 0 = none
    codes = [""]
    owner_img = Image.new("I", (360 * PX, 180 * PX), 0)
    owner_draw = ImageDraw.Draw(owner_img)

    def paint(feature, code):
        if not code:
            return
        if code not in codes:
            codes.append(code)
        for ext, holes in polygons(feature):
            owner_draw.polygon(px(ext), fill=codes.index(code))

    for f in features(countries_path):
        paint(f, code_of(f))
    for f in features(default_path):
        if f["properties"].get("ADMIN") == "Taiwan":
            paint(f, "TW")
    owner = np.asarray(owner_img, dtype=np.int32)

    def window(lat, lon, dlat, dlon):
        y0 = max(0, int(round((90 - lat - dlat / 2) * PX)))
        y1 = min(mask.shape[0], max(y0 + 1, int(round((90 - lat + dlat / 2) * PX))))
        x0 = int(round((lon - dlon / 2 + 180) * PX))
        x1 = max(x0 + 1, int(round((lon + dlon / 2 + 180) * PX)))
        return y0, y1, max(0, x0), min(mask.shape[1], x1)

    def land_share(w):
        y0, y1, x0, x1 = w
        tot = sat[y1, x1] - sat[y0, x1] - sat[y1, x0] + sat[y0, x0]
        return tot / ((y1 - y0) * (x1 - x0))

    def country(w):
        """the country most of the cell's pixels are in"""
        y0, y1, x0, x1 = w
        counts = np.bincount(owner[y0:y1, x0:x1].ravel(), minlength=len(codes))
        counts[0] = 0
        return int(counts.argmax()) if counts.any() else 0

    rows, dots = [], 0
    count = int(math.floor((LAT1 - LAT0) / STEP)) + 1
    for i in range(count):
        lat = LAT0 + i * STEP
        n = max(1, round(360 * math.cos(math.radians(lat)) / STEP))
        cell = []
        for k in range(n):
            w = window(lat, -180 + (k + 0.5) * 360 / n, STEP, 360 / n)
            cell.append(country(w) if land_share(w) >= LAND_SHARE else -1)
        runs, k = [], 0
        while k < n:
            if cell[k] >= 0:
                s = k
                while k < n and cell[k] == cell[s]:
                    k += 1
                runs += [s, k - s, cell[s]]
            else:
                k += 1
        dots += sum(runs[1::3])
        rows.append([n, runs])
    data = {"lat0": LAT0, "step": STEP, "codes": codes, "rows": rows}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, separators=(",", ":"))
        f.write("\n")
    print(len(rows), "rows,", dots, "land dots,", len(codes) - 1, "countries and regions,",
          os.path.getsize(OUT), "bytes ->", os.path.normpath(OUT))


if __name__ == "__main__":
    main(*sys.argv[1:5])
