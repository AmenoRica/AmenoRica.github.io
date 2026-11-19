import { monthTarget } from '../lib/diary.mjs';
const groups = [...document.querySelectorAll('.month-group')];
const choices = [...document.querySelectorAll('.month-choice')];
const records = document.querySelector('#records');
if (groups.length) {
  const populated = groups.map(group => group.dataset.month);
  const status = document.querySelector('#month-status');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const edge = () => records.getBoundingClientRect().top;
  let frame = 0, scrollFrame = 0, userScrolling = true;
  function select(month) {
    choices.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.month === month)));
    status.textContent = populated.includes(month) ? '' : '기록 없는 달 · 목록의 해당 경계';
  }
  function sync() {
    frame = 0;
    const boundary = edge();
    records.style.setProperty('--fade-edge', records.scrollTop > 0 ? '0px' : '-24px');
    if (!userScrolling || document.querySelector('#entry-dialog').open) return;
    let current = groups[0];
    for (const group of groups) if (group.getBoundingClientRect().top <= boundary + 24) current = group;
    if (records.clientHeight + records.scrollTop >= records.scrollHeight - 2) current = groups.at(-1);
    select(current.dataset.month);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(sync); }
  function stopFollow() { cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
  function go(month) {
    stopFollow();
    userScrolling = false;
    select(month);
    const group = document.getElementById(`month-${monthTarget(populated, month)}`);
    const target = Math.max(0, Math.min(records.scrollHeight - records.clientHeight,
      group.getBoundingClientRect().top + records.scrollTop - edge() - parseFloat(getComputedStyle(records).paddingTop)));
    if (reducedMotion.matches) { records.scrollTo({top:target,behavior:'instant'}); schedule(); return; }
    let previous = performance.now();
    const tick = now => {
      const dt = Math.min(64, now - previous); previous = now;
      const distance = target - records.scrollTop;
      if (Math.abs(distance) < .75) {
        records.scrollTo({top:target,behavior:'instant'}); scrollFrame = 0; schedule(); return;
      }
      const step = Math.sign(distance) * Math.min(Math.abs(distance), Math.max(1, Math.abs(distance) * (1 - Math.exp(-dt / 85))));
      records.scrollTo({top:records.scrollTop + step,behavior:'instant'});
      scrollFrame = requestAnimationFrame(tick);
    };
    scrollFrame = requestAnimationFrame(tick);
  }
  choices.forEach(button => button.addEventListener('click', () => go(button.dataset.month)));
  function takeScroll(event) {
    if (event.target.closest('.month-control')) return;
    stopFollow(); userScrolling = true;
  }
  records.addEventListener('wheel', takeScroll, {passive:true});
  records.addEventListener('touchstart', takeScroll, {passive:true});
  records.addEventListener('pointerdown', takeScroll);
  records.addEventListener('click', takeScroll);
  records.addEventListener('keydown', event => {
    if (['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(event.key)) takeScroll(event);
  });
  records.addEventListener('scroll', schedule, {passive:true});
  window.addEventListener('resize', () => {stopFollow(); schedule();});
  select(populated[0]);
  sync();
}
const dialog = document.querySelector('#entry-dialog');
let opener, savedY = 0;
document.querySelectorAll('.open-entry').forEach(button => button.addEventListener('click', () => {
  opener = button;
  savedY = records.scrollTop;
  const content = document.querySelector('#entry-content');
  content.replaceChildren(document.getElementById(`entry-${button.dataset.entry}`).content.cloneNode(true));
  content.querySelector('h2').id = 'entry-title';
  dialog.showModal();
  dialog.scrollTop = 0;
}));
let closing = false, swipe = null, settling = null, suppressClickUntil = 0;
async function closeReader() {
  if (closing || !dialog.open) return;
  closing = true;
  swipe = null;
  const from = getComputedStyle(dialog).transform;
  settling?.cancel();
  settling = null;
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const exit = dialog.animate([
      {transform:from},
      {transform:'translateX(100%)'}
    ], {duration:320, easing:'cubic-bezier(.4,0,.8,.4)', fill:'forwards'});
    await exit.finished.catch(() => {});
    dialog.close();
    exit.cancel();
  } else {
    dialog.close();
  }
  closing = false;
}
document.querySelector('.close-entry').addEventListener('click', closeReader);
dialog.addEventListener('cancel', event => {
  event.preventDefault();
  closeReader();
});
dialog.addEventListener('pointerdown', event => {
  if (event.pointerType !== 'touch' || !event.isPrimary || closing || settling ||
      !window.matchMedia('(max-width:760px)').matches ||
      event.target.closest('a,button,input,textarea,select,video,audio')) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top) return;
  swipe = {id:event.pointerId, x:event.clientX, y:event.clientY, lastX:event.clientX,
    time:event.timeStamp, velocity:0, distance:0, active:false};
});
dialog.addEventListener('pointermove', event => {
  if (!swipe || event.pointerId !== swipe.id) return;
  const dx = event.clientX - swipe.x, dy = event.clientY - swipe.y;
  if (!swipe.active) {
    if (Math.max(Math.abs(dx),Math.abs(dy)) < 10) return;
    if (dx <= 0 || Math.abs(dy) >= dx) {swipe = null; return;}
    swipe.active = true;
    dialog.style.animation = 'none';
    dialog.setPointerCapture(event.pointerId);
  }
  swipe.velocity = (event.clientX - swipe.lastX) / Math.max(1,event.timeStamp - swipe.time);
  swipe.lastX = event.clientX;
  swipe.time = event.timeStamp;
  swipe.distance = Math.max(0,dx);
  dialog.style.transform = `translateX(${swipe.distance}px)`;
});
async function endSwipe(event) {
  if (!swipe || event.pointerId !== swipe.id) return;
  const gesture = swipe;
  swipe = null;
  if (!gesture.active) return;
  suppressClickUntil = performance.now() + 400;
  if (dialog.hasPointerCapture(event.pointerId)) dialog.releasePointerCapture(event.pointerId);
  if (event.type === 'pointerup' && (gesture.distance > dialog.clientWidth * .28 ||
      (gesture.distance > 32 && gesture.velocity > .5 && event.timeStamp - gesture.time < 100))) {
    return closeReader();
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const animation = dialog.animate([{transform:dialog.style.transform},{transform:'translateX(0)'}],
      {duration:260,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'});
    settling = animation;
    await animation.finished.catch(() => {});
    if (settling !== animation) return;
    dialog.style.transform = '';
    animation.cancel();
    settling = null;
  } else dialog.style.transform = '';
}
dialog.addEventListener('pointerup', endSwipe);
dialog.addEventListener('pointercancel', endSwipe);
dialog.addEventListener('click', event => {
  if (performance.now() < suppressClickUntil) {event.preventDefault();event.stopImmediatePropagation();return;}
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) {
    closeReader();
  }
});
dialog.addEventListener('close', () => {
  swipe = null;
  dialog.style.transform = '';
  dialog.style.animation = '';
  records.scrollTo({top:savedY, behavior:'instant'});
  opener?.focus({preventScroll:true});
});

const calendar = document.querySelector('.month-control');
for (const scroller of [calendar, records]) {
  let idle;
  scroller?.addEventListener('scroll', () => {
    scroller.classList.add('is-scrolling');
    clearTimeout(idle);
    idle = setTimeout(() => scroller.classList.remove('is-scrolling'), 600);
  }, {passive:true});
}
