/* Side-nav scroll spy — highlights the current section in the side nav. */
(() => {
  const nav = document.getElementById('nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href^="#"]'));
  const sections = links
    .map(a => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setActive = (id) => {
    for (const a of links) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    }
  };

  const io = new IntersectionObserver((entries) => {
    // Pick the topmost intersecting section.
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible[0]) setActive(visible[0].target.id);
  }, {
    rootMargin: '-20% 0px -65% 0px',
    threshold: 0,
  });

  sections.forEach(s => io.observe(s));

  // Also activate on direct hash navigation
  window.addEventListener('hashchange', () => {
    const id = location.hash.slice(1);
    if (id) setActive(id);
  });
})();
