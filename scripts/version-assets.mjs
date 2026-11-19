import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse as htmlParse, walkSync, ELEMENT_NODE } from 'ultrahtml';
import { init, parse as moduleParse } from 'es-module-lexer/minimal';

export async function versionAssets(directory) {
  const root = resolve(directory);
  const files = (await readdir(root, {recursive:true, withFileTypes:true}))
    .filter(entry => entry.isFile() && /\.(?:html|css|m?js)$/.test(entry.name))
    .map(entry => resolve(entry.parentPath, entry.name)).sort();
  const sources = new Map(await Promise.all(files.map(async file => [file, await readFile(file, 'utf8')])));
  const assets = new Set(files.filter(file => extname(file) !== '.html'));
  const hash = createHash('sha256');
  // One content version also invalidates parents when a nested import changes.
  for (const file of assets) hash.update(relative(root, file)).update('\0').update(sources.get(file)).update('\0');
  const version = hash.digest('hex').slice(0, 16);
  await init();
  const edits = (text, changes) => changes.sort((a,b) => b.start - a.start)
    .reduce((result, {start,end,value}) => result.slice(0,start) + value + result.slice(end), text);
  function assetURL(value, file) {
    if (typeof value !== 'string') return value;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(value)) return value;
    const url = new URL(value, `https://assets.invalid/${relative(root,file)}`);
    const target = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!assets.has(target)) return value;
    url.searchParams.set('v', version);
    return value.split(/[?#]/)[0] + url.search + url.hash;
  }
  function javascript(text, file) {
    const [imports] = moduleParse(text);
    return edits(text, imports.filter(item => item.n && /^(?:\.\.?\/|\/)/.test(item.n)).map(item => ({
      start:item.s, end:item.e,
      value:item.d >= 0 ? JSON.stringify(assetURL(item.n,file)) : assetURL(item.n,file),
    })));
  }
  function css(text, file) {
    return text.replace(/url\(\s*(['"]?)([^'"\s)]+)\1\s*\)|(@import\s+)(['"])([^'"]+)\4/g,
      (match, quote, url, prefix, importQuote, importURL) => url
        ? `url(${quote}${assetURL(url,file)}${quote})`
        : `${prefix}${importQuote}${assetURL(importURL,file)}${importQuote}`);
  }
  function html(text, file) {
    const changes = [];
    walkSync(htmlParse(text), node => {
      if (node.type !== ELEMENT_NODE) return;
      const [open,close] = node.loc;
      const attr = node.name === 'script' ? 'src' : node.name === 'link' ? 'href' : null;
      if (attr && node.attributes[attr]) {
        const tag = text.slice(open.start,open.end);
        const value = tag.replace(new RegExp(`(\\s${attr}\\s*=\\s*)(["'])(.*?)\\2`, 'i'),
          (match,prefix,quote,url) => `${prefix}${quote}${assetURL(url.replaceAll('&amp;','&'),file).replaceAll('&','&amp;')}${quote}`);
        changes.push({start:open.start,end:open.end,value});
      }
      if (node.name === 'script' && !node.attributes.src) {
        const body = text.slice(open.end,close.start);
        let value = body;
        if (!node.attributes.type || ['module','text/javascript','application/javascript'].includes(node.attributes.type)) value = javascript(body,file);
        if (node.attributes.type === 'importmap') {
          const map = JSON.parse(body);
          for (const entries of [map.imports, ...Object.values(map.scopes || {})].filter(Boolean)) {
            for (const key of Object.keys(entries)) entries[key] = assetURL(entries[key],file);
          }
          value = JSON.stringify(map).replaceAll('<','\\u003c');
        }
        if (value !== body) changes.push({start:open.end,end:close.start,value});
      }
      if (node.name === 'style') changes.push({start:open.end,end:close.start,value:css(text.slice(open.end,close.start),file)});
    });
    return edits(text,changes);
  }
  // Prepare all rewrites before writing, so a parse error fails the build first.
  const output = files.map(file => {
    const text = sources.get(file), ext = extname(file);
    return [file, ext === '.html' ? html(text,file) : ext === '.css' ? css(text,file) : javascript(text,file)];
  });
  await Promise.all(output.map(([file,text]) => writeFile(file,text)));
  return version;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(`CSS/JS cache version: ${await versionAssets(process.argv[2] || 'dist')}`);
}
