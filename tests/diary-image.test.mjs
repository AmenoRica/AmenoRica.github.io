import {test} from 'node:test';
import assert from 'node:assert/strict';
import {photoPreview} from '../src/lib/diary-image.mjs';
test('preview uses first rendered body image, preserves sources and entities, ignores code examples', async () => {
 const html = '<pre>&lt;img src="fake.jpg"&gt;</pre><p><img id="body-image" src="/uploads/first.jpg?a=1&amp;b=2" alt="A &amp; B" width="960" height="720"></p><img src="/later.jpg">';
 const image = await photoPreview(html);
 assert.match(image,/src="\/uploads\/first.jpg\?a=1&amp;b=2"/);
 assert.match(image,/alt="A &amp; B"/);
 assert.match(image,/class="entry-photo"/);
 assert.match(image,/loading="lazy"/);
 assert.doesNotMatch(image,/fake.jpg|later.jpg|body-image/);
 assert.equal(await photoPreview('<p>Text only</p>'),'');
});
