import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, symlinkSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
test('Markdown 글·초안·부제목·작성일 및 자동 페이지 수를 빌드한다', () => {
 const folder = mkdtempSync(join(tmpdir(),'amenorica-content-'));
 try {
  cpSync('src',join(folder,'src'),{recursive:true, filter: source => resolve(source) !== resolve('src/content/posts')});
  mkdirSync(join(folder,'src/content/posts'));
  cpSync('astro.config.mjs',join(folder,'astro.config.mjs'));
  writeFileSync(join(folder,'package.json'),'{"type":"module"}');
  symlinkSync(resolve('node_modules'),join(folder,'node_modules'),'dir');
  for (let i=1;i<=14;i++) writeFileSync(join(folder,`src/content/posts/check-${i}.md`),`---\ntitle: "검증 글 ${i}"\ncreatedAt: "2026-11-05"\ncategory: toys\ndraft: ${i === 14}\n${i===1?'subtitle: "검증 부제목"\n':''}---\n\n## 본문\n\n실제 Markdown 내용.\n`);
  execFileSync(process.execPath,[resolve('node_modules/astro/bin/astro.mjs'),'build'],{cwd:folder,env:{...process.env,GITHUB_ACTIONS:'',ASTRO_TELEMETRY_DISABLED:'1'},stdio:'pipe'});
  const list=readFileSync(join(folder,'dist/blog/index.html'),'utf8');
  assert.equal((list.match(/class="post-title-link"/g)||[]).length,13);
  assert.match(list,/data-page="3"/);
  assert.doesNotMatch(list,/검증 글 14|마지막 수정/);
  const article=readFileSync(join(folder,'dist/blog/check-1/index.html'),'utf8');
  assert.match(article,/검증 부제목/);assert.match(article,/2026\.11\.05/);assert.match(article,/실제 Markdown 내용/);
  assert.doesNotMatch(article,/마지막 수정/);
  assert.ok(!existsSync(join(folder,'dist/blog/check-14/index.html')));
 } finally { rmSync(folder,{recursive:true,force:true}); }
});
