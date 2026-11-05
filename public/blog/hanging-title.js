import { makeRope, stepRope, stepAngle, brush, liftRope } from './hanging-physics.mjs';

import { createTheme } from './theme-mode.mjs';

const canvas = document.querySelector('#hanging-canvas');
const ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const effectsCanvas = document.querySelector('#confetti');
const fx = effectsCanvas.getContext('2d');
let light, particles = [], egg, puff;
const letters = [...'weB*LOG'];
let bodies = [], width, height, frame, previous, accumulated = 0, clock = 0, drag, lastPointer, initialized = false;
const theme = createTheme(next => {
  light = next;
  if (bodies.length) { draw(); drawEffects(); }
});
const setTheme = theme.set, toggleTheme = theme.toggle;

function glyph(character, size) {
  const image = document.createElement('canvas');
  const scale = 2;
  image.width = Math.ceil(size * 2 * scale);
  image.height = Math.ceil(size * 2 * scale);
  const ink = image.getContext('2d', { willReadFrequently: true });
  ink.font = `400 ${size * scale}px "Blog Bodoni"`;
  ink.fillStyle = '#fff';
  ink.fillText(character, size * .4 * scale, size * 1.3 * scale);
  const pixels = ink.getImageData(0, 0, image.width, image.height).data;
  let mass = 0, sx = 0, sy = 0, left = image.width, right = 0, top = image.height, bottom = 0;
  for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
    const alpha = pixels[(y * image.width + x) * 4 + 3] / 255;
    if (!alpha) continue;
    mass += alpha; sx += x * alpha; sy += y * alpha;
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  let ax = (left + right) / 2, ay = top, best = Infinity;
  for (let y = top; y <= top + (bottom - top) * .22; y++) for (let x = left; x <= right; x++) {
    if (pixels[(y * image.width + x) * 4 + 3] < 180) continue;
    const score = Math.abs(x - (left + right) / 2) + (y - top) * .35;
    if (score < best) { best = score; ax = x; ay = y; }
  }
  const cx = (sx / mass - ax) / scale, cy = (sy / mass - ay) / scale;
  let inertia = 0;
  for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) {
    inertia += pixels[(y * image.width + x) * 4 + 3] / 255 * ((x - ax) ** 2 + (y - ay) ** 2) / scale ** 2;
  }
  const darkImage = document.createElement('canvas');
  darkImage.width = image.width; darkImage.height = image.height;
  const darkInk = darkImage.getContext('2d');
  darkInk.drawImage(image, 0, 0);
  darkInk.globalCompositeOperation = 'source-in';
  darkInk.fillStyle = '#000'; darkInk.fillRect(0, 0, image.width, image.height);
  return { image, darkImage, ax: ax / scale, ay: ay / scale, cx, cy, inertia: Math.max(inertia / mass, 20), angle: Math.atan2(cx, cy), spin: 0, left: left / scale, right: right / scale, top: top / scale, bottom: bottom / scale };
}

function resize(force = false) {
  const rect = canvas.getBoundingClientRect();
  if (!force && bodies.length && rect.width === width && rect.height === height) return;
  const entrance = !initialized && !reduced.matches;
  initialized = true;
  egg = undefined; puff = undefined; particles = [];
  drag = undefined; lastPointer = undefined;
  canvas.classList.remove('dragging');
  ({ width, height } = rect);
  const dpr = Math.min(devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  resizeEffects();
  const span = Math.min(width * .76, 1000);
  const size = Math.max(38, Math.min(112, width * .085));
  bodies = letters.map((letter, i) => {
    const length = [170, 218, 188, 244, 200, 162, 222][i] * (width <= 600 ? .65 : 1);
    const x = (width - span) / 2 + span * i / 6;
    const body = { ...glyph(letter, size), length, releaseAt: entrance ? i * .15 : 0, points: makeRope(x, length) };
    if (entrance) {
      liftRope(body.points, length, i % 2 ? -1 : 1);
      body.angle += (i % 2 ? -1 : 1) * .08;
    }
    return body;
  });
  draw();
}

function draw() {
  ctx.clearRect(0, 0, width, height);
  for (const body of bodies) {
    if (egg?.body === body) continue;
    const points = body.points, end = points.at(-1);
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2);
    }
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = light ? '#888' : '#777'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = light ? '#222' : '#ddd'; ctx.lineWidth = .55; ctx.stroke();
    ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(body.angle);
    ctx.drawImage(light ? body.darkImage : body.image, -body.ax, -body.ay, body.image.width / 2, body.image.height / 2);
    ctx.beginPath(); ctx.arc(0, 0, 1.1, 0, Math.PI * 2); ctx.fillStyle = light ? '#111' : '#eee'; ctx.fill();
    ctx.restore();
  }
}

function animate(now) {
  if (previous !== undefined) accumulated += Math.min((now - previous) / 1000, .05);
  previous = now;
  while (accumulated >= 1 / 120) {
    clock += 1 / 120;
    bodies.forEach((body, index) => {
      if (clock < body.releaseAt || egg?.body === body) return;
      const wind = Math.sin(clock * 1.2 + index * 1.7) * 24 + Math.sin(clock * 2.1 + index) * 8;
      const length = body.length + (drag?.body === body && body === bodies[3] ? Math.min(70, drag.pull * .55) : 0);
      stepRope(body.points, length, 1 / 120, wind, drag?.body === body ? drag.target : undefined);
      stepAngle(body, 1 / 120, wind);
    });
    stepEffects(1 / 120);
    accumulated -= 1 / 120;
  }
  draw(); drawEffects(); frame = requestAnimationFrame(animate);
}

function syncMotion() {
  cancelAnimationFrame(frame); previous = undefined; accumulated = 0;
  drag = undefined; lastPointer = undefined; canvas.classList.remove('dragging');
  if (reduced.matches) { setTheme(theme.light); resize(true); drawEffects(); }
  if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(animate);
}

function position(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
function hit(point) {
  return bodies.find(body => {
    if (egg?.body === body) return false;
    const end = body.points.at(-1), x = point.x - end.x, y = point.y - end.y;
    const localX = x * Math.cos(body.angle) + y * Math.sin(body.angle) + body.ax;
    const localY = -x * Math.sin(body.angle) + y * Math.cos(body.angle) + body.ay;
    return localX >= body.left - 6 && localX <= body.right + 6 && localY >= body.top - 8 && localY <= body.bottom + 8;
  });
}
function nudge(body, direction = 1) {
  if (reduced.matches) return;
  const end = body.points.at(-1);
  end.px = end.x - direction * .8;
  body.spin += direction * .3;
}
canvas.addEventListener('pointerdown', event => {
  if (reduced.matches || drag || event.button !== 0) return;
  const point = position(event), body = hit(point);
  if (!body) return;
  const end = body.points.at(-1);
  drag = { body, pull: 0, pointer: event.pointerId, offset: { x: end.x - point.x, y: end.y - point.y }, target: { x: end.x, y: end.y } };
  canvas.setPointerCapture(event.pointerId); canvas.classList.add('dragging');
  if (event.pointerType !== 'mouse') nudge(body);
});
canvas.addEventListener('pointermove', event => {
  const point = position(event);
  if (drag && drag.pointer === event.pointerId) {
    const anchor = drag.body.points[0];
    const dx = point.x + drag.offset.x - anchor.x, dy = Math.max(8, point.y + drag.offset.y);
    drag.pull = Math.max(0, dy - drag.body.length);
    const extra = drag.body === bodies[3] ? Math.min(70, drag.pull * .55) : 0;
    const distance = Math.hypot(dx, dy), limit = (drag.body.length + extra) * .995;
    drag.target = { x: anchor.x + dx * Math.min(1, limit / distance), y: dy * Math.min(1, limit / distance) };
  } else {
    const body = hit(point);
    canvas.style.cursor = body ? 'grab' : '';
    if (!drag && !reduced.matches && event.pointerType === 'mouse' && lastPointer) {
      const seconds = (event.timeStamp - lastPointer.time) / 1000;
      bodies.forEach(letter => { if (egg?.body !== letter) brush(letter, lastPointer, point, seconds); });
    }
  }
  lastPointer = { ...point, time: event.timeStamp };
});
canvas.addEventListener('pointerleave', () => { lastPointer = undefined; });
function release(event) {
  if (drag?.pointer !== event.pointerId) return;
  const pluck = event.type === 'pointerup' && drag.body === bodies[3] && drag.pull >= Math.max(45, drag.body.length * .23);
  drag = undefined; lastPointer = undefined; canvas.classList.remove('dragging');
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  if (pluck) startEgg();
}
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('lostpointercapture', release);
document.querySelectorAll('.keyboard-controls button').forEach((button, index) => button.addEventListener('click', () => { if (index === 3) startEgg(); else if (bodies[index]) nudge(bodies[index]); }));
reduced.addEventListener('change', syncMotion);
document.addEventListener('visibilitychange', syncMotion);
function resizeEffects() {
  const dpr = Math.min(devicePixelRatio || 1, 3);
  effectsCanvas.width = Math.round(innerWidth * dpr);
  effectsCanvas.height = Math.round(innerHeight * dpr);
  fx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeEffects);
function startEgg() {
  if (egg || !bodies[3]) return;
  if (reduced.matches) { toggleTheme(); return; }
  const body = bodies[3], end = body.points.at(-1);
  const rect = canvas.getBoundingClientRect();
  egg = { body, at: clock, x: end.x + rect.left, y: end.y + rect.top, angle: body.angle, popped: false,
    rope: body.points.map(p => ({ x: p.x + rect.left, y: p.y + rect.top })),
    returnAt: clock + Math.sqrt(2 * innerHeight / 1500) + .25 };
}
function pop() {
  const colors = ['#ef5675', '#edab36', '#3aadb0', '#9c75d5', '#719e46'];
  toggleTheme();
  puff = { x: egg.rope[0].x, y: 0, at: clock };
  particles = Array.from({ length: 160 }, (_, i) => {
    const burst = i < 30, angle = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 170;
    return { x: burst ? puff.x : Math.random() * innerWidth, y: burst ? puff.y : -20 - Math.random() * innerHeight * .7,
      vx: burst ? Math.cos(angle) * speed : (Math.random() - .5) * 45, vy: burst ? 80 + Math.abs(Math.sin(angle)) * speed : 60 + Math.random() * 60,
      angle, spin: (Math.random() - .5) * 7, size: 3 + Math.random() * 5, age: 0, color: colors[i % colors.length] };
  });
  const body = egg.body;
  body.points = makeRope(body.points[0].x, body.length);
  liftRope(body.points, body.length, -1);
  body.angle = Math.atan2(body.cx, body.cy) + .1; body.spin = 0;
  body.releaseAt = egg.returnAt;
}
function stepEffects(dt) {
  if (egg) {
    if (!egg.popped && clock - egg.at >= .18) { egg.popped = true; pop(); }
    if (egg.popped && clock >= egg.body.releaseAt) egg = undefined;
  }
  for (const p of particles) {
    p.age += dt; p.vy = Math.min(190, p.vy + 90 * dt);
    p.x += (p.vx + Math.sin(p.age * 3 + p.angle) * 22) * dt;
    p.y += p.vy * dt; p.angle += p.spin * dt;
  }
  particles = particles.filter(p => p.age < 8 && p.y < innerHeight + 25);
  if (puff && clock - puff.at > .35) puff = undefined;
}
function drawEffects() {
  fx.clearRect(0, 0, innerWidth, innerHeight);
  if (egg) {
    const t = clock - egg.at, body = egg.body;
    const fall = 100 * t + 750 * t * t;
    fx.save(); fx.translate(Math.sin(t * 2) * 10, fall);
    fx.beginPath(); fx.moveTo(egg.rope[0].x, egg.rope[0].y);
    for (let i = 1; i < egg.rope.length - 1; i++) {
      const p = egg.rope[i], next = egg.rope[i + 1];
      fx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
    }
    fx.lineTo(egg.x, egg.y);
    fx.strokeStyle = light ? '#888' : '#777'; fx.lineWidth = 1.5; fx.stroke();
    fx.strokeStyle = light ? '#222' : '#ddd'; fx.lineWidth = .55; fx.stroke();
    fx.translate(egg.x, egg.y); fx.rotate(egg.angle);
    fx.drawImage(light ? body.darkImage : body.image, -body.ax, -body.ay, body.image.width / 2, body.image.height / 2);
    fx.restore();
  }
  if (puff) {
    const t = (clock - puff.at) / .35;
    fx.save(); fx.globalAlpha = 1 - t; fx.strokeStyle = light ? '#000' : '#fff'; fx.lineWidth = 1.5;
    fx.beginPath(); fx.arc(puff.x, puff.y, 8 + t * 65, 0, Math.PI * 2); fx.stroke(); fx.restore();
  }
  for (const p of particles) {
    fx.save(); fx.translate(p.x, p.y); fx.rotate(p.angle); fx.globalAlpha = Math.min(1, 8 - p.age);
    fx.fillStyle = p.color; fx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .5 * Math.cos(p.angle)); fx.restore();
  }
}
await document.fonts.load('112px "Blog Bodoni"', 'weB*LOG').catch(() => {});
resize();
new ResizeObserver(() => resize()).observe(canvas);
syncMotion();
