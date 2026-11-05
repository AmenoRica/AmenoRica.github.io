const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
(async () => {
  const {inkFrames} = await import(pathToFileURL(path.resolve('public/blog/theme-ink.mjs')));
  const physics = await import(pathToFileURL(path.resolve('public/blog/hanging-physics.mjs')));
  function element() {
    const handlers = {};
    return {handlers,style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(key,value){this[key]=value},addEventListener(type,fn){handlers[type]=fn},getBoundingClientRect:()=>({left:0,top:0,width:1000,height:460}),setPointerCapture(){},hasPointerCapture:()=>false};
  }
  function canvas() {
    const c = element();
    const context = new Proxy({getImageData(){
      const data = new Uint8ClampedArray(c.width*c.height*4);
      for(let y=120;y<220;y++) for(let x=80;x<150;x++) data[(y*c.width+x)*4+3]=255;
      return {data};
    }},{get:(object,key)=>key in object ? object[key] : ()=>{}});
    c.getContext=()=>context; return c;
  }
  const main=canvas(), effects=canvas(), button=element(), themeInk=element(), keys=Array.from({length:7},element);
  const motion={matches:false,addEventListener(_,fn){this.change=fn}};
  const system={matches:true,addEventListener(_,fn){this.change=fn}};
  const document={...element(),hidden:false,documentElement:element(),fonts:{load:async()=>{}},createElement:canvas,
    querySelector:selector=>({'#hanging-canvas':main,'#confetti':effects,'.theme-toggle':button,'#theme-ink':themeInk})[selector],querySelectorAll:()=>keys};
  let next, time=0;
  const sandbox={physics,inkFrames,document,window:element(),innerWidth:1000,innerHeight:800,devicePixelRatio:1,
    matchMedia:q=>q.includes('reduced')?motion:system,ResizeObserver:class{observe(){}},
    requestAnimationFrame:fn=>{next=fn;return 1},cancelAnimationFrame:()=>{next=undefined}};
  let savedTheme=null;
  sandbox.window.blogTheme={read:()=>savedTheme,save:value=>{savedTheme=value}};
  vm.createContext(sandbox);
  const mode=fs.readFileSync('public/blog/theme-mode.mjs','utf8').replace(/^import .*?;\n/,'').replace('export function','function');
  vm.runInContext(mode,sandbox);
  let source=fs.readFileSync('public/blog/hanging-title.js','utf8').replace(/import \{ createTheme \} from .*?;\n/, '').replace(/^import .*?;\n/, 'const {makeRope,stepRope,stepAngle,brush,liftRope}=physics;\n');
  source += '\nreturn {get bodies(){return bodies},get egg(){return egg},get puff(){return puff},get particles(){return particles},get clock(){return clock}};';
  const api=await vm.runInContext('(async()=>{'+source+'})()',sandbox);
  function frames(n){for(let i=0;i<n;i++){assert.ok(next);next(time+=1000/60)}}
  function pull(amount,type='pointerup'){
    const b=api.bodies[3], end=b.points.at(-1);
    const cx=b.cx*Math.cos(b.angle)-b.cy*Math.sin(b.angle),cy=b.cx*Math.sin(b.angle)+b.cy*Math.cos(b.angle);
    main.handlers.pointerdown({pointerId:1,pointerType:'mouse',button:0,clientX:end.x+cx,clientY:end.y+cy});
    main.handlers.pointermove({pointerId:1,pointerType:'mouse',clientX:end.x+cx,clientY:b.length+cy+amount,timeStamp:time});
    main.handlers[type]({pointerId:1,type});
  }
  frames(300);
  assert.equal(document.documentElement.dataset.theme,'dark');
  system.matches=false;system.change();assert.equal(document.documentElement.dataset.theme,'light');
  system.matches=true;system.change();assert.equal(document.documentElement.dataset.theme,'dark');
  pull(15);assert.equal(api.egg,undefined);
  pull(100,'pointercancel');assert.equal(api.egg,undefined);
  pull(100);assert.ok(api.egg);assert.equal(api.egg.rope.length,19);assert.equal(api.egg.rope[0].y,0);assert.ok(api.egg.returnAt>api.clock+1);assert.equal(document.documentElement.dataset.theme,'dark');
  frames(15);assert.equal(document.documentElement.dataset.theme,'light');assert.ok(api.particles.length>100);assert.equal(api.puff.y,0);assert.ok(api.egg);assert.ok(api.particles.every(p=>p.y<40));
  assert.ok(api.bodies[3].points.at(-1).y<0);
  keys[3].handlers.click();assert.equal(document.documentElement.dataset.theme,'light');
  frames(240);assert.equal(api.egg,undefined);assert.ok(api.bodies[3].points.at(-1).y>150);
  pull(100);frames(15);assert.equal(document.documentElement.dataset.theme,'dark');
  button.handlers.click();assert.equal(document.documentElement.dataset.theme,'light');
  system.matches=true;system.change();assert.equal(document.documentElement.dataset.theme,'light');
  motion.matches=true;motion.change();assert.equal(next,undefined);assert.equal(api.particles.length,0);
  keys[3].handlers.click();assert.equal(document.documentElement.dataset.theme,'dark');assert.equal(api.egg,undefined);
  const framesInk=inkFrames(1000,800);
  const points=frame=>[...frame.clipPath.matchAll(/(-?[\d.]+)px (-?[\d.]+)px/g)].map(m=>[Number(m[1]),Number(m[2])]);
  function inside(polygon,x,y){let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const [a,b]=polygon[i],[c,d]=polygon[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
  }return hit;}
  for(const [x,y] of [[1,1],[999,1],[1,799],[999,799],[500,400]]) {
    assert.ok(inside(points(framesInk[0]),x,y));
    assert.equal(inside(points(framesInk.at(-1)),x,y),false);
  }
  assert.equal(inside(points(framesInk[3]),500,20),false);
  assert.ok(inside(points(framesInk[3]),500,799));
  motion.matches=false;motion.change();
  const animations=[];
  themeInk.animate=(keyframes,options)=>{animations.push({keyframes,options});return {finished:Promise.resolve(),cancel(){}}};
  button.handlers.click();button.handlers.click();
  assert.equal(document.documentElement.dataset.theme,'dark');
  await Promise.resolve();await Promise.resolve();
  assert.equal(themeInk.hidden,true);
  button.handlers.click();assert.equal(themeInk.hidden,false);
  assert.equal(document.documentElement.dataset.theme,'light');
  assert.equal(animations.at(-1).options.duration,1050);
  assert.equal(animations.at(-1).keyframes.length,17);
  await Promise.resolve();assert.equal(themeInk.hidden,true);
  assert.equal(savedTheme,true);
  savedTheme=false;sandbox.window.handlers.pageshow();assert.equal(document.documentElement.dataset.theme,'dark');
  savedTheme=true;sandbox.window.handlers.pageshow();assert.equal(document.documentElement.dataset.theme,'light');
  const bootstrap=fs.readFileSync('public/blog/theme-preference.js','utf8');
  const boot={window:{},document:{documentElement:{dataset:{}}},sessionStorage:{getItem:()=> 'dark'},matchMedia:()=>({matches:false})};
  vm.runInNewContext(bootstrap,boot);assert.equal(boot.document.documentElement.dataset.theme,'dark');
  boot.sessionStorage.getItem=()=>null;vm.runInNewContext(bootstrap,boot);assert.equal(boot.document.documentElement.dataset.theme,'light');
  boot.sessionStorage.getItem=()=>{throw new Error('Storage blocked')};vm.runInNewContext(bootstrap,boot);assert.equal(boot.document.documentElement.dataset.theme,'light');
  console.log('PASS: saved theme before first paint, pageshow restoration, browser fallback and blocked storage; ink origin, full viewport coverage, rapid theme reversal, animated transition; system theme, manual override, short pull, cancel, whole rope pluck, overhead burst once, confetti, offscreen return, repeat toggle, button, reduced motion');
})();
