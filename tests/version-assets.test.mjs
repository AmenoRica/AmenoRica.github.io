import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {versionAssets} from '../scripts/version-assets.mjs';

const fixture = {
 'blog/index.html': `<link rel="stylesheet" href="../style.css?v=manual&amp;theme=light#x"><script src="/entry.js"></script><script type="module">import '../entry.js'; import('../child.mjs');</script><script type="importmap">{"imports":{"three":"/child.mjs","remote":"https://example.com/remote.js"}}</script><script type="application/ld+json">{"url":"/entry.js"}</script><pre>&lt;script src="/entry.js"&gt;</pre><a href="/entry.js">download</a><style>@import '../other.css';</style>`,
 'entry.js': `import './child.mjs'; export {x} from './child.mjs'; import('./child.mjs'); import('external-package'); const text="./child.mjs"; // import './example.js'\n`,
 'child.mjs': 'export const x = 1;',
 'style.css': `@import url(other.css); @import 'other.css'; body{background:url(photo.png)}`,
 'other.css': 'body{color:black}',
};
async function buildFixture(change={}) {
 const root=await mkdtemp(join(tmpdir(),'asset-version-'));
 await mkdir(join(root,'blog'));
 for (const [name,text] of Object.entries({...fixture,...change})) await writeFile(join(root,name),text);
 return root;
}
test('versions local CSS/JS, nested imports and import maps without rewriting content or external URLs',async()=>{
 const root=await buildFixture();
 try {
  const v=await versionAssets(root), html=await readFile(join(root,'blog/index.html'),'utf8');
  assert.match(html,new RegExp(`style.css\\?v=${v}&amp;theme=light#x`));
  assert.ok(html.includes(`src="/entry.js?v=${v}"`));
  assert.ok(html.includes(`import '../entry.js?v=${v}'`));
  assert.ok(html.includes(`import("../child.mjs?v=${v}")`));
  assert.ok(html.includes(`"three":"/child.mjs?v=${v}"`));
  assert.ok(html.includes('https://example.com/remote.js'));
  assert.ok(html.includes('<pre>&lt;script src="/entry.js"&gt;</pre>'));
  assert.ok(html.includes('<a href="/entry.js">download</a>'));
  assert.ok(html.includes('{"url":"/entry.js"}'));
  const js=await readFile(join(root,'entry.js'),'utf8');
  assert.equal(js.split(`child.mjs?v=${v}`).length-1,3);
  assert.ok(js.includes('const text="./child.mjs"'));
  assert.ok(js.includes("// import './example.js'"));
  assert.ok(js.includes("import('external-package')"));
  const css=await readFile(join(root,'style.css'),'utf8');
  assert.equal(css.split(`other.css?v=${v}`).length-1,2);
  assert.ok(css.includes('url(photo.png)'));
 } finally {await rm(root,{recursive:true,force:true});}
});
test('identical clean builds keep version; changing nested JS or CSS refreshes entry URLs',async()=>{
 const roots=await Promise.all([buildFixture(),buildFixture(),buildFixture({'child.mjs':'export const x = 2;'}),buildFixture({'other.css':'body{color:white}'})]);
 try {
  const versions=await Promise.all(roots.map(versionAssets));
  assert.equal(versions[0],versions[1]);assert.notEqual(versions[0],versions[2]);assert.notEqual(versions[0],versions[3]);
  for (let i=0;i<roots.length;i++) assert.ok((await readFile(join(roots[i],'blog/index.html'),'utf8')).includes(`/entry.js?v=${versions[i]}`));
 } finally {await Promise.all(roots.map(root=>rm(root,{recursive:true,force:true})));}
});
