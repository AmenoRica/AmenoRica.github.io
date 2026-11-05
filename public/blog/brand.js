(() => {
  const name = document.querySelector('.brand span');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fonts = ['IBM Plex Mono', 'DM Sans', 'Instrument Serif', 'Cormorant Garamond', 'Syne', 'Space Grotesk', 'Unbounded', 'Bodoni Moda', 'Italiana', 'Playfair Display'];
  const full = 'AmenoRica';
  let index = 0, deleting = true, timer;
  function schedule(delay = 2200) {
    clearTimeout(timer);
    name.classList.remove('typing');
    if (!reduced.matches && !document.hidden) timer = setTimeout(tick, delay);
  }
  function tick() {
    name.classList.add('typing');
    if (deleting) {
      name.textContent = name.textContent.slice(0, -1);
      if (!name.textContent) {
        index = (index + 1) % fonts.length;
        name.parentElement.style.fontFamily = `"${fonts[index]}", serif`;
        deleting = false;
      }
    } else {
      name.textContent = full.slice(0, name.textContent.length + 1);
      if (name.textContent === full) { deleting = true; schedule(); return; }
    }
    timer = setTimeout(tick, deleting ? 65 : 100);
  }
  document.addEventListener('visibilitychange', () => schedule());
  reduced.addEventListener('change', () => {
    name.textContent = full;
    deleting = true;
    schedule();
  });
  schedule();
})();
