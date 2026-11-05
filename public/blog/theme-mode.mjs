import { inkFrames } from './theme-ink.mjs';

export function createTheme(onChange = () => {}) {
  const preference = window.blogTheme;
  const system = matchMedia('(prefers-color-scheme: dark)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const ink = document.querySelector('#theme-ink');
  const button = document.querySelector('.theme-toggle');
  let light = preference.read() ?? !system.matches;
  let manual = preference.read() !== null, transition, request = 0;
  function set(next, chosen = false, animate = true) {
    const changed = next !== light;
    const current = ++request;
    manual ||= chosen;
    if (chosen) preference.save(next);
    transition?.cancel(); ink.hidden = true;
    if (animate && changed && !reduced.matches && !document.hidden && ink.animate) {
      const frames = inkFrames(innerWidth, innerHeight);
      ink.style.clipPath = frames[0].clipPath; ink.hidden = false;
      transition = ink.animate(frames, { duration: 1050, easing: 'linear', fill: 'forwards' });
      transition.finished.then(() => {
        if (current !== request) return;
        ink.hidden = true; transition.cancel(); transition = undefined;
      }).catch(() => {});
    }
    light = next;
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    button.textContent = light ? '◑ Dark' : '◐ Light';
    button.setAttribute('aria-pressed', String(light));
    button.title = light ? '다크 모드로 전환' : '라이트 모드로 전환';
    onChange(light);
  }
  const toggle = () => set(!light, true);
  button.addEventListener('click', toggle);
  system.addEventListener('change', () => { if (!manual) set(!system.matches); });
  window.addEventListener('pageshow', () => {
    const saved = preference.read();
    if (saved !== null) { manual = true; set(saved, false, false); }
    else if (!manual) set(!system.matches, false, false);
  });
  reduced.addEventListener('change', () => { if (reduced.matches) set(light, false, false); });
  set(light, false, false);
  return { set, toggle, get light() { return light; } };
}
