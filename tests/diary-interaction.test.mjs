import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {archiveMonths,monthTarget} from '../src/lib/diary.mjs';
function setup(reduce = false, fade = false, desktop = false) {
 const elements = new Map(), frames = new Map();
 let time = 0, nextId = 0, y = 0;
 const scrolls = [];
 const node = id => {
  const listeners = {}, classes = new Set();
  const el = {id,value:'0',style:{setProperty(k,v){this[k]=v;}},dataset:{},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)},
   addEventListener(type, fn){(listeners[type] ??= []).push(fn);},
   fire(type, data={}){for(const fn of listeners[type] ?? []) fn({preventDefault(){},target:el,...data});},
   setAttribute(key,value){this[key]=value;},setPointerCapture(){},focus(){},closest(){return null;},
   getBoundingClientRect(){return {top:(this.top ?? 500) - y,bottom:this.top === undefined ? 280 : this.top - y + 240,height:240};},scrollIntoView(){this.visited=true;}};
  elements.set(id,el);return el;
 };
 const groups=['2026-11','2026-08','2025-12'].map((month,i)=>{const el=node(`month-${month}`);el.dataset.month=month;el.top=304+i*900;return el;});
 for (const id of ['month-dial','dial','month-label','month-status','newer','older','month-control','dial-help','entry-dialog','close-entry']) node(id);
 const records=node('records');
 Object.assign(records,{scrollHeight:5000,clientHeight:520,getBoundingClientRect:()=>({top:280}),scrollTo:({top})=>{y=Math.round(top);scrolls.push(y);}});
 Object.defineProperty(records,'scrollTop',{get:()=>y});
 const choices=['2026-12','2026-11','2026-09','2026-08','2025-12','2025-01'].map(month=>{const el=node(month);el.dataset.month=month;return el;});
 const media=node('media');media.matches=desktop;
 const nav=node('ody > nav');nav.getBoundingClientRect=()=>({bottom:84});
 const win=node('window');win.matchMedia=query=>query.includes('min-width')?media:({matches:reduce,addEventListener(){}});
 win.scrollTo=()=>assert.fail('Window must not scroll');
 const context={getComputedStyle:()=>({paddingTop:'24px'}),setTimeout:()=>1,clearTimeout(){},archiveMonths,monthTarget,console,innerWidth:1200,innerHeight:800,get scrollY(){return y;},performance:{now:()=>time},
  requestAnimationFrame:fn=>{frames.set(++nextId,fn);return nextId;},cancelAnimationFrame:id=>frames.delete(id),window:win,
  document:{querySelectorAll:selector=>selector==='.month-group'?groups:selector==='.month-choice'?choices:[],querySelector:selector=>elements.get(selector.slice(1)),getElementById:id=>elements.get(id),documentElement:{scrollHeight:5000,style:{}}}};
 vm.runInNewContext(readFileSync('src/scripts/diary.js','utf8').replace(/^import .*;\n/,''),context);
 return {get:id=>elements.get(id),groups,win,frames,scrolls,get y(){return y;},settle(){for(let i=0;i<240 && frames.size;i++)this.advance(16);},advance(ms){time+=ms;const batch=[...frames];frames.clear();for(const [,fn] of batch)fn(time);}};
}
test('month clicks smoothly reach empty-month boundaries and keep the requested selection', () => {
 const state=setup();state.get('2026-09').fire('click');
 assert.equal(state.get('2026-09')['aria-pressed'],'true');assert.equal(state.y,0);
 state.advance(16);assert.ok(state.y>0 && state.y<900);state.settle();assert.equal(state.y,900);
 assert.match(state.get('month-status').textContent,/기록 없는 달/);
 state.get('records').fire('scroll');state.advance(16);assert.equal(state.get('2026-09')['aria-pressed'],'true');
 state.get('2026-12').fire('click');state.settle();assert.equal(state.y,0);
 state.get('2025-01').fire('click');state.settle();assert.equal(state.y,1800);
});
test('manual scrolling interrupts animation and synchronizes the selected month', () => {
 const state=setup();state.get('2025-12').fire('click');state.advance(16);
 const y=state.y;state.get('records').fire('wheel');state.advance(100);assert.equal(state.y,y);
 state.groups[1].top=y+300;state.get('records').fire('scroll');state.advance(16);
 assert.equal(state.get('2026-08')['aria-pressed'],'true');
 assert.equal(state.get('2025-12')['aria-pressed'],'false');
});
test('reduced motion scrolls only the list and its fade stays at the container edge', () => {
 const state=setup(true,true,true);state.get('2026-08').fire('click');assert.equal(state.y,900);
 state.advance(16);assert.equal(state.get('records').style['--fade-edge'],'0px');
 state.get('media').matches=false;state.win.fire('resize');state.advance(16);
 assert.equal(state.get('records').style['--fade-edge'],'0px');
});

test('calendar and list scrollbar timers reset independently', () => {
 const timers=new Map();let id=0;
 const scroller=()=>{const classes=new Set();return {classes,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},addEventListener(type,fn){this.scroll=fn;}};};
 const calendar=scroller(),records=scroller();
 const source=readFileSync('src/scripts/diary.js','utf8').split("const calendar =")[1];
 vm.runInNewContext('const calendar ='+source,{
  records,document:{querySelector:()=>calendar},
  setTimeout:(fn,delay)=>{assert.equal(delay,600);timers.set(++id,fn);return id;},
  clearTimeout:key=>timers.delete(key)
 });
 calendar.scroll();records.scroll();calendar.scroll();
 assert.equal(timers.size,2);assert.ok(calendar.classes.has('is-scrolling'));assert.ok(records.classes.has('is-scrolling'));
 timers.get(2)();assert.equal(records.classes.size,0);assert.equal(calendar.classes.size,1);
 timers.get(3)();assert.equal(calendar.classes.size,0);
});

test('keeps the newest month selected when all records fit without scrolling', () => {
 const state = setup();
 const records = state.get('records');
 records.scrollHeight = records.clientHeight;
 records.fire('scroll');
 state.advance(16);
 assert.equal(state.get('2026-11')['aria-pressed'], 'true');
});
