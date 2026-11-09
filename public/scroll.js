function wrapCarousel(position, width) {
  return width > 0 ? ((position % width) + width) % width + width : 0;
}
function groupProjectRows(rows) {
  const screens = [];
  for (let index = 0; index < rows.length; index += 2) screens.push(rows.slice(index, index + 2));
  return screens;
}
function projectTransition(scroll, height, reduced) {
  const progress = Math.max(0, Math.min(1, scroll / Math.max(1, height)));
  return reduced ? (progress >= .5 ? 1 : 0) : progress * progress * (3 - 2 * progress);
}
if (typeof module !== 'undefined') module.exports = { projectTransition, groupProjectRows, wrapCarousel };
if (typeof document !== 'undefined') (() => {
  const firstScreen = document.querySelector('.projects-screen');
  const groups = groupProjectRows([...firstScreen.querySelectorAll(':scope > .project-row')]);
  let previousScreen = firstScreen;
  groups.slice(1).forEach((rows, index) => {
    const screen = document.createElement('section');
    screen.className = 'projects-screen';
    screen.setAttribute('aria-label', `About the projects — ${index + 2}`);
    rows.forEach(row => screen.append(row));
    previousScreen.after(screen);
    previousScreen = screen;
  });
  const hero = document.querySelector('.hero');
  const dock = document.querySelector('.project-dock');
  const marks = [...dock.querySelectorAll('.project-mark')];
  const targets = [...document.querySelectorAll('.project-slot')];
  hero.append(dock);
  marks.forEach((mark,index)=>{
    targets[index].removeAttribute('aria-hidden');
    targets[index].append(mark.cloneNode(true));
  });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 600px)');
  let stopTravel = () => {};
  document.querySelectorAll('.contact-shortcut, .back-to-top').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      const target = document.querySelector(link.hash);
      if (!target) return;
      event.preventDefault();
      stopTravel();
      const startY = window.scrollY;
      const endY = Math.min(target.getBoundingClientRect().top + startY, document.documentElement.scrollHeight - window.innerHeight);
      const started = performance.now();
      let travelFrame;
      const finish = () => {
        cancelAnimationFrame(travelFrame);
        document.documentElement.classList.remove('section-travel');
        window.removeEventListener('wheel', cancel);
        window.removeEventListener('touchstart', cancel);
        window.removeEventListener('keydown', cancel);
        stopTravel = () => {};
      };
      const cancel = () => finish();
      stopTravel = finish;
      document.documentElement.classList.add('section-travel');
      window.addEventListener('wheel', cancel, { passive: true });
      window.addEventListener('touchstart', cancel, { passive: true });
      window.addEventListener('keydown', cancel);
      function step(now) {
        const progress = Math.min(1, (now - started) / 1200);
        const eased = progress * progress * (3 - 2 * progress);
        window.scrollTo(0, startY + (endY - startY) * eased);
        if (progress < 1) travelFrame = requestAnimationFrame(step);
        else {
          history.pushState(null, '', link.hash);
          target.focus({ preventScroll: true });
          finish();
        }
      }
      travelFrame = requestAnimationFrame(step);
    });
  });

  const carousel = document.createElement('nav');
  carousel.className = 'home-carousel';
  carousel.setAttribute('aria-label', 'Projects — 가로 스크롤');
  const cells = [];
  for (let copy = 0; copy < 4; copy++) {
    marks.forEach((mark, index) => {
      const cell = document.createElement('div');
      cell.className = 'carousel-cell';
      cell.dataset.index = index;
      cell.dataset.copy = copy;
      cell.append(mark.firstElementChild.cloneNode(true));
      if (copy !== 1) {
        cell.setAttribute('aria-hidden', 'true');
        cell.querySelectorAll('a').forEach(link => link.tabIndex = -1);
      }
      carousel.append(cell);
      cells.push(cell);
    });
  }
  hero.append(carousel);
  let pointerDown = false, hover = false, resumeAt = 0, previousTime = 0;
  let marqueeFrame = 0, fractionalStep = 0;
  const motionButton = document.querySelector('.motion-control');
  const cycleWidth = () => cells[marks.length].offsetLeft - cells[0].offsetLeft;
  function resetCarousel() {
    carousel.scrollLeft = reduced.matches ? 0 : cycleWidth();
    schedule();
  }
  function tick(time) {
    const elapsed = Math.min(50, time - (previousTime || time));
    previousTime = time;
    const paused = pointerDown || hover || carousel.matches(':focus-within') || time < resumeAt ||
      reduced.matches || motionButton.getAttribute('aria-pressed') === 'true';
    if (!paused) {
      const width = cycleWidth();
      fractionalStep += elapsed * .022;
      const step = Math.floor(fractionalStep);
      fractionalStep -= step;
      if (width && step) carousel.scrollLeft = wrapCarousel(carousel.scrollLeft + step, width);
    }
    marqueeFrame = requestAnimationFrame(tick);
  }
  function updateMarquee() {
    cancelAnimationFrame(marqueeFrame);
    previousTime = 0;
    if (narrow.matches && window.scrollY < 1 && !document.hidden && !reduced.matches)
      marqueeFrame = requestAnimationFrame(tick);
  }
  carousel.addEventListener('pointerdown', () => { pointerDown = true; });
  window.addEventListener('pointerup', () => { pointerDown = false; resumeAt = performance.now() + 1500; });
  window.addEventListener('pointercancel', () => { pointerDown = false; resumeAt = performance.now() + 1500; });
  carousel.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') hover = true; });
  carousel.addEventListener('pointerleave', () => { hover = false; });
  carousel.addEventListener('wheel', () => { resumeAt = performance.now() + 1500; }, { passive: true });
  carousel.addEventListener('scroll', () => {
    if (!reduced.matches && !carousel.matches(':focus-within')) {
      const width = cycleWidth();
      if (width && (carousel.scrollLeft < width / 2 || carousel.scrollLeft > width * 2))
        carousel.scrollLeft = wrapCarousel(carousel.scrollLeft, width);
    }
  }, { passive: true });
  document.addEventListener('visibilitychange', updateMarquee);
  narrow.addEventListener('change', resetCarousel);
  reduced.addEventListener('change', resetCarousel);
  let frame = 0;
  function render() {
    frame = 0;
    const mobileHome = narrow.matches;
    carousel.classList.toggle('active', mobileHome);
    carousel.inert = !mobileHome;
    dock.hidden = mobileHome;
    dock.inert = mobileHome;
    updateMarquee();
    dock.classList.add('positioned');
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(render); }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  reduced.addEventListener('change', schedule);
  const observer = new ResizeObserver(schedule);
  [hero, ...marks, ...targets].forEach(element => observer.observe(element));
  document.fonts.ready.then(resetCarousel);
  render();
})();
