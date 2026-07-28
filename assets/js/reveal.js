// Scroll-reveal: fade-and-rise elements as they enter the viewport.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  var selectors = [
    'header',
    'section > h2',
    'section > p',
    'section > ul > li',
    '.edu-card',
    '.about-contact',
    '.ri-typing',
    '.year-timeline .yt-node',
    '.publications h2.year',
    '.publications ol.bibliography > li',
    '.exp-item',
    'details.news-more'
  ];

  var els = Array.prototype.slice.call(
    document.querySelectorAll(selectors.join(','))
  );
  if (!els.length) return;

  els.forEach(function (el) { el.classList.add('rv'); });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('rv-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

  els.forEach(function (el) { io.observe(el); });
})();
