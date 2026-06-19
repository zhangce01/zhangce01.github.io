// Toggle abstract / bibtex panels and copy bibtex to clipboard.
(function () {
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
