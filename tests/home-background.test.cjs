function loadClassic(name) { const module = {exports:{}}; new Function('module', require('node:fs').readFileSync(__dirname+'/../public/'+name,'utf8'))(module); return module.exports; }
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let next=0,frames=new Map(),resize,history,themeChange;
const light={matches:false,addEventListener:(_,fn)=>themeChange=fn};
function canvas(){const context={clears:0,fills:0,commits:0,moveTo(){},lineTo(){},bezierCurveTo(){},closePath(){},fill(){},fillRect(){this.fills++;},drawImage(...args){this.commits++;this.lastDraw=args;},save(){},restore(){},scale(){},translate(){},rotate(){},beginPath(){},rect(){},clip(){},setTransform(){},clearRect(){this.clears++;}};return {width:300,height:150,dataset:{},getContext:()=>context};}
const visible=canvas(),curtain=canvas();let created=0;
const window={addEventListener:(_,fn)=>resize=fn,AmenoPatterns:{choosePath:loadClassic('patterns.js').choosePath,makeStrip:()=>({height:100,width:4200})}};
const env={window,matchMedia:()=>light,document:{querySelector:selector=>selector==='.ink-curtain'?curtain:visible,createElement:()=>{const c=canvas();if(!created++)history=c;return c;}},innerWidth:800,innerHeight:600,devicePixelRatio:2,Image:class{set src(v){this.onload();}},console,requestAnimationFrame:fn=>{frames.set(++next,fn);return next;},cancelAnimationFrame:id=>frames.delete(id)};
vm.runInNewContext(fs.readFileSync(__dirname+'/../public/background.js','utf8'),env);
const api=window.AmenoBackground;
assert.deepEqual(Array.from(visible.getContext().lastDraw.slice(1)),[1648,1748,800,600,1648,1748,800,600]);
const emptyCurtainClears=curtain.getContext().clears;
const advance=t=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));};
let time=100;
for(let i=0;i<50;i++){
 const prior=history.getContext().commits;
 api.start('developer');assert(api.busy);
 for(let j=0;j<6;j++)advance(time+=40);
 api.setPaused(true);assert.equal(frames.size,0);assert(api.busy);
 api.setPaused(false);
 for(let j=0;j<65;j++)advance(time+=40);
 assert(!api.busy);assert.equal(history.getContext().commits,prior+1);
}
assert.equal(visible.dataset.strokes,'50');
assert.equal(curtain.getContext().clears,emptyCurtainClears,'Ordinary strokes do not repaint the empty curtain');
const originalWidth=history.width, originalHeight=history.height, commits=history.getContext().commits;
env.innerWidth=320;resize();assert.equal(history.width,originalWidth);assert.equal(history.height,originalHeight);assert.equal(history.getContext().commits,commits);assert.equal(visible.width,480);assert.equal(visible.dataset.strokes,'50');
api.start('artist');api.cancel();assert(!api.busy);assert.equal(frames.size,0);
console.log('PASS: 50 accumulated marks, paint completion, pause/resume, DPR cap, resize preservation and cancellation.');

const strokesBefore=visible.dataset.strokes;api.start('designer');assert(api.busy);for(let i=0;i<26;i++)advance(time+=40);assert(!api.busy);assert.equal(Number(visible.dataset.strokes),Number(strokesBefore)+1);console.log('PASS: designer ink stroke finishes in under 1 second.');

const clearCount=history.getContext().clears;
api.flood();assert(api.busy);advance(time+=40);api.setPaused(true);assert.equal(frames.size,0);assert(api.busy);
api.setPaused(false);for(let i=0;i<50;i++)advance(time+=40);
assert(!api.busy);assert.equal(visible.dataset.strokes,'0');assert.equal(history.getContext().clears,clearCount+1);
assert(curtain.getContext().fills>0,'Screen is fully covered before resetting the text');
api.reveal();api.start('developer');assert.equal(visible.dataset.strokes,'1');api.cancel();
console.log('PASS: ink flood pauses, fully covers and clears accumulated history before restarting.');

api.start('developer');advance(time+=40);
const preservedStrokes=visible.dataset.strokes, preservedClears=history.getContext().clears;
light.matches=true;themeChange();
assert(api.busy);
assert.equal(visible.dataset.strokes,preservedStrokes);assert.equal(history.getContext().clears,preservedClears);
api.cancel();api.flood();advance(time+=40);
assert.equal(curtain.getContext().fillStyle,'#fff');
light.matches=false;themeChange();assert.equal(curtain.getContext().fillStyle,'#000');assert(api.busy);
light.matches=true;themeChange();for(let i=0;i<50;i++)advance(time+=40);
assert(!api.busy);assert.equal(curtain.getContext().fillStyle,'#fff');
light.matches=false;themeChange();assert.equal(curtain.getContext().fillStyle,'#000');api.reveal();
console.log('PASS: live theme switches preserve strokes and animation; light/dark floods and covered state follow theme.');

api.flood();advance(time+=40);
api.setTheme(true);assert.equal(curtain.getContext().fillStyle,'#fff');
light.matches=false;themeChange();assert.equal(curtain.getContext().fillStyle,'#fff');
api.setTheme(false);assert.equal(curtain.getContext().fillStyle,'#000');
