(() => {
  const list = document.querySelector('#article-page');
  const rows = [...list.children];
  const viewport = document.querySelector('.article-viewport');
  const nav = document.querySelector('.pagination');
  const buttons = [...nav.querySelectorAll('button')];
  const status = document.querySelector('#page-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const picker = document.querySelector('.category-picker');
  const trigger = document.querySelector('.category-trigger');
  const label = document.querySelector('.category-label');
  const options = document.querySelector('#category-options');
  const categories = [...options.querySelectorAll('button')];
  const perPage = 6;
  let category = 'all', total = Math.ceil(rows.length / perPage);
  const gaps = Array.from({ length: perPage }, () => {
    const gap = document.createElement('li');
    gap.className = 'page-gap'; gap.textContent = '···';
    gap.setAttribute('aria-hidden', 'true');
    list.appendChild(gap);
    return gap;
  });
  let page = 1, busy = false, measuredWidth = 0;
  function render() {
    const filtered = rows.filter(row => category === 'all' || row.dataset.category === category);
    total = Math.max(1, Math.ceil(filtered.length / perPage));
    const visible = new Set(filtered.slice((page - 1) * perPage, page * perPage));
    rows.forEach(row => { row.hidden = !visible.has(row); });
    const missing = perPage - visible.size;
    trigger.disabled = busy;
    categories.forEach(button => { button.disabled = busy; button.setAttribute('aria-pressed', String(button.dataset.category === category)); });
    gaps.forEach((gap, i) => { gap.hidden = i >= missing; });
    buttons.forEach(button => {
      const number = Number(button.dataset.page);
      button.hidden = number > total;
      if (number === page) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      button.disabled = busy || (button.dataset.step === '-1' && page === 1) || (button.dataset.step === '1' && page === total);
    });
  }
  async function turn(next) {
    if (busy || next === page || next < 1 || next > total) return;
    const direction = next > page ? 1 : -1;
    busy = true; render();
    const slide = async (from, to, duration) => {
      if (reduced.matches || !list.animate) return;
      await list.animate([{ transform: `translateX(${from}%)` }, { transform: `translateX(${to}%)` }], {
        duration, easing: 'cubic-bezier(.22,.61,.36,1)',
      }).finished.catch(() => {});
    };
    await slide(0, -100 * direction, 160);
    page = next; render();
    await slide(100 * direction, 0, 240);
    busy = false; render();
    buttons.find(button => Number(button.dataset.page) === page).focus({ preventScroll: true });
    status.textContent = `${page}페이지, 글 ${rows.filter(row => !row.hidden).length}개`;
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    turn(button.dataset.page ? Number(button.dataset.page) : page + Number(button.dataset.step));
  }));
  function closePicker(focus = false) {
    if (busy) return;
    options.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => {
    options.hidden = !options.hidden;
    trigger.setAttribute('aria-expanded', String(!options.hidden));
  });
  function applyCategory(button) {
    category = button.dataset.category; page = 1;
    label.replaceChildren(button.firstElementChild.cloneNode(true));
    trigger.setAttribute('aria-label', category === 'all' ? '카테고리 선택, 현재 필터 없음' : `카테고리: ${button.textContent}`);
    render();
    status.textContent = `${category === 'all' ? '전체' : button.textContent}, 1페이지, 글 ${rows.filter(row => !row.hidden).length}개`;
  }
  async function selectCategory(button) {
    if (busy) return;
    if (reduced.matches || !button.animate || !list.animate) {
      applyCategory(button); closePicker(true); return;
    }
    const logo = button.firstElementChild;
    const from = logo.getBoundingClientRect(), to = trigger.getBoundingClientRect();
    const destination = label.getBoundingClientRect();
    const ghost = logo.cloneNode(true);
    ghost.setAttribute('aria-hidden', 'true');
    Object.assign(ghost.style, { position: 'fixed', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, margin: '0', zIndex: '5', pointerEvents: 'none', color: 'var(--ink)' });
    document.body.appendChild(ghost);
    busy = true; render();
    button.style.visibility = 'hidden'; label.style.visibility = 'hidden';
    const animations = [];
    const play = (element, frames, duration) => {
      const animation = element.animate(frames, { duration, easing: 'ease-in-out', fill: 'both' });
      animations.push(animation);
      return animation.finished.catch(() => {});
    };
    const disappear = [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(6px)' }];
    try {
      await Promise.all([
        play(list, disappear, 260),
        ...categories.filter(option => option !== button).map(option => play(option, disappear, 260)),
      ]);
      applyCategory(button);
      const appearing = play(list, [...disappear].reverse(), 340);
      await Promise.all([
        appearing,
        play(ghost, [{ transform: 'translate(0, 0)' }, { transform: `translate(${destination.left - from.left}px, ${to.top + (to.height - from.height) / 2 - from.top}px)` }], 400),
      ]);
    } finally {
      busy = false;
      closePicker();
      animations.forEach(animation => animation.cancel());
      ghost.remove();
      button.style.visibility = ''; label.style.visibility = '';
      render(); trigger.focus({ preventScroll: true });
    }
  }
  categories.forEach(button => button.addEventListener('click', () => selectCategory(button)));
  document.addEventListener('pointerdown', event => { if (!picker.contains(event.target)) closePicker(); });
  picker.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); closePicker(true); }
  });
  picker.addEventListener('focusout', event => { if (!picker.contains(event.relatedTarget)) closePicker(); });
  function measureSlots() {
    measuredWidth = viewport.clientWidth;
    list.style.gridAutoRows = 'auto';
    rows.forEach(row => { row.hidden = false; });
    const height = Math.ceil(Math.max(88, ...rows.map(row => row.getBoundingClientRect().height)));
    list.style.gridAutoRows = `${height}px`;
    render();
  }
  measureSlots(); nav.hidden = false;
  document.fonts.ready.then(measureSlots);
  new ResizeObserver(() => {
    if (viewport.clientWidth !== measuredWidth) measureSlots();
  }).observe(viewport);
})();
