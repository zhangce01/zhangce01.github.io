"""Build assets/data/land.json: the dot matrix of land that the visitor globe draws.

The globe (assets/js/visitorglobe.js) shows land as rows of evenly spaced dots.
Row i sits at latitude LAT0 + i * STEP and holds n = round(360 * cos(lat) / STEP)
dots, so the spacing is the same everywhere on the sphere; dot k of a row is at
longitude -180 + (k + 0.5) * 360 / n. This script decides which of those dots are
land and stores them as runs, [n, [start, length, start, length, ...]] per row.

Land and lake outlines are Natural Earth 1:50m (public domain), not kept in the
repo. Download ne_50m_land.geojson and ne_50m_lakes.geojson from
https://github.com/nvkelso/natural-earth-vector/tree/master/geojson and run

    python _visitors/land.py path/to/ne_50m_land.geojson path/to/ne_50m_lakes.geojson

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


def rings(path):
    """(exterior, holes) for every polygon in a GeoJSON file"""
    for f in json.load(open(path, encoding="utf-8"))["features"]:
        g = f["geometry"]
        polys = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in polys:
            yield poly[0], poly[1:]


def px(ring):
    return [((x + 180) * PX, (90 - y) * PX) for x, y in ring]


def area(ring):
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def main(land_path, lakes_path):
    img = Image.new("L", (360 * PX, 180 * PX), 0)
    draw = ImageDraw.Draw(img)
    for ext, holes in rings(land_path):
        draw.polygon(px(ext), fill=255)
        for h in holes:
            draw.polygon(px(h), fill=0)
    for ext, holes in rings(lakes_path):
        if area(ext) >= BIG_LAKE:
            draw.polygon(px(ext), fill=0)
            for h in holes:
                draw.polygon(px(h), fill=255)
    mask = np.asarray(img, dtype=np.float32) / 255.0
    # summed-area table, so a dot's cell can be averaged in O(1)
    sat = np.zeros((mask.shape[0] + 1, mask.shape[1] + 1), dtype=np.float64)
    sat[1:, 1:] = mask.cumsum(0).cumsum(1)

    def share(lat, lon, dlat, dlon):
        y0 = max(0, int(round((90 - lat - dlat / 2) * PX)))
        y1 = min(mask.shape[0], max(y0 + 1, int(round((90 - lat + dlat / 2) * PX))))
        x0 = int(round((lon - dlon / 2 + 180) * PX))
        x1 = max(x0 + 1, int(round((lon + dlon / 2 + 180) * PX)))
        x0, x1 = max(0, x0), min(mask.shape[1], x1)
        tot = sat[y1, x1] - sat[y0, x1] - sat[y1, x0] + sat[y0, x0]
        return tot / ((y1 - y0) * (x1 - x0))

    rows, dots = [], 0
    count = int(math.floor((LAT1 - LAT0) / STEP)) + 1
    for i in range(count):
        lat = LAT0 + i * STEP
        n = max(1, round(360 * math.cos(math.radians(lat)) / STEP))
        land = [share(lat, -180 + (k + 0.5) * 360 / n, STEP, 360 / n) >= LAND_SHARE for k in range(n)]
        runs, k = [], 0
        while k < n:
            if land[k]:
                s = k
                while k < n and land[k]:
                    k += 1
                runs += [s, k - s]
            else:
                k += 1
        dots += sum(runs[1::2])
        rows.append([n, runs])
    data = {"lat0": LAT0, "step": STEP, "rows": rows}
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, separators=(",", ":"))
        f.write("\n")
    print(len(rows), "rows,", dots, "land dots,", os.path.getsize(OUT), "bytes ->", os.path.normpath(OUT))


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
