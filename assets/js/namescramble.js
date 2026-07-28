// Hovering the name "decodes" it into the Chinese name and back:
// characters flicker through random glyphs, then lock in one by one.
(function () {
  var h = document.querySelector('h1.name.has-cn');
  if (!h) return;
  var enEl = h.querySelector('.en');
  var cnEl = h.querySelector('.cn');
  if (!enEl || !cnEl) return;

  var EN = enEl.textContent.trim();
  var CN = cnEl.textContent.trim();
  if (!CN) return;

  var SYM = '!<>-_\\/[]{}=+*^?#';
  var CJK = '张策智能视觉学习机器';
  var reduced =
    window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var queue = [];
  var frame = 0;
  var raf = null;

  function randChar(toCJK) {
    var pool = toCJK && Math.random() < 0.5 ? CJK : SYM;
    return pool.charAt(Math.floor(Math.random() * pool.length));
  }

  function setText(t, zh) {
    enEl.textContent = t;
    enEl.classList.toggle('zh', zh);
  }

  function tick(zh) {
    var out = '';
    var done = 0;
    for (var i = 0; i < queue.length; i++) {
      var q = queue[i];
      if (frame >= q.end) {
        done++;
        out += q.to;
      } else if (frame >= q.start) {
        if (!q.ch || Math.random() < 0.35) q.ch = randChar(zh);
        out += q.ch;
      } else {
        out += q.from;
      }
    }
    setText(out, zh);
    if (done < queue.length) {
      frame++;
      raf = requestAnimationFrame(function () { tick(zh); });
    } else {
      raf = null;
    }
  }

  function scrambleTo(target, zh) {
    if (raf) cancelAnimationFrame(raf);
    if (reduced) { setText(target, zh); return; }
    var from = enEl.textContent;
    var len = Math.max(from.length, target.length);
    queue = [];
    for (var i = 0; i < len; i++) {
      var start = Math.floor(Math.random() * 10);
      queue.push({
        from: from.charAt(i) || '',
        to: target.charAt(i) || '',
        start: start,
        end: start + 8 + Math.floor(Math.random() * 14),
        ch: null
      });
    }
    frame = 0;
    tick(zh);
  }

  h.addEventListener('mouseenter', function () { scrambleTo(CN, true); });
  h.addEventListener('mouseleave', function () { scrambleTo(EN, false); });
  // touch devices have no hover: tap toggles
  h.addEventListener('click', function () {
    var zh = !enEl.classList.contains('zh');
    scrambleTo(zh ? CN : EN, zh);
  });
})();
