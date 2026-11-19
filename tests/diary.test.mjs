import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveMonths, monthTarget, visibleDiary} from '../src/lib/diary.mjs';
const post = (date, id = 'real', draft = false, category = 'diary') => ({id, data:{createdAt:date, draft, category:{id:category}}});
test('archive preserves missing months and crosses year boundaries', () => {
 assert.deepEqual(archiveMonths([]), []);
 assert.deepEqual(archiveMonths([post('2026-02-02'),post('2025-12-03'),post('2026-02-01')]), ['2026-02','2026-01','2025-12']);
 assert.equal(monthTarget(['2026-02','2025-12'], '2026-01'), '2025-12');
 assert.equal(monthTarget(['2026-02','2025-12'], '2026-02'), '2026-02');
});
test('only explicitly named sample drafts appear in development', () => {
 assert.equal(visibleDiary(post('2026-01-01')), true);
 assert.equal(visibleDiary(post('2026-01-01', 'real', true), true), false);
 assert.equal(visibleDiary(post('2026-01-01', 'sample-diary-one', true), true), true);
 assert.equal(visibleDiary(post('2026-01-01', 'sample-diary-one', true)), false);
 assert.equal(visibleDiary(post('2026-01-01', 'real', false, 'weblog'), true), false);
});
