import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup(reduced = false, mobile = false) {
 const node = () => ({handlers:{},addEventListener(type,fn){this.handlers[type]=fn;}});
 const dialog=node(), button=node(), close=node();
 Object.assign(dialog,{style:{},clientWidth:390,setPointerCapture(){},hasPointerCapture(){return true;},releasePointerCapture(){}});
 let finish, animations=0, y=480, focus;
 const root={style:{overflow:'hidden'}};
 const records={get scrollTop(){return y;},scrollTo:({top})=>y=top};
 const content={replaceChildren(){},querySelector(){return {};}};
 Object.assign(button,{dataset:{entry:'sample'},focus(options){focus=options;}});
 Object.assign(dialog,{
  getBoundingClientRect(){return {left:244,right:1200,top:84,bottom:800};},
  showModal(){this.open=true;},close(){this.open=false;this.handlers.close();},
  animate(){animations++;return {finished:new Promise(resolve=>finish=resolve),cancel(){}};}
 });
 vm.runInNewContext(readFileSync('src/scripts/diary.js','utf8').split("const calendar =")[0].split("const dialog = document.querySelector('#entry-dialog');")[1].replace(/^/,"const records = document.querySelector('#records');const dialog = document.querySelector('#entry-dialog');"),{
  document:{documentElement:root,querySelector:s=>({'#records':records,'#entry-dialog':dialog,'#entry-content':content,'.close-entry':close}[s]),querySelectorAll:()=>[button],getElementById:()=>({content:{cloneNode(){return {};}}})},
  get scrollY(){return y;},getComputedStyle:()=>({transform:'matrix(1, 0, 0, 1, 0, 0)'}),
  performance:{now:()=>1000},window:{matchMedia:q=>({matches:q.includes('max-width')?mobile:reduced}),scrollTo:()=>assert.fail('Window must not scroll')}
 });
 button.handlers.click();
 return {dialog,close,root,get y(){return y;},get focus(){return focus;},get animations(){return animations;},finish:()=>finish()};
}
test('close waits for slide-out, ignores repeat requests, and restores list position/focus',async()=>{
 const s=setup();const pending=s.close.handlers.click();
 let prevented=false;s.dialog.handlers.cancel({preventDefault(){prevented=true;}});
 assert.ok(prevented);assert.equal(s.animations,1);assert.equal(s.dialog.open,true);assert.equal(s.root.style.overflow,'hidden');
 s.finish();await pending;
 assert.equal(s.dialog.open,false);assert.equal(s.root.style.overflow,'hidden');assert.equal(s.y,480);assert.equal(s.focus.preventScroll,true);
});
test('Escape closes immediately for reduced motion',()=>{
 const s=setup(true);s.dialog.handlers.cancel({preventDefault(){}});
 assert.equal(s.animations,0);assert.equal(s.dialog.open,false);assert.equal(s.y,480);
});

test('outside click slides out; content and panel padding clicks leave reader open',async()=>{
 const s=setup();
 s.dialog.handlers.click({target:{},clientX:300,clientY:200});
 s.dialog.handlers.click({target:s.dialog,clientX:260,clientY:100});
 assert.equal(s.animations,0);assert.equal(s.dialog.open,true);
 s.dialog.handlers.click({target:s.dialog,clientX:100,clientY:200});
 assert.equal(s.animations,1);assert.equal(s.dialog.open,true);
 s.finish();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(s.dialog.open,false);assert.equal(s.y,480);assert.equal(s.focus.preventScroll,true);
});

function pointer(s,type,x,y,time=0){return s.dialog.handlers[type]({type,pointerType:'touch',isPrimary:true,pointerId:1,clientX:x,clientY:y,timeStamp:time,target:{closest(){return null;}}});}
test('mobile swipe follows finger, closes at distance and restores position',async()=>{
 const s=setup(false,true);pointer(s,'pointerdown',260,200);pointer(s,'pointermove',400,205,200);
 assert.equal(s.dialog.style.transform,'translateX(140px)');
 const done=pointer(s,'pointerup',400,205,220);assert.equal(s.dialog.open,true);s.finish();await done;
 assert.equal(s.dialog.open,false);assert.equal(s.y,480);assert.equal(s.dialog.style.transform,'');
});
test('short swipe returns; vertical scrolling and desktop touch do not drag',async()=>{
 const s=setup(false,true);pointer(s,'pointerdown',260,200);pointer(s,'pointermove',280,201,200);
 const done=pointer(s,'pointerup',280,201,220);s.finish();await done;
 assert.equal(s.dialog.open,true);assert.equal(s.dialog.style.transform,'');
 pointer(s,'pointerdown',260,200);pointer(s,'pointermove',265,250,250);assert.equal(s.dialog.style.transform,'');
 const desktop=setup();pointer(desktop,'pointerdown',260,200);pointer(desktop,'pointermove',500,200,200);assert.equal(desktop.dialog.style.transform,undefined);
});
test('fast swipe closes; cancelled swipe returns even beyond threshold',async()=>{
 const s=setup(false,true);pointer(s,'pointerdown',260,200);pointer(s,'pointermove',320,200,50);
 const done=pointer(s,'pointerup',320,200,60);s.finish();await done;assert.equal(s.dialog.open,false);
 const cancelled=setup(false,true);pointer(cancelled,'pointerdown',260,200);pointer(cancelled,'pointermove',450,200,200);
 const reset=pointer(cancelled,'pointercancel',450,200,220);cancelled.finish();await reset;assert.equal(cancelled.dialog.open,true);
});
