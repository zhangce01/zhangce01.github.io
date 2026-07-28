// The easycounter image is blocked by some tracker-protection setups
// (notably Safari). A substitute counter would show a made-up number, so
// when the image fails to load we hide the whole line instead.
(function () {
  var img = document.getElementById('visitor-counter');
  if (!img) return;

  function hide() {
    var p = document.getElementById('visitors');
    if (p) p.style.display = 'none';
  }

  img.addEventListener('error', hide);
  if (img.complete && img.naturalWidth === 0) {
    // already failed before this script attached its listener
    hide();
  } else if (!img.complete) {
    img.addEventListener('load', function () {
      if (img.naturalWidth === 0) hide();
    });
  }
})();
