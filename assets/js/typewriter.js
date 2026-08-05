// Typewriter effect for the Research Interests headline.
(function () {
  var el = document.getElementById('ri-typed');
  if (!el) return;

  var phrases = [
    'long-form video understanding',
    'streaming video perception',
    '3D spatial reasoning',
    'hallucination mitigation',
    'efficient & trustworthy deployment'
  ];

  var pi = 0;       // phrase index
  var ci = 0;       // character index
  var deleting = false;

  function tick() {
    var p = phrases[pi];
    if (!deleting) {
      ci++;
      el.textContent = p.slice(0, ci);
      if (ci === p.length) {
        deleting = true;
        setTimeout(tick, 1900);   // hold the full phrase
        return;
      }
      setTimeout(tick, 55 + Math.random() * 45);
    } else {
      ci--;
      el.textContent = p.slice(0, ci);
      if (ci === 0) {
        deleting = false;
        pi = (pi + 1) % phrases.length;
        setTimeout(tick, 380);
        return;
      }
      setTimeout(tick, 26);
    }
  }

  tick();
})();
