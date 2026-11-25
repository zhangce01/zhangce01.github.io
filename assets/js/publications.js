// Toggle abstract / bibtex panels, copy bibtex to clipboard, and fold / unfold
// the cards: a collapsed card shows only its venue badge, title and authors.
(function () {
  var cards = document.querySelectorAll('.publications ol.bibliography > li');

  // One line of authors for a collapsed card: as many leading names as fit,
  // then "et al."; the name in bold (the site owner) is always kept.
  function shortAuthors(li) {
    var full = li.querySelector('.author'), box = li.querySelector('.author-short');
    if (!full || !box) return;
    var tmp = full.cloneNode(true), eq = tmp.querySelector('.eq-contrib');
    if (eq) eq.parentNode.removeChild(eq);
    var parts = tmp.innerHTML.replace(/^\s+|\s+$/g, '').split(/,\s+/);
    var me = -1, i;
    for (i = 0; i < parts.length; i++) if (parts[i].indexOf('<strong') !== -1) { me = i; break; }
    function build(n) {
      var out = parts.slice(0, n).join(', '), last = n - 1;
      if (me >= n) { out += (me === n ? ', ' : ', \u2026, ') + parts[me]; last = me; }
      if (last < parts.length - 1) out += ', <span class="etal">et al.</span>';
      return out;
    }
    for (var n = parts.length; n >= 1; n--) {
      box.innerHTML = build(n);
      if (box.scrollWidth <= box.clientWidth + 1) return;
    }
  }

  function refreshShort() {
    for (var k = 0; k < cards.length; k++) if (cards[k].classList.contains('is-collapsed')) shortAuthors(cards[k]);
  }

  function setFold(li, collapsed) {
    li.classList.toggle('is-collapsed', collapsed);
    var b = li.querySelector('.pub-fold');
    if (b) {
      b.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      b.setAttribute('aria-label', collapsed ? 'Show details' : 'Hide details');
    }
    if (collapsed) shortAuthors(li);
    // tells teasers.js to stop or start this card's animation
    try { document.dispatchEvent(new CustomEvent('pubfold', { detail: li })); } catch (e) {}
  }

  for (var c = 0; c < cards.length; c++) {
    (function (li) {
      var btn = li.querySelector('.pub-fold');
      if (!btn) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        setFold(li, !li.classList.contains('is-collapsed'));
      });
      // a collapsed card opens on a click anywhere that is not a link, a button or an
      // open abstract / BibTeX panel; a click on its thumbnail opens the card, not the zoom
      li.addEventListener('click', function (e) {
        if (!li.classList.contains('is-collapsed') || !e.target.closest) return;
        if (e.target.closest('a, button, .abstract, .bibtex')) return;
        if (e.target.closest('.teaser')) e.stopPropagation();
        setFold(li, false);
      }, true);
    })(cards[c]);
  }

  // jumping to a collapsed card (a Research Interests pill, a shared link) opens it
  function openTarget() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    var li = id && document.getElementById(id);
    if (li && li.classList && li.classList.contains('is-collapsed')) setFold(li, false);
  }
  window.addEventListener('hashchange', openTarget);
  openTarget();

  refreshShort();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshShort);
  var shortTimer;
  window.addEventListener('resize', function () { clearTimeout(shortTimer); shortTimer = setTimeout(refreshShort, 150); });

  var toggles = document.querySelectorAll('.toggle-pub');
  for (var i = 0; i < toggles.length; i++) {
    toggles[i].addEventListener('click', function () {
      var el = document.getElementById(this.getAttribute('data-target'));
      if (el) el.classList.toggle('open');
    });
  }

  var copyBtns = document.querySelectorAll('.copy-bib');
  for (var j = 0; j < copyBtns.length; j++) {
    copyBtns[j].addEventListener('click', function () {
      var btn = this;
      var pre = btn.parentNode.querySelector('pre');
      if (!pre) return;
      var text = pre.innerText;
      var done = function () {
        var prev = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = prev; }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {});
      } else {
        var ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  }
})();
