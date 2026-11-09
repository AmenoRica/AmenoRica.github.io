const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function setup(reducedInitially=false) {
  const classes=new Set(), frames=new Map(), events={}; let id=0, now=0;
  const identity={classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),toggle:(n,on)=>on?classes.add(n):classes.delete(n)}};
  const control={hidden:false,attributes:{},addEventListener:(e,f)=>events.click=f,setAttribute(k,v){this.attributes[k]=v;}};
  const reduced={matches:reducedInitially,addEventListener:(e,f)=>events.reduced=f};
  const document={hidden:false,querySelector:s=>s==='.identity'?identity:control,addEventListener:(e,f)=>events.visibility=f};
  vm.runInNewContext(fs.readFileSync(__dirname+'/../public/motion.js','utf8'),{document,matchMedia:()=>reduced,performance:{now:()=>now},requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i)});
  const tick=t=>{now=t;const pending=[...frames.values()];frames.clear();pending.forEach(f=>f(t));};
  return {classes,frames,events,document,control,reduced,tick};
}
const x=setup();assert(x.classes.has('intro-running'));x.tick(1000);
x.events.click();assert.equal(x.control.attributes['aria-pressed'],'true');assert.equal(x.frames.size,0);
x.events.click();x.tick(1500);assert(x.classes.has('intro-running'));x.tick(2000);assert(!x.classes.has('intro-running'));assert.equal(x.frames.size,0);
const y=setup(true);assert(y.control.hidden);assert.equal(y.frames.size,0);assert(!y.classes.has('intro-running'));
const z=setup();z.document.hidden=true;z.events.visibility();assert.equal(z.frames.size,0);z.document.hidden=false;z.events.visibility();assert.equal(z.frames.size,1);z.reduced.matches=true;z.events.reduced();assert.equal(z.frames.size,0);assert(!z.classes.has('intro-running'));
console.log('PASS: two-second line intro, pause/resume, hidden document, reduced motion');
