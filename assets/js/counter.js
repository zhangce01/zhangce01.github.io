// Visitor counter rendered in the site's own type — no third-party badge.
// Count lives in Abacus (open-source CountAPI successor, plain JSON).
// Each visitor is counted once per day (localStorage); repeat views only
// read the count. On any failure the whole line stays hidden.
(function () {
  var el = document.getElementById('visitor-count');
  var p = document.getElementById('visitors');
  if (!el || !p) return;

  var BASE = 'https://abacus.jasoncameron.dev';
  var PATH = '/zhangce01-github-io/visits';
  // easycounter total at the moment this counter took over (Sep 2026)
  var OFFSET = 4563;

  var action = '/hit';
  try {
    var today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('visit-day') === today) {
      action = '/get';
    } else {
      localStorage.setItem('visit-day', today);
    }
  } catch (e) { /* storage blocked: just count the hit */ }

  // one-shot count-up over ~0.8s (skipped for reduced-motion users)
  function show(total) {
    p.style.visibility = 'visible';
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = total.toLocaleString('en-US');
      return;
    }
    var from = Math.max(0, total - 160);
    var t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min((t - t0) / 800, 1);
      k = 1 - Math.pow(1 - k, 3); // ease-out
      el.textContent = Math.round(from + (total - from) * k).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  fetch(BASE + action + PATH)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d && typeof d.value === 'number') show(d.value + OFFSET);
    })
    .catch(function () { /* leave hidden */ });
})();
