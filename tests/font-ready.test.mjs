import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('문구는 필요한 글꼴 모두 준비된 뒤 표시하며 실패해도 숨겨진 채 남지 않는다', async () => {
 const classes = new Set(), pending=[], requests=[];
 const element={dataset:{fonts:'400 30px "Pretendard"|400 30px "IBM Plex Mono"'},textContent:'Fun-driven developer',classList:{add: name=>classes.add(name)}};
 const document={querySelectorAll:()=>[element],fonts:{load:(font,text)=>{requests.push([font,text]);return new Promise((resolve,reject)=>pending.push({resolve,reject}));}}};
 vm.runInNewContext(readFileSync('public/font-ready.js','utf8'),{document});
 assert.equal(classes.size,0);assert.equal(requests.length,2);
 assert.equal(requests[0][1],'Fun-driven developer');
 pending[0].resolve([{}]);await new Promise(setImmediate);assert.equal(classes.size,0);
 pending[1].reject(new Error('font offline'));await new Promise(setImmediate);
 assert.ok(classes.has('fonts-ready'));
});
