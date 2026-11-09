(() => {
  const identity = document.querySelector('.identity');
  const control = document.querySelector('.motion-control');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame, previous, elapsed = 0;
  let paused = false, done = false, started = false;
  function finish() {
    done = true;
    identity.classList.remove('intro-running');
  }
  function animate(now) {
    if (previous !== undefined) elapsed = Math.min(2000, elapsed + now - previous);
    previous = now;
    if (elapsed === 2000) finish();
    else frame = requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(frame);
    previous = undefined;
    control.hidden = reduced.matches;
    const stopped = paused || document.hidden;
    identity.classList.toggle('intro-paused', stopped);
    if (reduced.matches) finish();
    if (done || stopped) return;
    if (!started) { started = true; identity.classList.add('intro-running'); }
    animate(performance.now());
  }
  control.addEventListener('click', () => {
    paused = !paused;
    control.setAttribute('aria-pressed', String(paused));
    control.textContent = paused ? 'Resume animation' : 'Pause animation';
    sync();
  });
  reduced.addEventListener('change', sync);
  document.addEventListener('visibilitychange', sync);
  sync();
})();
