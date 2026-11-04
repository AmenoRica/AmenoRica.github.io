const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
async function setup(reduce=false,failFonts=false) {
  const intervals=new Map(); let id=0;
  const listeners={};
  function textNode(textContent) { const classes=new Set();return {textContent,classes,classList:{toggle:(key,on)=>on?classes.add(key):classes.delete(key)}}; }
  const title={style:{}}, name=textNode('AmenoRica'), roleText=textNode('developer'), tagline=textNode(''),outro=textNode('');
  const roles=['developer','designer','composer','artist','project manager'];
  const control={addEventListener:(_,f)=>listeners.click=f,setAttribute:(k,v)=>control[k]=v};
  const media={matches:reduce,addEventListener:(_,f)=>listeners.media=f};
  const painted=[];
  const background={ready:Promise.resolve(),busy:false,paused:false,start(role){assert(!this.busy);this.busy=true;painted.push({role,font:title.style.fontFamily,name:name.textContent,text:roleText.textContent});},setPaused(v){this.paused=v;},flood(){assert.equal(outro.textContent,'And…?');assert.equal(painted.length%5,0);this.busy=true;this.flooding=true;},reveal(){this.covered=false;},cancel(){this.busy=false;this.flooding=false;this.covered=false;}};
  const document={hidden:false,querySelector:s=>({'h1':title,'.name-text':name,'.role-text':roleText,'.tagline':tagline,'.outro-text':outro,'.motion-control':control}[s]),querySelectorAll:()=>roles.map(textContent=>({textContent})),addEventListener:(_,f)=>listeners.visibility=f,fonts:{load:async()=>{if(failFonts)throw Error('missing');return [{}];}}};
  vm.runInNewContext(fs.readFileSync(__dirname+'/motion.js','utf8'),{document,window:{AmenoBackground:background},matchMedia:()=>media,setInterval:fn=>{intervals.set(++id,fn);return id;},clearInterval:id=>intervals.delete(id)});
  await new Promise(setImmediate);
  const step=()=>{
    const oldName=name.textContent,oldRole=roleText.textContent;
    for(const tick of intervals.values()) tick();
    assert(!(name.textContent!==oldName && roleText.textContent!==oldRole),'No simultaneous typing');
    assert([name,roleText,outro].filter(node=>node.classes.has('typing')).length<=1,'Only one cursor, including the ending');
  };
  return {intervals,listeners,title,name,roleText,outro,tagline,roles,control,media,document,background,painted,step};
}
(async()=>{
  const x=await setup();
  const fonts=['IBM Plex Mono','DM Sans','Instrument Serif','Cormorant Garamond','Syne','Space Grotesk','Unbounded','Bodoni Moda','Italiana','Playfair Display'];
  for(let cycle=0;cycle<10;cycle++){
    for(let n=0;n<350;n++) {
      x.step();
      if(x.background.flooding) {
        assert.equal(x.outro.textContent,'And…?');
        const startName=x.name.textContent;
        x.step();assert.equal(x.name.textContent,startName.slice(0,-1),'Name deletes while the background ink pours');
        for(let pause=0;pause<30;pause++)x.step();
        assert.equal(x.name.textContent,'','Name is erased by typing, not hidden under ink');
        assert.equal(x.outro.textContent,'And…?','Hold the message during the pour');
        x.background.busy=false;x.background.flooding=false;x.background.covered=true;
      } else if(x.background.busy) break;
    }
    assert(x.background.busy);
    const item=x.painted.at(-1);
    assert.equal(item.role,x.roles[cycle%5]);assert.equal(item.text,item.role);assert.equal(item.name,'AmenoRica');assert(item.font.includes(fonts[cycle]));
    for(let i=0;i<50;i++)x.step();
    assert.equal(x.name.textContent,'AmenoRica');assert.equal(x.roleText.textContent,item.role);
    assert.equal(x.painted.length,cycle+1,'Wait for painting completion');
    x.background.busy=false;
  }
  x.listeners.click();assert.equal(x.intervals.size,0);assert(x.background.paused);
  x.listeners.click();assert.equal(x.intervals.size,1);assert(!x.background.paused);
  x.document.hidden=true;x.listeners.visibility();assert.equal(x.intervals.size,0);assert(x.background.paused);
  x.document.hidden=false;x.listeners.visibility();assert.equal(x.intervals.size,1);
  x.media.matches=true;x.listeners.media();assert.equal(x.intervals.size,0);assert(x.control.hidden);assert(!x.background.busy);assert.equal(x.roleText.textContent,'developer');
  const reduced=await setup(true);assert.equal(reduced.intervals.size,0);assert.equal(reduced.painted.length,0);
  const failed=await setup(false,true);for(let i=0;i<20;i++)failed.step();assert.equal(failed.painted[0].font,'serif');
  console.log('PASS: full-subtitle outro and flood every 5 roles, restart, 10 role/font pairs, sequential typing, wait for paint, pause, visibility, reduced motion, failed fonts.');
})();
