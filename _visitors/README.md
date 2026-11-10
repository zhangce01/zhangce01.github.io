# Visitor globe

The dotted globe above the footer (`assets/js/visitorglobe.js`) shows where
visitors come from, and lets the eight countries and regions with the most
visitors be stepped through. Three pieces feed it:

- **`assets/data/land.json`** is the dot matrix of land, with the country or
  region each dot belongs to, so the one being shown can be darkened. `land.py`
  builds it from Natural Earth outlines; rerun it only to change the dot
  density. Its docstring says which outlines, and how Taiwan is handled.
- **`assets/flags/`** holds the flag shown beside a country's name and over it
  on the globe (flag-icons, MIT). Taiwan is listed by name only, so there is
  no `tw.svg` and `visitorglobe.js` does not ask for one.
- **Counting.** Once a day per browser, `visitorglobe.js` looks up the
  visitor's rough location from their network address (geojs.io), rounds it to
  a 1 degree cell (about 100 km) and adds one to an
  [Abacus](https://abacus.jasoncameron.dev) counter for that cell and country,
  in the same namespace as the total kept by `counter.js`. Nothing finer than
  the cell is stored, and previews on any other host than zhangce01.github.io
  never count.
- **The data** lives in its own repository,
  [visitor-map-data](https://github.com/zhangce01/visitor-map-data). A workflow
  there reads the counters once a day, adds the history from before they
  existed, and publishes `visitors.json`, which the globe loads from
  `https://zhangce01.github.io/visitor-map-data/visitors.json`. Keeping it
  apart means the daily update never touches this repository's history or its
  "Last Edited" date.

`assets/data/visitors.json` is a snapshot of that file, used when the live one
cannot be loaded (and by local previews). Copy a fresh one over now and then.
