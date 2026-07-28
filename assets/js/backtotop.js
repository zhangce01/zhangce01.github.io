// Floating back-to-top button: fades in after scrolling down a bit.
(function () {
  var btn = document.getElementById('back-to-top');
  if (!btn) return;

  var ticking = false;
  function update() {
    btn.classList.toggle('show', window.pageYOffset > 480);
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });

  btn.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  update();
})();
