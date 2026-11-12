import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('scene assets start together, omit the unused clock, and propagate failures', async () => {
  const source = readFileSync('public/glass-mobile.js', 'utf8');
  const setup = source.split('async function start() {')[1].split('  renderer.setPixelRatio')[0];
  const run = new (Object.getPrototypeOf(async function(){}).constructor)('T', 'GLTFLoader', 'Image', 'document', 'toy', setup);
  const requests = [], pending = [];
  const load = url => { requests.push(url); return new Promise((resolve, reject) => pending.push({ resolve, reject })); };
  class Loader { loadAsync(url) { return load(url); } }
  class Sprite { decode() { return load(this.src); } }
  const args = [{ TextureLoader: Loader }, Loader, Sprite, { body: { dataset: { workshop: 'theme' } } }, false];
  const ready = run(...args);
  assert.equal(requests.length, 8);
  assert.equal(requests.filter(url => url.endsWith('.webp')).length, 2);
  assert.ok(!requests.some(url => url.includes('digital-clock')));
  assert.equal(requests.filter(url => url.endsWith('-wire.glb')).length, 2);
  pending.forEach(item => item.resolve({ scene: {} }));
  await ready;
  pending.length = 0;
  const failed = run(...args);
  pending[0].reject(new Error('offline'));
  pending.slice(1).forEach(item => item.resolve({ scene: {} }));
  await assert.rejects(failed, /offline/);
});

test('wire assets retain every geometry buffer byte', () => {
  function parse(name) {
    const buffer = readFileSync(`public/assets/mobile-models/${name}.glb`);
    const length = buffer.readUInt32LE(12);
    return { json: JSON.parse(buffer.subarray(20, 20 + length)), bin: buffer.subarray(28 + length) };
  }
  for (const name of ['electric-guitar', 'cassette-reels']) {
    const before = parse(name), after = parse(name + '-wire');
    assert.equal(after.json.images, undefined);
    assert.deepEqual(after.json.meshes, before.json.meshes);
    for (let i = 0; i < before.json.accessors.length; i++) {
      const a = before.json.accessors[i], b = after.json.accessors[i];
      assert.deepEqual({...a, bufferView: 0}, {...b, bufferView: 0});
      const av = before.json.bufferViews[a.bufferView], bv = after.json.bufferViews[b.bufferView];
      assert.deepEqual(before.bin.subarray(av.byteOffset || 0, (av.byteOffset || 0) + av.byteLength), after.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength));
    }
  }
});

test('overlap checks run immediately, then at 20 Hz with accumulated time', () => {
  const source = readFileSync('public/glass-mobile.js', 'utf8');
  const initial = source.match(/let overlapElapsed = ([^;]+);/)[1];
  const block = source.slice(source.indexOf('    overlapElapsed += dt;'), source.indexOf('    for(const m of mobiles){', source.indexOf('    overlapElapsed += dt;')));
  const calls = [];
  const step = new Function('separatePieces', `let overlapElapsed = ${initial}; return dt => {${block}};`)(dt => calls.push(dt));
  step(1/60); assert.equal(calls.length, 1);
  step(1/60); step(1/60); assert.equal(calls.length, 1);
  step(1/60); assert.equal(calls.length, 2);
  assert.ok(Math.abs(calls[1] - .05) < 1e-9);
});

test('first-frame timing never advances the simulation backwards', () => {
  const source = readFileSync('public/glass-mobile.js', 'utf8');
  const expression = source.match(/const dt=(.*?);last=now/)[1];
  const delta = new Function('now', 'last', `return ${expression}`);
  assert.equal(delta(99, 100), 0);
  assert.equal(delta(1000, 0), .04);
  assert.ok(source.includes('yawSpeed:0,overlap:0'));
});

test('each cloned logo can finish loading its own font independently', () => {
  const html = readFileSync('public/index.html', 'utf8');
  assert.ok(html.indexOf('src="scroll.js') < html.indexOf('src="/font-ready.js'));
  const dock = html.slice(html.indexOf('<nav class="project-dock"'));
  assert.equal((dock.match(/data-fonts=/g) || []).length, 3);
  assert.ok(!dock.includes('ugcatalog Logo'));
  assert.ok(!dock.includes('Bukichi Logo'));
});

test('background stays near 60 Hz on 60/120/144 Hz displays without slowing time', () => {
  const source = readFileSync('public/glass-mobile.js', 'utf8');
  const gate = source.slice(source.indexOf('    if(paused||document.hidden||!visible)'), source.indexOf('    time+=dt;'));
  for (const hz of [60,120,144]) {
    const step = new Function(`let last=0,nextFrame=0;const document={hidden:false},paused=false,visible=true;return now=>{${gate}return dt;};`)();
    const times=[];
    for(let i=0;i<hz*10;i++){const dt=step(i*1000/hz);if(dt!==undefined)times.push(dt);}
    assert.ok(times.length >= 599 && times.length <= 601, `${hz} Hz: ${times.length} frames`);
    assert.ok(times.reduce((a,b)=>a+b,0)>9.95);
  }
});
