// Toggle abstract / bibtex panels, copy bibtex to clipboard, and fold / unfold
// the cards: a collapsed card shows only its venue badge and its title.
(function () {
  var cards = document.querySelectorAll('.publications ol.bibliography > li');

  function setFold(li, collapsed) {
    li.classList.toggle('is-collapsed', collapsed);
    var b = li.querySelector('.pub-fold');
    if (b) {
      b.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      b.setAttribute('aria-label', collapsed ? 'Show details' : 'Hide details');
    }
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
      // a collapsed card opens on a click anywhere on it
      li.addEventListener('click', function (e) {
        if (!li.classList.contains('is-collapsed') || !e.target.closest) return;
        if (e.target.closest('button')) return;
        e.preventDefault();          // the title link does not navigate while the card is closed
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
