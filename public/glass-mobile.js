import * as T from 'three';
import { GLTFLoader } from './assets/vendor/GLTFLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';

const mount = document.querySelector('#scene');
const variant=document.body.dataset.variant||'original';
const toy=variant==='toy';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const button = document.querySelector('#pause') || document.querySelector('.motion-control');
let renderer;
try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); }
catch { document.querySelector('#fallback').hidden = false; button.hidden = true; }
if (renderer) start().catch(error=>{console.error(error);document.querySelector('#fallback').hidden=false;button.hidden=true;});
async function start() {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  mount.append(renderer.domElement);
  const scene = new T.Scene();
  scene.background = new T.Color('#ffffff');
  let workshop, workshopTextures;
  if(document.body.dataset.workshop){
    workshopTextures=await Promise.all(['sunlight','night-monitor-off'].map(name=>new T.TextureLoader().loadAsync(`./assets/photos/workshop-${name}.png`)));
    workshopTextures.forEach(texture=>texture.colorSpace=T.SRGBColorSpace);
    const texture=workshopTextures[0];
    workshop=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture,transparent:true,opacity:1,depthWrite:false,toneMapped:false}));
    workshop.position.z=-12;scene.add(workshop);
  }

  const pmrem = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  scene.environmentIntensity = .7;
  room.dispose(); pmrem.dispose();
  const camera = new T.PerspectiveCamera(38, 1, .1, 80);
  camera.position.set(0, 0, 18);
  scene.add(new T.HemisphereLight('#fffefa', '#a7b5ac', .9));
  const sun = new T.DirectionalLight('#fff5df', 2.3); sun.position.set(-6, 8, 10); scene.add(sun);
  const sky = new T.DirectionalLight('#bde4fb', 1.2); sky.position.set(6, -2, 5); scene.add(sky);
  const mat = (color, metalness = .25, roughness = .32) => new T.MeshStandardMaterial({ color, metalness, roughness });
  const silver = mat('#bfc9cc', .9, .2), ivory = mat('#f3ead5', .1, .4);
  const blue = mat('#8bc9dc', .45, .23), coral = mat('#d9a291', .35, .36), gold = mat('#b6a16a', .75, .27);
  const wireMaterial = mat('#6f7d76', .8, .25);
  const threadMaterial = new T.LineBasicMaterial({color:'#878784',transparent:true,opacity:.45});
  function thread(parent,a,b) {
    if(parent===scene)parent=rigFor(a[0]);
    const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]),threadMaterial);
    parent.add(line);return line;
  }
  const mobiles = [];
  const rigs = [-3.2,3.2].map((x,index)=>{
    const pivot=new T.Group(), content=new T.Group();
    pivot.position.set(x,10,-1);content.position.copy(pivot.position).negate();
    content.position.y-=index*.65;
    pivot.add(content);scene.add(pivot);
    return {pivot,content,phase:index*2.4,pitch:0,yaw:0,pitchSpeed:0,yawSpeed:0};
  });
  const rigFor=x=>rigs[x<0?0:1].content;
  function mesh(parent, geometry, material, x=0, y=0, z=0) {
    const item = new T.Mesh(geometry, material); item.position.set(x,y,z); parent.add(item); return item;
  }
  function box(p,w,h,d,m,x=0,y=0,z=0) { return mesh(p,new T.BoxGeometry(w,h,d),m,x,y,z); }
  function wire(p,a,b,r=.012,m=wireMaterial) {
    if(p===scene)p=rigFor(a[0]);
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start);
    const item = mesh(p,new T.CylinderGeometry(r,r,delta.length(),8),m);
    item.position.copy(start.add(end).multiplyScalar(.5)); item.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return item;
  }
  function hang(x,y,z,length,make,seed) {
    const pivot = new T.Group(); pivot.position.set(x,y,z);rigFor(x).add(pivot);
    const piece = new T.Group();make(piece);
    if(variant!=='original'){
      const index=[.6,1.8,3,4.2,5.1,6.3,7.4,8.1].indexOf(seed);
      piece.scale.setScalar([1.4,.8,.75,1.25,.8,1.25,1.1,1][index]);
      piece.rotation.z=[-.28,.18,-.35,.27,-.4,.32,.12,-.22][index];
      length=[3.4,1.8,2.1,2.8,.9,1.4,2.65,7.0][index];
    }
    const threadLift=Math.min(new T.Box3().setFromObject(piece).max.y*.55,length*.5);
    piece.position.y=-length;pivot.add(piece);
    thread(pivot,[0,0,0],[0,-length+threadLift,0]);
    mobiles.push({ pivot, piece, seed, length, depthAngle:0, depthVelocity:0, angle:0, velocity:0, twist:0, spin:0 });return pivot;
  }

  const loader = new GLTFLoader();
  const names = ['icosahedron','digital-clock','electric-guitar','cassette-reels','headphones','squid-angular'];
  const models = await Promise.all(names.map(name => loader.loadAsync(`./assets/mobile-models/${name}.glb`).then(g => g.scene)));
  function model(index, size, rotation=[0,0,0], material=null) {
    const root = new T.Group(), item = models[index]; root.add(item);
    item.rotation.set(...rotation); item.updateMatrixWorld(true);
    const bounds = new T.Box3().setFromObject(item), dimensions=bounds.getSize(new T.Vector3());
    const scale=size/Math.max(dimensions.x,dimensions.y,dimensions.z);
    console.assert(Number.isFinite(scale) && scale>0, 'Invalid mobile asset bounds', names[index]);
    item.position.sub(bounds.getCenter(new T.Vector3())); root.scale.setScalar(scale);
    if(material)item.traverse(child=>{if(child.isMesh)child.material=material;});
    return root;
  }
  const sprite = new Image();sprite.src='./assets/mobile-models/pixel-character.png';await sprite.decode();
  const pixels=document.createElement('canvas');pixels.width=sprite.width;pixels.height=sprite.height;
  const ctx=pixels.getContext('2d');ctx.drawImage(sprite,0,0);const data=ctx.getImageData(0,0,pixels.width,pixels.height).data;
  const character=new T.Group(), outline=[], corners=new Map();
  const filled=(x,y)=>x>=0&&y>=0&&x<pixels.width&&y<pixels.height&&data[(y*pixels.width+x)*4+3]>127;
  function edge(x1,y1,x2,y2){
    const a=[(x1-pixels.width/2)*.095,(pixels.height/2-y1)*.095],b=[(x2-pixels.width/2)*.095,(pixels.height/2-y2)*.095];
    for(const z of [-.085,.085])outline.push(...a,z,...b,z);
    for(const point of [a,b])corners.set(point.join(','),point);
  }
  for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++)if(filled(x,y)){
    if(!filled(x,y-1))edge(x,y,x+1,y);
    if(!filled(x,y+1))edge(x,y+1,x+1,y+1);
    if(!filled(x-1,y))edge(x,y,x,y+1);
    if(!filled(x+1,y))edge(x+1,y,x+1,y+1);
  }
  for(const [x,y] of corners.values())outline.push(x,y,-.085,x,y,.085);
  console.assert(outline.length>0&&outline.length%6===0,'Sprite outline must contain complete edges');
  character.add(new T.LineSegments(new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(outline,3)),new T.LineBasicMaterial({color:'#354b48',transparent:true,opacity:.74})));
  character.rotation.y=-.2;
  // Long staggered suspension keeps the centre open for the wordmark.
  thread(scene,[-3.2,10,-1],[-3.2,5.8,-1]);thread(scene,[3.2,10,-1],[3.2,5.4,-1]);
  wire(scene,[-5.4,5.6,-.5],[-1.2,6,-1.5],.018,silver);
  wire(scene,[1.25,5.7,-1.5],[5.2,5.1,-.2],.018,silver);
  thread(scene,[-3.9,5.7,-.7],[-3.9,-1.39,-.7]);wire(scene,[-5.25,-1.75,-.4],[-2.25,-.95,-1],.018,silver);
  hang(-4.8,5.65,-.5,2.8,p=>p.add(model(0,1.4,[.3,.2,.3],blue)),.6);
  hang(4.65,5.18,-.3,2.6,p=>p.add(model(4,1.7,[0,-.2,.12])),4.2);
  hang(-4.9,-1.66,-.45,1.9,p=>p.add(model(2,3.0,[0,.15,-.2])),5.1);
  hang(-2.5,-1.02,-1,2.0,p=>p.add(model(3,2.3,[0,-.15,-.12])),6.3);
  hang(-3.15,5.81,-1,2.65,p=>p.add(character),7.4);
  hang(3.7,5.35,-.7,8.49,p=>{
    const squid=model(5,2.5,[-Math.PI/2,0,Math.PI/2]);squid.scale.x*=1.3;squid.scale.y*=.8;squid.rotation.z=.12;p.add(squid);
  },8.1);
  const outlineMaterial = new T.LineBasicMaterial({color:'#293b38',transparent:true,opacity:.67});
  for(const {piece,seed} of mobiles){
    const meshes=[];piece.traverse(child=>{if(child.isMesh)meshes.push(child);});
    for(const item of meshes){
      const edges=new T.LineSegments(new T.EdgesGeometry(item.geometry,seed===4.2?10:24),outlineMaterial);
      edges.position.copy(item.position);edges.quaternion.copy(item.quaternion);edges.scale.copy(item.scale);
      if(toy){
        const colors=['#ff5c91','#ffbc26','#6b63ff','#20b9ad','#ff763e','#4a9cf5','#db48c4','#82bf36'];
        const color=colors[[.6,1.8,3,4.2,5.1,6.3,7.4,8.1].indexOf(seed)];
        if(seed!==8.1)item.material=mat(color,.05,.45);
        edges.material=new T.LineBasicMaterial({color:'#30303b',transparent:true,opacity:.38});
        item.parent.add(edges);
      }else{item.parent.add(edges);item.parent.remove(item);}
    }
  }
  if(toy){
    const pixelMaterial=mat('#db48c4',.05,.45);
    for(let y=0;y<pixels.height;y++)for(let x=0;x<pixels.width;x++)if(filled(x,y)){
      box(character,.095,.095,.17,pixelMaterial,(x+.5-pixels.width/2)*.095,(pixels.height/2-y-.5)*.095,0);
    }
    character.traverse(child=>{if(child.isLineSegments)child.material=new T.LineBasicMaterial({color:'#a2258c',transparent:true,opacity:.4});});
    console.assert(character.children.some(child=>child.isMesh),'Toy sprite must have solid colored pixels');
  }
  console.assert(mobiles.length===6 && !mobiles.some(m=>m.seed===1.8 || m.seed===3),'Expected six objects without clock or torus knot');
  const target = new T.WebGLRenderTarget(1,1,{depthBuffer:true});
  const postScene = new T.Scene(); const postCamera = new T.OrthographicCamera(-1,1,1,-1,0,1);
  const glass = new T.ShaderMaterial({toneMapped:false,uniforms:{night:{value:0},reading:{value:0},sceneTexture:{value:target.texture},resolution:{value:new T.Vector2(1,1)},tileSize:{value:45},tintCells:{value:Array.from({length:24},()=>new T.Vector4(0,0,-100,-100))},tintTime:{value:0},tintStrength:{value:toy?.4:.24}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
    uniform float night;uniform float reading;uniform sampler2D sceneTexture;uniform vec2 resolution;uniform float tileSize;uniform vec4 tintCells[24];uniform float tintTime;uniform float tintStrength;varying vec2 vUv;
    void main(){
      vec2 px=vUv*resolution;vec2 grid=(px-resolution*.5)/tileSize;vec2 cell=fract(grid);vec2 q=cell-.5;
      vec2 corner=abs(q)-vec2(.42);
      float distance=.08-length(max(corner,0.))-min(max(corner.x,corner.y),0.);
      float seam=1.-smoothstep(.007,.017,distance);
      float rim=1.-smoothstep(.025,.16,distance);
      vec2 normal=max(abs(q)-.34,.001)*sign(q);
      normal/=max(length(normal),.001);
      vec2 bend=q*.035+normal*sin(clamp(distance/.16,0.,1.)*3.14159)*.15;
      bend+=vec2(sin(cell.y*15.+cell.x*8.),cos(cell.x*14.-cell.y*6.))*.005;
      vec2 uv=clamp(vUv+bend*tileSize/resolution,0.001,.999);
      vec2 tile=floor(grid);
      float tint=0.;
      for(int i=0;i<24;i++){
        if(all(lessThan(abs(tile-tintCells[i].xy),vec2(.1)))){
          float rise=smoothstep(0.,.15,tintTime-tintCells[i].z);
          float fade=1.-smoothstep(.1,1.8,tintTime-tintCells[i].w);
          tint=max(tint,rise*fade);
        }
      }
      // A normalized kernel spreads transmitted light without adding a colored veil.
      float radius=1.1+rim*.45+reading*7.+tint*1.8;
      vec3 color=vec3(0.);
      for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
        float wx=x==0?6.:(abs(x)==1?4.:1.);
        float wy=y==0?6.:(abs(y)==1?4.:1.);
        vec2 offset=vec2(float(x),float(y))*radius/resolution;
        color+=texture2D(sceneTexture,clamp(uv+offset,.001,.999)).rgb*(wx*wy/256.);
      }
      // A curved bevel has a broad shoulder and an inner lip, rather than a drawn grid.
      float shoulder=exp(-pow((distance-.065)*22.,2.));
      float lip=exp(-pow((distance-.135)*65.,2.));
      float facing=dot(normal,normalize(vec2(-.7,.9)));
      float highlight=shoulder*max(facing,0.)*.12+lip*max(-facing,0.)*.045;
      float shade=shoulder*max(-facing,0.)*.15+lip*max(facing,0.)*.035;
      color*=1.-shade*.25-seam*.025;
      color+=highlight*mix(.65,.3,night)*.25;
      gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
    }`});
  postScene.add(new T.Mesh(new T.PlaneGeometry(2,2),glass));
  const pointer=new T.Vector2(), smooth=new T.Vector2(), wind=new T.Vector2(), windTarget=new T.Vector2(), windDelta=new T.Vector2();let pointerSeen=false,paused=reduced.matches,time=0,last=performance.now(),frame;
  let viewWidth=mount.clientWidth,viewHeight=mount.clientHeight,visible=true;
  new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(!visible)endDrag();}).observe(mount);
  const rain=Array.from({length:3},()=>({next:0,active:false}));
  function resize(){
    endDrag();
    const w=viewWidth=mount.clientWidth,h=viewHeight=mount.clientHeight;renderer.setSize(w,h);target.setSize(Math.round(w*renderer.getPixelRatio()),Math.round(h*renderer.getPixelRatio()));
    camera.aspect=w/h;camera.position.z=camera.aspect<1?22:18;camera.updateProjectionMatrix();
    if(workshop){
      const height=2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*(camera.position.z+12);
      const texture=workshop.material.map,aspect=texture.image.width/texture.image.height;
      workshop.scale.set(height*camera.aspect,height,1);
      texture.repeat.set(Math.min(1,camera.aspect/aspect),Math.min(1,aspect/camera.aspect));
      texture.offset.set((1-texture.repeat.x)/2,(1-texture.repeat.y)/2);
    }

    glass.uniforms.resolution.value.set(w,h);glass.uniforms.tileSize.value=w<600?33:45;clearTint();rain.forEach((drop,i)=>{drop.active=false;drop.next=time+(i===0?Math.random()*.6:Math.random()*7);});draw();
  }
  function clearTint(){for(const cell of glass.uniforms.tintCells.value)cell.set(0,0,-100,-100);}
  function stepRain(){
    const size=glass.uniforms.tileSize.value;
    for(const drop of rain){
      if(time<drop.next)continue;
      if(!drop.active){
        const columns=Math.max(1,Math.floor(viewWidth/size)-2);
        drop.x=Math.floor(-viewWidth/(2*size))+1+Math.floor(Math.random()*columns);
        drop.y=Math.floor(viewHeight/(2*size));
        drop.speed=.22+Math.random()*.34;
        drop.remaining=Math.ceil(viewHeight/size*(.4+Math.random()*.6));drop.active=true;
      }
      const cell=glass.uniforms.tintCells.value.reduce((a,b)=>a.w<=b.w?a:b);
      cell.set(drop.x,drop.y,time,time);drop.y-=1;drop.remaining-=1;
      drop.next=time+drop.speed*(.75+Math.random()*.6);
      if(drop.remaining<=0||drop.y<Math.floor(-viewHeight/(2*size))){drop.active=false;drop.next=time+.6+Math.random()*7;}
    }
  }
  const hero=document.querySelector('.hero');
  function draw(){
    const progress=hero?T.MathUtils.clamp(scrollY/Math.max(1,hero.offsetHeight*.75),0,1):0;
    glass.uniforms.reading.value=progress*progress*(3-2*progress);
    glass.uniforms.tintTime.value=time;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,postCamera);}
  function breeze(t,seed){
    return Math.sin(t*.37+seed)*.52+Math.sin(t*.83+seed*1.73)*.3+Math.sin(t*1.31+seed*.61)*.18;
  }
  const projected=new T.Vector3(), overlapBox=new T.Box3(), corner=new T.Vector3();
  function overlapStrength(a,b){
    const w=Math.min(a.right,b.right)-Math.max(a.left,b.left);
    const h=Math.min(a.top,b.top)-Math.max(a.bottom,b.bottom);
    if(w<=0||h<=0)return 0;
    return Math.min(1,w*h/Math.max(.0001,Math.min((a.right-a.left)*(a.top-a.bottom),(b.right-b.left)*(b.top-b.bottom))));
  }
  function separatePieces(dt){
    for(const rig of rigs)rig.overlap=0;
    for(const m of mobiles){
      overlapBox.setFromObject(m.piece);
      const rect={left:Infinity,right:-Infinity,bottom:Infinity,top:-Infinity};
      for(let i=0;i<8;i++){
        corner.set(i&1?overlapBox.max.x:overlapBox.min.x,i&2?overlapBox.max.y:overlapBox.min.y,i&4?overlapBox.max.z:overlapBox.min.z).project(camera);
        rect.left=Math.min(rect.left,corner.x);rect.right=Math.max(rect.right,corner.x);
        rect.bottom=Math.min(rect.bottom,corner.y);rect.top=Math.max(rect.top,corner.y);
      }
      m.screenRect=rect;
    }
    for(let i=0;i<mobiles.length;i++)for(let j=i+1;j<mobiles.length;j++){
      const a=mobiles[i],b=mobiles[j],strength=overlapStrength(a.screenRect,b.screenRect);
      if(!strength||dragging?.m===a||dragging?.m===b)continue;
      const direction=Math.sign((a.screenRect.left+a.screenRect.right)-(b.screenRect.left+b.screenRect.right))||-1;
      // Convert screen separation to each rotating suspension's local swing direction.
      for(const [m,sign] of [[a,direction],[b,-direction]]){
        const rig=rigs.find(r=>r.content===m.pivot.parent);
        const facing=Math.cos(rig.yaw);
        m.velocity+=sign*Math.sign(facing||1)*strength*.38*dt;
        rig.overlap=Math.max(rig.overlap,strength*(1-Math.abs(facing)));
      }
    }
  }
  function windFalloff(distance){return .1+.9*Math.exp(-Math.pow(distance/.32,2));}
  function loop(now){
    frame=requestAnimationFrame(loop);const dt=Math.min((now-last)/1000,.04);last=now;if(paused||document.hidden||!visible)return;
    time+=dt;smooth.lerp(pointer,1-Math.exp(-dt*2));
    stepRain();
    windTarget.multiplyScalar(Math.exp(-dt*.85));
    windDelta.copy(windTarget).sub(wind).multiplyScalar(1-Math.exp(-dt*1.6)).clampLength(0,.4*dt);
    wind.add(windDelta);
    camera.updateMatrixWorld();scene.updateMatrixWorld(true);
    separatePieces(dt);
    for(const m of mobiles){
      m.piece.getWorldPosition(projected).project(camera);
      const distance=Math.hypot((projected.x-smooth.x)*viewWidth,(projected.y-smooth.y)*viewHeight)/(2*Math.min(viewWidth,viewHeight));
      m.windGain=T.MathUtils.lerp(m.windGain??.1,windFalloff(distance),1-Math.exp(-dt*1.8));
    }
    for(const rig of rigs){
      if(dragging&&dragging.m.pivot.parent===rig.content)continue;
      const gain=Math.max(...mobiles.filter(m=>m.pivot.parent===rig.content).map(m=>m.windGain));
      const pitchTarget=breeze(time*.7,rig.phase)*.09+wind.y*.12*gain;
      const turnSpeed=.05+breeze(time*.55,rig.phase+2)*.015+wind.x*.95*gain+rig.overlap*.16*(Math.sign(rig.yawSpeed)||1);
      rig.pitchSpeed+=((pitchTarget-rig.pitch)*.8-rig.pitchSpeed*.9)*dt;
      rig.yawSpeed+=T.MathUtils.clamp((turnSpeed-rig.yawSpeed)*1.4,-.12,.12)*dt;
      rig.pitch+=rig.pitchSpeed*dt;rig.yaw=(rig.yaw+rig.yawSpeed*dt)%(Math.PI*2);
      rig.pivot.rotation.set(rig.pitch,rig.yaw,0);
      console.assert(Number.isFinite(rig.pitch+rig.yaw),'Mobile assembly rotation must remain finite');
    }
    for(const m of mobiles){
      if(dragging?.m===m)continue;
      const force=breeze(time*(.8+m.seed*.045),m.seed)*.045+wind.x*(.18+m.seed*.012)*m.windGain;
      m.velocity+=(force-m.angle*1.5-m.velocity*1.05)*dt;m.angle+=m.velocity*dt;
      const depthTarget=breeze(time*.7,m.seed+3)*.035+wind.y*.035*m.windGain;
      m.depthVelocity+=((depthTarget-m.depthAngle)*1.5-m.depthVelocity*1.05)*dt;
      m.depthAngle+=m.depthVelocity*dt;
      m.pivot.rotation.set(m.depthAngle,0,m.angle);
      const twistTarget=breeze(time*(.5+m.seed*.025),m.seed)*1.05+wind.x*.2*m.windGain;
      m.spin+=((twistTarget-m.twist)*.65-m.spin*.6+wind.x*(.16+m.seed*.018)*m.windGain)*dt;
      m.twist+=m.spin*dt;m.piece.rotation.y=m.twist;
      console.assert(Number.isFinite(m.twist),'Mobile rotation must remain finite');
    }
    draw();
  }
  function updateButton(){if(paused)endDrag();if(paused){clearTint();draw();}button.textContent=paused?'움직임 재생':'움직임 멈추기';button.setAttribute('aria-pressed',String(paused));}
  button.addEventListener('click',()=>{paused=button.matches('.motion-control')?button.getAttribute('aria-pressed')==='true':!paused;last=performance.now();updateButton();});
  reduced.addEventListener('change',()=>{paused=reduced.matches;updateButton();draw();});
  addEventListener('pointermove',e=>{
    if(paused||dragging||!visible)return;
    const rect=mount.getBoundingClientRect();
    if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom){pointerSeen=false;return;}
    const x=(e.clientX-rect.left)/viewWidth*2-1,y=1-(e.clientY-rect.top)/viewHeight*2;
    if(pointerSeen){windTarget.x+=(x-pointer.x)*.9;windTarget.y+=(y-pointer.y)*.9;windTarget.clampLength(0,.55);}
    pointer.set(x,y);pointerSeen=true;
  });
  const raycaster=new T.Raycaster(), hitBox=new T.Box3(), hitPoint=new T.Vector3(), dragPointer=new T.Vector2();
  let dragging=null;
  renderer.domElement.style.touchAction=document.body.classList.contains('mobile-home')?'pan-y':'none';
  function pointerRay(e){
    const rect=mount.getBoundingClientRect();
    dragPointer.set((e.clientX-rect.left)/viewWidth*2-1,1-(e.clientY-rect.top)/viewHeight*2);
    camera.updateMatrixWorld();scene.updateMatrixWorld(true);raycaster.setFromCamera(dragPointer,camera);
  }
  function pickPiece(e){
    pointerRay(e);let picked=null,nearest=Infinity;
    for(const m of mobiles){
      hitBox.setFromObject(m.piece).expandByScalar(.06);
      if(raycaster.ray.intersectBox(hitBox,hitPoint)){
        const distance=raycaster.ray.origin.distanceToSquared(hitPoint);
        if(distance<nearest){nearest=distance;picked=m;}
      }
    }
    return picked;
  }
  renderer.domElement.addEventListener('pointerdown',e=>{
    if(paused||e.button!==0||dragging)return;
    const m=pickPiece(e);if(!m)return;
    const center=m.piece.getWorldPosition(new T.Vector3());
    const plane=new T.Plane().setFromNormalAndCoplanarPoint(camera.getWorldDirection(new T.Vector3()),center);
    if(!raycaster.ray.intersectPlane(plane,hitPoint))return;
    dragging={m,plane,offset:center.clone().sub(hitPoint),pointerId:e.pointerId,last:e.timeStamp};
    m.velocity=0;m.depthVelocity=0;wind.set(0,0);windTarget.set(0,0);
    renderer.domElement.setPointerCapture(e.pointerId);renderer.domElement.style.cursor='grabbing';e.preventDefault();
  });
  renderer.domElement.addEventListener('pointermove',e=>{
    if(paused)return;
    if(!dragging){renderer.domElement.style.cursor=pickPiece(e)?'grab':'';return;}
    if(e.pointerId!==dragging.pointerId)return;
    pointerRay(e);if(!raycaster.ray.intersectPlane(dragging.plane,hitPoint))return;
    const m=dragging.m;
    hitPoint.add(dragging.offset);m.pivot.parent.worldToLocal(hitPoint);hitPoint.sub(m.pivot.position);
    hitPoint.y=Math.min(hitPoint.y,-m.length*.2);hitPoint.normalize();
    const angle=T.MathUtils.clamp(Math.asin(hitPoint.x),-.85,.85);
    const depth=T.MathUtils.clamp(Math.atan2(-hitPoint.z,-hitPoint.y),-.85,.85);
    const dt=Math.max(.016,(e.timeStamp-dragging.last)/1000);
    m.velocity=T.MathUtils.clamp((angle-m.angle)/dt,-1.2,1.2);
    m.depthVelocity=T.MathUtils.clamp((depth-m.depthAngle)/dt,-1.2,1.2);
    m.angle=angle;m.depthAngle=depth;m.pivot.rotation.set(depth,0,angle);dragging.last=e.timeStamp;
    draw();
  });
  function endDrag(e){
    if(!dragging||e&&e.pointerId!==undefined&&e.pointerId!==dragging.pointerId)return;
    const id=dragging.pointerId;
    if(!e||e.type!=='pointerup'||e.timeStamp-dragging.last>100){dragging.m.velocity=0;dragging.m.depthVelocity=0;}
    dragging=null;pointerSeen=false;renderer.domElement.style.cursor='';
    if(renderer.domElement.hasPointerCapture(id))renderer.domElement.releasePointerCapture(id);
  }
  renderer.domElement.addEventListener('pointerup',endDrag);
  renderer.domElement.addEventListener('pointercancel',endDrag);
  renderer.domElement.addEventListener('lostpointercapture',endDrag);
  addEventListener('blur',()=>endDrag());
  document.addEventListener('pointerleave',()=>{pointer.set(0,0);pointerSeen=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)endDrag();last=performance.now();});
  addEventListener('scroll',()=>{if(paused)draw();},{passive:true});
  if(workshop){
    const options=[...document.querySelectorAll('[data-backdrop]')];
    const originalColors=new Map();
    rigs.forEach(({pivot})=>pivot.traverse(item=>{
      if(item.material?.color)originalColors.set(item.material,item.material.color.clone());
    }));
    function setBackdrop(mode){
      const night=mode==='night';
      workshop.visible=mode!=='white';
      workshop.material.map=workshopTextures[night?1:0];
      scene.background.set(night?'#080c12':'#ffffff');
      glass.uniforms.night.value=Number(night);
      originalColors.forEach((color,material)=>{
        if(night)material.color.setRGB(1-color.r,1-color.g,1-color.b);
        else material.color.copy(color);
      });
      console.assert(workshop.material.map===workshopTextures[night?1:0], 'Backdrop must match selected theme');
      options.forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.backdrop===mode)));
      resize();
    }
    options.forEach(option=>{
      option.disabled=false;
      option.addEventListener('click',()=>{
        document.documentElement.dataset.theme=option.dataset.backdrop==='night'?'dark':'light';
        setBackdrop(option.dataset.backdrop);
      });
    });
    if(document.body.dataset.workshop==='theme'){
      window.AmenoBackground={setTheme:light=>setBackdrop(light?'workshop':'night')};
      window.AmenoBackground.setTheme(document.documentElement.dataset.theme==='light');
    }
  }
  addEventListener('resize',resize);
  addEventListener('pagehide',()=>{cancelAnimationFrame(frame);target.dispose();environment.dispose();renderer.dispose();},{once:true});
  resize();updateButton();frame=requestAnimationFrame(loop);
}
