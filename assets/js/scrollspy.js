// Highlight the topbar nav link for the section currently in view,
// and slide the pill indicator behind it.
//
// The tail of the page needs custom rules because Honors and Services are
// too short to ever reach the top of the viewport:
//   - Experiences stays lit from when it is fully visible until its block
//     sits at the vertical center of the screen;
//   - past that point Honors takes over;
//   - Services lights up only when the page is scrolled all the way down.
// Clicking those tabs scrolls to matching positions (Experiences centered,
// Honors just before the visitor counter shows, Services to the bottom).
(function () {
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.site-nav a')
  );
  if (!navLinks.length) return;

  var pill = document.querySelector('.site-nav .nav-pill');

  var targets = navLinks.map(function (a) {
    var href = a.getAttribute('href') || '';
    return href.charAt(0) === '#' ? document.getElementById(href.slice(1)) : null;
  });

  function idxOf(hash) {
    for (var i = 0; i < navLinks.length; i++) {
      if (navLinks[i].getAttribute('href') === hash) return i;
    }
    return -1;
  }
  var expIdx = idxOf('#experiences');
  var honIdx = idxOf('#honors-and-awards');
  var svcIdx = idxOf('#services');
  var visitors = document.getElementById('visitors');

  var lastCurrent = -2;
  var clickLock = false;   // while true, scrollspy leaves the clicked tab lit
  var lockTimer = null;

  function maxScroll() {
    return Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
  }

  // scroll offset at which the Experiences block sits centered in the viewport
  function expCenterScroll() {
    if (expIdx < 0 || !targets[expIdx]) return Infinity;
    var top = targets[expIdx].offsetTop;
    var end = (honIdx >= 0 && targets[honIdx]) ? targets[honIdx].offsetTop - 30 : top + 400;
    return Math.min((top + end) / 2 - window.innerHeight / 2, maxScroll());
  }

  // scroll offset with the visitor counter just below the viewport bottom
  function honorsScrollTarget() {
    var m = maxScroll();
    if (!visitors) return m - 80;
    var t = visitors.offsetTop - window.innerHeight - 12;
    return Math.max(0, Math.min(t, m));
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
    var m = maxScroll();
    var centerAt = expCenterScroll();
    var current;

    if (svcIdx >= 0 && scrollY >= m - 2) {
      current = svcIdx;                    // fully at the bottom
    } else if (honIdx >= 0 && scrollY > centerAt + 1) {
      current = honIdx;                    // past the Experiences midpoint
    } else {
      // regular sections: reference line 130px below the viewport top
      var refY = scrollY + 130;
      current = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].offsetTop <= refY) current = i;
      }
      if (expIdx >= 0 && current > expIdx) current = expIdx;
      // Experiences fully visible -> light it even before its heading
      // crosses the reference line
      if (
        expIdx >= 0 && honIdx >= 0 && targets[honIdx] &&
        current < expIdx &&
        targets[honIdx].offsetTop - 30 <= scrollY + window.innerHeight
      ) {
        current = expIdx;
      }
    }
    setActive(current);
  }

  function lockOn(i) {
    clickLock = true;
    setActive(i);
    clearTimeout(lockTimer);
    lockTimer = setTimeout(function () { clickLock = false; onScroll(); }, 700);
  }

  navLinks.forEach(function (a, i) {
    a.addEventListener('click', function (e) {
      var dest = null;
      if (i === expIdx) dest = expCenterScroll();
      else if (i === honIdx) dest = honorsScrollTarget();
      else if (i === svcIdx) dest = maxScroll();
      if (dest !== null) {
        e.preventDefault();
        window.scrollTo({ top: Math.max(0, dest), behavior: 'smooth' });
      }
      lockOn(i);
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    lastCurrent = -2;
    onScroll();
  });
  onScroll();
})();
