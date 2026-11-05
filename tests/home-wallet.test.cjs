const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(`${__dirname}/../public/wallet.js`, 'utf8');
const address = '0x2E8E6C2e217D95a0b1454C96D2A22Feb1fA209dF';
for (const fails of [false, true]) test(`copy address: ${fails ? 'denied' : 'success'}`, async () => {
  let click, copied, dismiss, visible=false;
  const button = {textContent:address, addEventListener:(_,fn)=>click=fn};
  const status = {classList:{add:()=>visible=true,remove:()=>visible=false}};
  const nodes = {'#eth-address':button,'#wallet-status':status};
  vm.runInNewContext(source,{document:{querySelector:s=>nodes[s]},setTimeout:fn=>{dismiss=fn;return 1},clearTimeout:()=>{},navigator:{clipboard:{writeText:async text=>{if(fails)throw Error('denied');copied=text;}}}});
  await click();
  assert.equal(visible,true);
  if (fails) assert.match(status.textContent,/복사 실패/);
  else {assert.equal(copied,address);assert.equal(status.textContent,'복사됨!');}
  dismiss();assert.equal(visible,false);assert.equal(status.textContent,'');
});
