import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {inkFrames} from '../public/theme-ink.mjs';

test('snapshot before theme mutation; rapid toggles, system override and reduced motion', async () => {
  let click, systemChange, reducedChange, rendered;
  const system={matches:false,addEventListener:(_,fn)=>systemChange=fn};
  const reduced={matches:false,addEventListener:(_,fn)=>reducedChange=fn};
  const button={setAttribute(){},addEventListener:(_,fn)=>click=fn};
  const transitions=[], animations=[];
  const document={hidden:false,documentElement:{dataset:{},animate:(frames,options)=>{const a={frames,options,cancel(){this.cancelled=true;}};animations.push(a);return a;}},querySelector:()=>button,
    startViewTransition(apply){
      let resolve, finish;
      const t={apply,ready:new Promise(r=>resolve=r),finished:new Promise(r=>finish=r),skipTransition(){this.skipped=true;}};
      t.resolve=resolve;t.finish=finish;transitions.push(t);return t;
    }
  };
  vm.runInNewContext(readFileSync(new URL('../public/theme.mjs',import.meta.url),'utf8').replace(/^import .*;\n/,''),{
    inkFrames, document,innerWidth:800,innerHeight:600,matchMedia:q=>q.includes('reduced')?reduced:system,
    window:{AmenoBackground:{setTheme:value=>rendered=value}}
  });
  assert.equal(rendered,false);
  click();assert.equal(rendered,false,'old theme remains until browser captures it');
  transitions[0].apply();transitions[0].resolve();await Promise.resolve();
  assert.equal(rendered,true);assert.equal(animations[0].options.pseudoElement,'::view-transition-old(root)');
  assert.equal(animations[0].frames.length,17);
  click();assert.equal(animations[0].cancelled,true);click();assert.equal(transitions[1].skipped,true);
  transitions[1].apply();transitions[1].resolve();await Promise.resolve();
  assert.equal(animations.length,1,'stale transition never animates');
  transitions[2].apply();transitions[2].resolve();await Promise.resolve();assert.equal(rendered,true);
  system.matches=false;systemChange();assert.equal(rendered,true);
  reduced.matches=true;reducedChange();assert.equal(transitions[2].skipped,true);
  click();assert.equal(rendered,false);assert.equal(transitions.length,3);
  reduced.matches=false;
  for (let i=0;i<20;i++) {
    click();const t=transitions.at(-1);t.apply();t.resolve();await Promise.resolve();
    assert.equal(animations.filter(a=>!a.cancelled).length,1);
    t.finish();await Promise.resolve();
    assert.equal(animations.filter(a=>!a.cancelled).length,0,'finished effects must not accumulate');
  }
  document.startViewTransition=undefined;
  click();assert.equal(rendered,true,'unsupported browser switches directly');
});
