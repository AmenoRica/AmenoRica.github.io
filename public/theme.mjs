import { inkFrames } from './theme-ink.mjs';

const systemLight = matchMedia('(prefers-color-scheme: light)');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const button = document.querySelector('.theme-toggle');
let light = systemLight.matches, manual = false, transition, inkAnimation, request = 0;
function setTheme(next, animate = true) {
  const changed = next !== light;
  light = next;
  const id = ++request;
  transition?.skipTransition();
  inkAnimation?.cancel();
  inkAnimation = undefined;
  const apply = () => {
    if (id !== request) return;
    document.documentElement.dataset.theme = light ? 'light' : 'dark';
    button.textContent = light ? '◑ Dark' : '◐ Light';
    button.setAttribute('aria-pressed', String(light));
    button.title = light ? '다크 모드로 전환' : '라이트 모드로 전환';
    window.AmenoBackground?.setTheme(light);
  };
  if (changed && animate && !reduced.matches && !document.hidden && document.startViewTransition) {
    // Keep the captured old colors until the ink edge reveals the new screen.
    const current = document.startViewTransition(apply);
    transition = current;
    current.ready.then(() => {
      if (id !== request) return;
      inkAnimation = document.documentElement.animate(inkFrames(innerWidth, innerHeight), {
        duration: 1050, easing: 'linear', fill: 'forwards', pseudoElement: '::view-transition-old(root)'
      });
    }).catch(apply);
    current.finished.finally(() => {
      if (id !== request) return;
      // A forwards-filled animation otherwise keeps its effect attached after the snapshot disappears.
      inkAnimation?.cancel();
      inkAnimation = undefined;
      transition = undefined;
    }).catch(() => {});
  } else apply();
}
button.addEventListener('click', () => { manual = true; setTheme(!light); });
systemLight.addEventListener('change', () => { if (!manual) setTheme(systemLight.matches); });
reduced.addEventListener('change', () => { if (reduced.matches) setTheme(light, false); });
setTheme(light, false);
button.hidden = false;
