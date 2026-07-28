// Highlight the topbar nav link for the section currently in view,
// and slide the pill indicator behind it.
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

  function onScroll() {
    var pos = window.pageYOffset + 130;
    var current = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].offsetTop <= pos) current = i;
    }
    for (var j = 0; j < navLinks.length; j++) {
      navLinks[j].classList.toggle('active', j === current);
    }
    if (current !== lastCurrent) {
      lastCurrent = current;
      // wait a frame so the active font-weight applies before measuring
      requestAnimationFrame(function () { movePill(current); });
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    lastCurrent = -2;
    onScroll();
  });
  onScroll();
})();
