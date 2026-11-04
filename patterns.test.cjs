const assert=require('node:assert/strict');
const {edgePath,choosePath}=require('./patterns.js');
let seed=17;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);

for(const [w,h] of [[320,640],[1440,900],[900,320]])for(let i=0;i<1000;i++){
  const p=edgePath(w,h,random);
  assert(Number.isFinite(p.length)&&p.length>0&&p.length<=Math.hypot(w,h)+.001);
  assert(p.endX>=-.001&&p.endX<=w+.001&&p.endY>=-.001&&p.endY<=h+.001);
  assert(Math.min(Math.abs(p.endX),Math.abs(p.endX-w),Math.abs(p.endY),Math.abs(p.endY-h))<.001);
  assert.equal(p.x,0);assert.equal(p.endX,w);assert(Math.abs(p.angle)<=Math.atan(.12));
}

console.log('PASS: 3,000 random lines travel left to right with a gentle slope.');

const {makeStrip}=require('./patterns.js');
const crops=[];
const ctx={save(){},restore(){},translate(){},rotate(){},fillRect(){},drawImage(...args){crops.push({args,filter:this.filter});}};
global.document={createElement:()=>({getContext:()=>ctx})};
makeStrip('artist',1000,120,[{naturalWidth:1000,naturalHeight:800}],random);
assert(crops.length>15);
for(const {args,filter} of crops){
 assert.equal(args.length,9);const [,sx,sy,sw,sh,,,dw,dh]=args;
 assert.equal(sw,sh);assert(sw<=416&&sw>=384);
 assert(Math.abs(sx+sw/2-500)<.001&&Math.abs(sy+sh/2-400)<.001);
 assert(sx>=0&&sy>=0&&sx+sw<=1000&&sy+sh<=800);
 assert.equal(dw,dh);assert(dw>=44&&dw<=52);assert(filter.includes('hue-rotate'));
}
console.log('PASS: small square artwork crops stay in image bounds and receive color effects.');

const selected=choosePath(4096,800,p=>Math.abs(p.y-650),random);
assert(Math.abs(selected.y-650)<20, 'Choose the least crowded candidate');
const empty=choosePath(4096,800,p=>p.y>500?0:10,random);
assert(empty.y>500, 'Prefer empty space');
console.log('PASS: placement chooses empty space or the least crowded candidate.');
for(const [w,h] of [[1000,1000],[1000,700]]) {
 crops.length=0;
 makeStrip('artist',1000,120,[{naturalWidth:w,naturalHeight:h,fitWhole:true}],random);
 assert(crops.length>10);
 for(const {args} of crops){
  const [,sx,sy,sw,sh,,,dw,dh]=args;
  assert.equal(sx,0);assert.equal(sy,0);assert.equal(sw,w);assert.equal(sh,h);
  assert(Math.abs(dw/dh-w/h)<1e-10,'Keep original aspect ratio');
 }
}
console.log('PASS: whole album covers and paintings retain every source pixel and their aspect ratio.');
const tokens=[],papers=[];
const paint={beginPath(){},moveTo(){},lineTo(){},stroke(){},closePath(){},fill(){},save(){},restore(){},translate(){},rotate(){},measureText:text=>({width:[...text].length*14}),fillText(text){tokens.push({text,color:this.fillStyle});},fillRect(...rect){papers.push({rect,color:this.fillStyle});}};
global.document={createElement:()=>({getContext:()=>paint})};
makeStrip('developer',1200,120,[],random);
assert(tokens.filter(t=>/^[ᚠ-ᛟ]+$/u.test(t.text)).every(t=>t.text.length>=2));
assert(new Set(tokens.filter(t=>/^[ᚠ-ᛟ]+$/u.test(t.text)).map(t=>t.color)).size>=4);
for(const [open,close] of [['(',')'],['[',']'],['{','}']])assert.equal(tokens.filter(t=>t.text===open).length,tokens.filter(t=>t.text===close).length);
let clockArcs=0;paint.arc=()=>clockArcs++;
makeStrip('project manager',1200,120,[],random);
assert(clockArcs>=9,'Clocks accompany sticky notes');
assert(papers.filter(p=>/^#[a-f0-9]{6}$/i.test(p.color)).length>10);
assert(new Set(papers.map(p=>p.color)).size>=5);
console.log('PASS: colored rune words with balanced brackets; colorful note papers with clocks and no wires.');


let inkFills=0,dryLines=0,mode='source-over';
paint.fill=()=>inkFills++;
Object.defineProperty(paint,'globalCompositeOperation',{set:v=>mode=v,get:()=>mode});
paint.stroke=()=>{if(mode==='destination-out')dryLines++;};
makeStrip('designer',1200,120,[],random);
assert(inkFills>0&&dryLines>1000,'A solid ink body receives dry-brush texture');
console.log('PASS: single rough ink stroke with transparent dry-brush gaps.');
