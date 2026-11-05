const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
(async () => {
  const { makeRope, stepRope, stepAngle, brush, liftRope } = await import(pathToFileURL(path.resolve('public/blog/hanging-physics.mjs')));
  const falling = makeRope(100, 220);
  liftRope(falling,220,1);
  const startY = falling.at(-1).y;
  assert.ok(startY < -180);
  assert.ok(Math.abs(falling.at(-1).x - 100) < .001);
  for (let i=1;i<falling.length;i++) assert.ok(Math.abs(Math.hypot(falling[i].x-falling[i-1].x,falling[i].y-falling[i-1].y)-220/18)<.001);
  for(let i=0;i<360;i++) stepRope(falling,220,1/120,0);
  assert.ok(falling.at(-1).y > startY + 40);
  for(let i=0;i<1200;i++) stepRope(falling,220,1/120,0);
  assert.ok(Math.abs(falling.at(-1).y - 220) < 3);
  const rope = makeRope(100, 220);
  const body = { cx: 8, cy: 42, inertia: 2500, angle: 0, spin: 0 };
  for (let i = 0; i < 2400; i++) {
    stepRope(rope, 220, 1/120, Math.sin(i/120) * 25, i < 600 ? { x: 190, y: 160 } : undefined);
    stepAngle(body, 1/120, 0);
  }
  assert.equal(rope[0].x, 100); assert.equal(rope[0].y, 0);
  assert.ok(Math.abs(body.angle - Math.atan2(body.cx, body.cy)) < .001);
  for (const p of rope) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  for (let i = 1; i < rope.length; i++) assert.ok(Math.abs(Math.hypot(rope[i].x-rope[i-1].x, rope[i].y-rope[i-1].y) - 220/18) < .6);
  const symmetric = { cx:0, cy:40, inertia:2000, angle:.2, spin:0 };
  for(let i=0;i<2400;i++) stepAngle(symmetric,1/120,0);
  assert.ok(Math.abs(symmetric.angle) < .001);
  function letter() { return {points:makeRope(0,100),angle:0,spin:0,ax:0,ay:0,cx:0,cy:20,inertia:600,left:-20,right:20,top:0,bottom:40}; }
  const slow=letter(), fast=letter(), reverse=letter(), miss=letter(), edge=letter();
  assert.ok(brush(slow,{x:-30,y:120},{x:30,y:120},.1));
  assert.ok(brush(fast,{x:-60,y:120},{x:60,y:120},.02));
  assert.ok(brush(reverse,{x:60,y:120},{x:-60,y:120},.02));
  assert.ok(fast.points.at(-1).px < slow.points.at(-1).px);
  assert.ok(reverse.points.at(-1).px > 0);
  assert.equal(brush(miss,{x:-60,y:170},{x:60,y:170},.02),false);
  assert.equal(brush(miss,{x:0,y:120},{x:0,y:120},.02),false);
  assert.equal(brush(miss,{x:-60,y:120},{x:60,y:120},1),false);
  brush(edge,{x:-60,y:138},{x:60,y:138},.02);
  assert.ok(Math.abs(edge.spin) > Math.abs(fast.spin));
  console.log('PASS: entrance drop and settling; sweep direction, speed, skipped-frame crossing, edge torque, misses and idle; fixed anchor, rope length constraints, drag/release stability, centroid equilibrium, angular damping');
})();
