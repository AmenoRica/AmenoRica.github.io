export function makeRope(x, length, count = 18) {
  return Array.from({ length: count + 1 }, (_, i) => ({ x, y: length * i / count, px: x, py: length * i / count, weight: i === 0 ? 0 : i === count ? .08 : 1 }));
}

export function stepRope(points, length, dt, wind, target) {
  const last = points.at(-1);
  for (const p of points) {
    if (!p.weight) continue;
    const dx = p.x - p.px, dy = p.y - p.py;
    const damping = Math.min(.994, 350 * dt / (Math.hypot(dx, dy) || 1));
    const vx = dx * damping, vy = dy * damping;
    p.px = p.x; p.py = p.y;
    p.x += vx + wind * dt * dt;
    p.y += vy + 850 * dt * dt;
  }
  if (target) { last.x = target.x; last.y = target.y; }
  const segment = length / (points.length - 1);
  for (let pass = 0; pass < 36; pass++) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || .0001;
      const correction = (distance - segment) / distance;
      const sum = a.weight + b.weight;
      a.x += dx * correction * a.weight / sum;
      a.y += dy * correction * a.weight / sum;
      b.x -= dx * correction * b.weight / sum;
      b.y -= dy * correction * b.weight / sum;
    }
  }
}

export function stepAngle(body, dt, wind) {
  // The ink centroid assumes a uniformly dense, flat letter cutout.
  const torque = body.cx * Math.cos(body.angle) - body.cy * Math.sin(body.angle);
  body.spin += (850 * torque / body.inertia - body.spin * 1.6 + wind * .001) * dt;
  body.angle += body.spin * dt;
}

export function brush(body, from, to, seconds) {
  const dx = to.x - from.x, dy = to.y - from.y;
  if (seconds <= 0 || seconds > .12 || Math.hypot(dx, dy) < .5) return false;
  const end = body.points.at(-1), c = Math.cos(body.angle), s = Math.sin(body.angle);
  const x = (from.x - end.x) * c + (from.y - end.y) * s + body.ax;
  const y = -(from.x - end.x) * s + (from.y - end.y) * c + body.ay;
  const vx = dx * c + dy * s, vy = -dx * s + dy * c;
  let enter = 0, leave = 1;
  // Sweep the whole pointer path so a fast pass cannot skip a letter.
  for (const [start, delta, low, high] of [[x, vx, body.left - 5, body.right + 5], [y, vy, body.top - 5, body.bottom + 5]]) {
    if (Math.abs(delta) < .00001) {
      if (start < low || start > high) return false;
    } else {
      const a = (low - start) / delta, b = (high - start) / delta;
      enter = Math.max(enter, Math.min(a, b));
      leave = Math.min(leave, Math.max(a, b));
      if (enter > leave) return false;
    }
  }
  const scale = Math.min(.32 / seconds, 350 / Math.hypot(dx, dy));
  const oldX = (end.x - end.px) * 120, oldY = (end.y - end.py) * 120;
  const changeX = (dx * scale - oldX) * .7, changeY = (dy * scale - oldY) * .7;
  end.px -= changeX / 120; end.py -= changeY / 120;
  const t = (enter + leave) / 2;
  const rx = from.x + dx * t - end.x - (body.cx * c - body.cy * s);
  const ry = from.y + dy * t - end.y - (body.cx * s + body.cy * c);
  body.spin = Math.max(-2.5, Math.min(2.5, body.spin + (rx * changeY - ry * changeX) / body.inertia * .3));
  return true;
}

export function liftRope(points, length, direction) {
  const count = points.length - 1, segment = length / count;
  for (let i = 1; i <= count; i++) {
    const angle = direction * .8 * Math.cos(Math.PI * (i - .5) / count);
    points[i].x = points[i].px = points[i - 1].x + Math.sin(angle) * segment;
    points[i].y = points[i].py = points[i - 1].y - Math.cos(angle) * segment;
  }
}
