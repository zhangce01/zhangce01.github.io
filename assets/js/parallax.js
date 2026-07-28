// Slow parallax drift of the background gradient blobs while scrolling.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var bg = document.querySelector('.bg-blobs');
  if (!bg) return;

  var ticking = false;
  function update() {
    // bounded sinusoidal drift: the blobs flow in changing directions as
    // you scroll and never slide past the container's bleed area
    var s = window.pageYOffset;
    var y = Math.sin(s / 850) * 50;
    var x = Math.cos(s / 620) * 35;
    bg.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
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
