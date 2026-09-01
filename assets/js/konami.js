// Konami code (up up down down left right left right B A): Clawd the crab
// scuttles across the bottom of the screen once.
(function () {
  var seq = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];
  var pos = 0;
  var busy = false;

  window.addEventListener('keydown', function (e) {
    pos = e.keyCode === seq[pos] ? pos + 1 : (e.keyCode === seq[0] ? 1 : 0);
    if (pos < seq.length) return;
    pos = 0;
    if (busy) return;
    busy = true;

    var crab = document.createElement('img');
    crab.src = './assets/img/clawd.gif';
    crab.alt = '';
    crab.className = 'konami-crab';
    document.body.appendChild(crab);

    function done() {
      if (crab.parentNode) crab.remove();
      busy = false;
    }
    crab.addEventListener('animationend', function (ev) {
      if (ev.animationName === 'crab-cross') done();
    });
    setTimeout(done, 9000); // safety net
  });
})();
