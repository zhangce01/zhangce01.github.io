// The easycounter image is blocked by some tracker-protection setups
// (notably Safari). If it fails to load, swap in a visitorbadge.io badge;
// if that fails too, hide the line instead of showing a broken image.
(function () {
  var img = document.getElementById('visitor-counter');
  if (!img) return;
  var swapped = false;

  function fallback() {
    if (swapped) {
      var p = document.getElementById('visitors');
      if (p) p.style.display = 'none';
      return;
    }
    swapped = true;
    img.style.height = '20px';
    img.src =
      'https://api.visitorbadge.io/api/visitors' +
      '?path=https%3A%2F%2Fzhangce01.github.io' +
      '&label=visitors&labelColor=%23475569&countColor=%236366f1&style=flat-square';
    var t = document.getElementById('visitor-text');
    if (t) t.textContent = 'since Sep 2023.';
  }

  img.addEventListener('error', fallback);
  if (img.complete && img.naturalWidth === 0) {
    // already failed before this script attached its listener
    fallback();
  } else if (!img.complete) {
    img.addEventListener('load', function () {
      if (img.naturalWidth === 0) fallback();
    });
  }
})();
