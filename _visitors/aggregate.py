"""Refresh assets/data/visitors.json, the places the visitor globe lights up.

assets/js/visitorglobe.js adds one to an Abacus counter "c-<cell>" for the
1 degree cell a visitor's network is in (cell = (floor(lat) + 90) * 360 +
floor(lon) + 180). Abacus cannot list its counters, so cells also sign a
register: counter "cells" hands out slot numbers and "slot-<n>" holds
cell + 1. This script walks the register, reads every registered cell's count,
adds the optional seed (visits from before the counters existed) and writes

    {"updated": "YYYY-MM-DD", "cells": [[cell, visits], ...]}

Run it from anywhere, then commit the two files it changes:

    python _visitors/aggregate.py

Standard library only. It is slow on purpose (Abacus allows 30 requests per
10 seconds) and reading a counter also renews its six-month expiry.
"""
import datetime
import json
import os
import time
import urllib.error
import urllib.request

BASE = "https://abacus.jasoncameron.dev"
SPACE = "zhangce01-github-io"
PAUSE = 0.4

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "data", "visitors.json")
SLOTS = os.path.join(HERE, "slots.json")   # slot number -> cell, so a slot is only ever read once
SEED = os.path.join(HERE, "seed.json")     # optional {"cells": [[cell, visits], ...]}


def get(key):
    """value of a counter, or None if it does not exist"""
    url = "%s/get/%s/%s" % (BASE, SPACE, key)
    for attempt in range(6):
        time.sleep(PAUSE)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "zhangce01.github.io visitor map"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return int(json.load(r)["value"])
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            if e.code == 429:
                time.sleep(float(e.headers.get("Retry-After") or 10) + 1)
                continue
            raise
    raise RuntimeError("still rate limited: " + key)


def load(path, default):
    if not os.path.exists(path):
        return default
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def dump(path, data):
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, separators=(",", ":"), sort_keys=True)
        f.write("\n")


def main():
    slots = load(SLOTS, {})
    last = get("cells") or 0
    for n in range(1, last + 1):
        if str(n) in slots:
            continue
        v = get("slot-%d" % n)
        # an empty slot may still be filled by the visitor who took it; ask again next time
        if v is not None:
            slots[str(n)] = v - 1
    dump(SLOTS, slots)

    counts = {}
    for cell, visits in load(SEED, {}).get("cells", []):
        counts[int(cell)] = counts.get(int(cell), 0) + int(visits)
    live = sorted(set(c for c in slots.values() if 0 <= c < 180 * 360))
    for cell in live:
        v = get("c-%d" % cell)
        if v:
            counts[cell] = counts.get(cell, 0) + v

    cells = [[c, counts[c]] for c in sorted(counts)]
    old = load(OUT, {})
    if old.get("cells") == cells:
        print("no change:", len(cells), "places")
        return
    dump(OUT, {"updated": datetime.date.today().isoformat(), "cells": cells})
    print(len(cells), "places,", sum(c[1] for c in cells), "visits;", len(live), "from live counters")


if __name__ == "__main__":
    main()
