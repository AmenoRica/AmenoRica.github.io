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
  for (let i=1;i<=14;i++) writeFileSync(join(folder,`src/content/posts/check-${i}.md`),`---\ntitle: ${JSON.stringify(i === 1 ? '검증 글 1\n두 번째 줄' : `검증 글 ${i}`)}\ncreatedAt: "2026-11-05"\ncategory: toys\ndraft: ${i === 14}\n${i===1?'subtitle: "검증 부제목"\n':''}---\n\n## 본문\n\n실제 Markdown 내용.\n`);
  execFileSync(process.execPath,[resolve('node_modules/astro/bin/astro.mjs'),'build'],{cwd:folder,env:{...process.env,GITHUB_ACTIONS:'',ASTRO_TELEMETRY_DISABLED:'1'},stdio:'pipe'});
  const list=readFileSync(join(folder,'dist/blog/index.html'),'utf8');
  assert.equal((list.match(/class="post-title-link"/g)||[]).length,13);
  assert.match(list,/data-page="3"/);
  assert.match(list,/>검증 글 1 두 번째 줄<\/a>/);
  assert.doesNotMatch(list,/검증 글 14|마지막 수정/);
  const article=readFileSync(join(folder,'dist/blog/check-1/index.html'),'utf8');
  assert.match(article,/검증 부제목/);assert.match(article,/2026\.11\.05/);assert.match(article,/실제 Markdown 내용/);
  assert.doesNotMatch(article,/마지막 수정/);
  assert.match(article,/<h1>검증 글 1<br\s*\/?>두 번째 줄<\/h1>/);
  assert.match(article,/<title>검증 글 1 두 번째 줄 — AmenoRica<\/title>/);
  assert.ok(!existsSync(join(folder,'dist/blog/check-14/index.html')));
  const sitemap = readFileSync(join(folder,'dist/sitemap.xml'),'utf8');
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(new Set(urls), new Set([
   'https://ameno.cc/', 'https://ameno.cc/blog/', 'https://ameno.cc/resume/',
   ...Array.from({length:13}, (_, i) => `https://ameno.cc/blog/check-${i+1}/`),
  ]));
  assert.equal(urls.length, 16);
  assert.doesNotMatch(list + article, /noindex/);
  for (const path of ['public/index.html', 'public/resume/index.html']) {
   assert.doesNotMatch(readFileSync(path,'utf8'), /<meta[^>]*name=["']robots["'][^>]*noindex/);
  }
  assert.match(readFileSync('public/robots.txt','utf8'), /Sitemap: https:\/\/ameno\.cc\/sitemap\.xml/);
 } finally { rmSync(folder,{recursive:true,force:true}); }
});
