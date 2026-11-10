# Visitor globe

The dotted globe above the footer (`assets/js/visitorglobe.js`) shows where
visitors come from. Three pieces feed it:

- **`assets/data/land.json`** is the dot matrix of land. `land.py` builds it
  from Natural Earth outlines; rerun it only to change the dot density.
- **Counting.** Once a day per browser, `visitorglobe.js` looks up the
  visitor's rough location from their network address (geojs.io), rounds it to
  a 1 degree cell (about 100 km) and adds one to that cell's
  [Abacus](https://abacus.jasoncameron.dev) counter, in the same namespace as
  the total kept by `counter.js`. Nothing finer than the cell is stored, and
  previews on any other host than zhangce01.github.io never count.
- **`assets/data/visitors.json`** is what the globe draws: `[cell, visits]`
  pairs. `aggregate.py` rebuilds it from the counters (plus `seed.json`, if
  there is one, for visits from before the counters existed).

To refresh the map:

    python _visitors/aggregate.py
    git add assets/data/visitors.json _visitors/slots.json && git commit -m "Refresh visitor map"

`slots.json` is the script's memory of which cells have signed the register
(see the comments in `aggregate.py`); keep it committed so each run only reads
what is new.
