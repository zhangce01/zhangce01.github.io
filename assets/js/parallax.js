// Slow parallax drift of the background gradient blobs while scrolling.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var bg = document.querySelector('.bg-blobs');
  if (!bg) return;

  var ticking = false;
  function update() {
    bg.style.transform = 'translateY(' + (window.pageYOffset * -0.07) + 'px)';
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  update();
})();
