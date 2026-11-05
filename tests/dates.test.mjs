import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayDate, modificationDay } from '../src/lib/dates.mjs';
test('수정일은 첫 저장·동일 날짜에 숨기고 한국 날짜로 계산한다', () => {
 assert.equal(displayDate('2026-11-05'),'2026.11.05');
 assert.equal(modificationDay('', '2026-11-05'),null);
 assert.equal(modificationDay('2026-11-06T10:00:00Z','2026-11-05'),null);
 assert.equal(modificationDay('2026-11-05T12:00:00Z\n2026-11-05T01:00:00Z','2026-11-05'),null);
 assert.equal(modificationDay('2026-11-05T16:00:00Z\n2026-11-05T01:00:00Z','2026-11-05'),'2026-11-06');
});
