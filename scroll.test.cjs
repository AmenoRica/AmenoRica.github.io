const assert = require('node:assert/strict');
const {projectTransition, groupProjectRows, wrapCarousel} = require('./scroll.js');
assert.equal(projectTransition(-10, 800, false), 0);
assert.equal(projectTransition(400, 800, false), .5);
assert.equal(projectTransition(800, 800, false), 1);
assert.equal(projectTransition(1200, 800, false), 1);
assert.equal(projectTransition(399, 800, true), 0);
assert.equal(projectTransition(400, 800, true), 1);
assert.equal(projectTransition(0, 0, false), 0);
assert.equal(projectTransition(800, 1600, false), .5);
assert.equal(projectTransition(1600, 1600, false), 1);
console.log('Scroll transition: boundaries, midpoint, reduced motion passed');

for (const count of [0, 1, 2, 3, 4, 5, 10]) {
  const rows = Array.from({length: count}, (_, id) => ({id}));
  const screens = groupProjectRows(rows);
  assert.equal(screens.length, Math.ceil(count / 2));
  assert.deepEqual(screens.flat(), rows);
  assert.equal(rows.length, count);
  screens.forEach((screen, index) => assert.equal(screen.length, Math.min(2, count - index * 2)));
}
console.log('Pagination: empty, odd, even, order and original group identity passed');

assert.equal(wrapCarousel(550, 552), 1102);
assert.equal(wrapCarousel(1104, 552), 552);
assert.equal(wrapCarousel(-1, 552), 1103);
assert.equal(wrapCarousel(20, 0), 0);

