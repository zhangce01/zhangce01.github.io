// Highlight the topbar nav link for the section currently in view,
// and slide the pill indicator behind it.
//
// The reference line starts 130px below the viewport top and moves down
// proportionally with scroll progress, reaching the viewport bottom when
// the page is scrolled to the end — so short sections near the bottom
// (Honors, Services) still get their turn even though they can never
// reach the top of the viewport.
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

  var lastCurrent = -2;
  var clickLock = false;   // while true, scrollspy leaves the clicked tab lit
  var lockTimer = null;

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
    var maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight
    );
    var progress = Math.min(1, scrollY / maxScroll);
    // reference line: 130px from the top at progress 0, viewport bottom at 1
    var refY = scrollY + 130 + progress * (window.innerHeight - 130);
    var current = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].offsetTop <= refY) current = i;
    }
    setActive(current);
  }

  navLinks.forEach(function (a, i) {
    a.addEventListener('click', function () {
      clickLock = true;
      setActive(i);
      clearTimeout(lockTimer);
      lockTimer = setTimeout(function () { clickLock = false; onScroll(); }, 700);
    });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    lastCurrent = -2;
    onScroll();
  });
  onScroll();
})();
