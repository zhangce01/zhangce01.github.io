// Highlight the topbar nav link for the section currently in view,
// and slide the pill indicator behind it.
//
// Every section owns a band of scroll offsets. A band normally opens when the
// section heading reaches a reference line REF px below the viewport top.
// The trailing sections (Honors, Services) are too short for that to ever
// happen on a tall screen — the bottom of the page arrives first — so they
// open when their heading reaches the bottom of the viewport instead. Either
// way a band opens somewhere between the heading above it and the heading
// below it, on every screen size, so clicking a tab always scrolls inside
// that tab's own band instead of overshooting into a neighbour's.
(function () {
  var REF = 130;   // reference line below the viewport top
  var HEAD = 72;   // fixed topbar height (matches html scroll-padding-top)

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav a')
  );
  if (!navLinks.length) return;

  var pill = document.querySelector('.site-nav .nav-pill');

  var targets = navLinks.map(function (a) {
    var href = a.getAttribute('href') || '';
    return href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
  });

  var lastCurrent = -2;
  var clickLock = false;   // while true, scrollspy leaves the clicked tab lit
  var lockTimer = null;

  function maxScroll() {
    return Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
  }

  // Document-absolute top of an element. Walking offsetTop rather than using
  // getBoundingClientRect keeps the measurement immune to the entrance
  // animation's transforms, and works the same in every browser.
  function docTop(el) {
    var y = 0;
    while (el) {
      y += el.offsetTop;
      el = el.offsetParent;
    }
    return y;
  }

  // Scroll offset at which each section becomes the current one — strictly
  // increasing, and always reachable.
  function bands() {
    var m = maxScroll();
    var n = targets.length;
    var t = [];
    var i;

    for (i = 0; i < n; i++) {
      t[i] = targets[i] ? Math.max(0, docTop(targets[i]) - REF) : (i ? t[i - 1] : 0);
      if (i && t[i] < t[i - 1]) t[i] = t[i - 1];
    }

    // last heading that can actually reach the reference line
    var lastFit = -1;
    for (i = 0; i < n; i++) {
      if (t[i] <= m) lastFit = i;
    }
    if (lastFit === n - 1) return t;

    // The rest sit in the final screenful, so the bottom of the page arrives
    // before they ever reach that line. They open when they reach the bottom
    // of the viewport instead — which is still after the section above them
    // has scrolled through — squeezed proportionally if the scroll left over
    // is too short to give each one a band that way.
    var end = Math.max(1, document.documentElement.scrollHeight - REF - m);
    var room = Math.max(0, m - (lastFit >= 0 ? t[lastFit] : 0));
    var squeeze = Math.min(1, room / (end + 1));
    for (i = lastFit + 1; i < n; i++) {
      t[i] = m - (end - (t[i] - m)) * squeeze;
    }
    return t;
  }

  function movePill(i) {
    if (!pill) return;
    if (i < 0) {
      pill.style.opacity = '0';
      return;
    }
    var a = navLinks[i];
    pill.style.opacity = '1';
    pill.style.left = a.offsetLeft + 'px';
    pill.style.width = a.offsetWidth + 'px';
  }

  function setActive(current) {
    for (var j = 0; j < navLinks.length; j++) {
      navLinks[j].classList.toggle('active', j === current);
    }
    if (current !== lastCurrent) {
      lastCurrent = current;
      // wait a frame so the active font-weight applies before measuring
      requestAnimationFrame(function () { movePill(current); });
    }
  }

  function onScroll() {
    if (clickLock) {
      // keep refreshing the release timer while the smooth scroll runs
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function () { clickLock = false; onScroll(); }, 140);
      return;
    }
    var scrollY = window.pageYOffset;
    var t = bands();
    var current = -1;
    for (var i = 0; i < t.length; i++) {
      if (scrollY >= t[i] - 1) current = i;
    }
    // the very bottom always belongs to the last tab
    if (scrollY >= maxScroll() - 2) current = t.length - 1;
    setActive(current);
  }

  // Where clicking tab i should scroll to: the heading tucked under the
  // topbar when that fits inside the tab's own band, otherwise as far down as
  // the band allows, which brings the section as far up the screen as it can
  // go without handing the highlight to the next tab.
  function destFor(i) {
    var m = maxScroll();
    var t = bands();
    if (i === t.length - 1) return m;          // last tab: all the way down

    var lo = t[i];
    var hi = t[i + 1];
    var pad = Math.min(24, (hi - lo) / 3);
    var low = lo + pad;
    var high = hi - pad;
    if (low > high) low = high = (lo + hi) / 2;

    var dest = targets[i] ? docTop(targets[i]) - HEAD : low;
    if (dest > high) dest = high;
    else if (dest < low) dest = low;
    return Math.max(0, Math.min(dest, m));
  }

  function lockOn(i) {
    clickLock = true;
    setActive(i);
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () { clickLock = false; onScroll(); }, 700);
  }

  navLinks.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      if (targets[i]) {
        var dest = destFor(i);
        // When the band leaves room for the browser's own anchor jump, let it
        // run: it animates and updates the hash for free. Only take over when
        // that jump would overshoot into the next section's band.
        if (Math.abs(dest - (docTop(targets[i]) - HEAD)) > 1) {
          e.preventDefault();
          // older Safari ignores the options-object form of scrollTo
          if ('scrollBehavior' in document.documentElement.style) {
            window.scrollTo({ top: dest, behavior: 'smooth' });
          } else {
            window.scrollTo(0, dest);
          }
        }
      }
      lockOn(i);
    });
  });

  function refresh() {
    lastCurrent = -2;
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', refresh);
  // images and webfonts settle after DOMContentLoaded and move the headings
  window.addEventListener('load', refresh);

  var newsMore = document.querySelector('details.news-more');
  if (newsMore) newsMore.addEventListener('toggle', onScroll);

  onScroll();
})();
