(() => {
  const canvas = document.querySelector('.pattern-field');
  const c = canvas.getContext('2d');
  const curtain = document.querySelector('.ink-curtain');
  const ink = curtain.getContext('2d');
  const light = matchMedia('(prefers-color-scheme: light)');
  let covered = false, themeOverride, curtainPainted = false;
  const history = document.createElement('canvas');
  const h = history.getContext('2d');
  let active = null, paused = false, frame = 0, previous = 0;
  let width = 0, height = 0, ratio = 1;
  // shortcut: windows exceeding this fixed source expose its bounds; use tiles if larger displays become a target.
  const worldWidth = Math.max(4096, innerWidth), worldHeight = Math.max(4096, innerHeight);
  history.width = worldWidth; history.height = worldHeight;
  const cellSize = 32, columns = Math.ceil(worldWidth/cellSize), rows = Math.ceil(worldHeight/cellSize);
  const occupancy = new Float64Array(columns*rows);
  // A fixed coverage grid tracks density without retaining an ever-growing list of strokes.
  function coverage(path, add = false) {
    const left = add ? 0 : Math.max(0, Math.floor((worldWidth-width)/2/cellSize));
    const right = add ? columns : Math.min(columns, Math.ceil((worldWidth+width)/2/cellSize));
    let score = 0;
    for (let col = left; col < right; col++) {
      const y = path.y + (col+.5)*cellSize*Math.tan(path.angle);
      const top = Math.max(0, Math.floor((y-76)/cellSize));
      const bottom = Math.min(rows-1, Math.floor((y+76)/cellSize));
      for (let row = top; row <= bottom; row++) {
        const index = row*columns+col;
        if (add) occupancy[index]++;
        else score += occupancy[index];
      }
    }
    return score;
  }
  const focalPoints = {
    'met-425192': [[.50,.28,.49],[.29,.48,.32],[.71,.48,.32]],
    'met-422712': [[.49,.44,.49],[.22,.66,.43],[.75,.65,.43]],
    'met-436532': [[.49,.45,.65]],
    'met-45434': [[.38,.28,.64],[.63,.69,.27]],
    'duchamp-fountain': [[.5,.53,.9]]
  };
  const images = [];
  const ready = Promise.all(['met-425192', 'met-422712', 'met-436532', 'met-45434', 'duchamp-fountain', 'dark-side-moon', 'kandinsky-composition-8', 'malevich-black-square', 'mondrian-composition'].map(file => new Promise(resolve => {
    const image = new Image();
    image.focalPoints = focalPoints[file];
    image.fitWhole = ['dark-side-moon', 'kandinsky-composition-8', 'malevich-black-square', 'mondrian-composition'].includes(file);
    image.onload = () => { images.push(image); resolve(); };
    image.onerror = () => { console.warn(`Photo could not load: ${file}`); resolve(); };
    image.src = `assets/photos/${file}.jpg`;
  })));
  function paint(ctx, progress, complete = false) {
    if (!active || active.kind === 'flood' || progress <= 0) return;
    const {path, strip} = active;
    ctx.save();
    ctx.translate(path.x,path.y); ctx.rotate(path.angle);
    ctx.beginPath(); ctx.rect(-strip.height/2,-strip.height/2,(complete ? strip.width : active.revealStart + active.revealLength * progress + strip.height/2),strip.height); ctx.clip();
    ctx.drawImage(strip,-strip.height/2,-strip.height/2); ctx.restore();
  }
  function render() {
    c.setTransform(1,0,0,1,0,0); c.clearRect(0,0,canvas.width,canvas.height);
    c.setTransform(ratio,0,0,ratio,(width-worldWidth)*ratio/2,(height-worldHeight)*ratio/2);
    const sx = Math.max(0, (worldWidth-width)/2), sy = Math.max(0, (worldHeight-height)/2);
    c.drawImage(history,sx,sy,Math.min(width,worldWidth),Math.min(height,worldHeight),
      sx,sy,Math.min(width,worldWidth),Math.min(height,worldHeight));
    if (active) paint(c,Math.min(1,active.elapsed/active.duration));
    if (!covered && active?.kind !== 'flood' && !curtainPainted) return;
    ink.setTransform(ratio,0,0,ratio,0,0);ink.clearRect(0,0,width,height);
    curtainPainted = covered || active?.kind === 'flood';
    ink.fillStyle=(themeOverride ?? light.matches) ? '#fff' : '#000';
    if(covered) ink.fillRect(0,0,width,height);
    else if(active?.kind==='flood') {
      const progress=Math.min(1,active.elapsed/active.duration);
      const front=progress*(height+260)-180;
      const step=width/(active.drips.length-1);
      ink.beginPath();ink.moveTo(0,0);ink.lineTo(0,front+active.drips[0]);
      for(let i=1;i<active.drips.length;i++) {
        const x=i*step,y=front+active.drips[i];
        ink.bezierCurveTo(x-step*.5,front+active.drips[i-1],x-step*.5,y,x,y);
      }
      ink.lineTo(width,0);ink.closePath();ink.fill();
    }
  }
  function resize() {
    width=innerWidth;height=innerHeight;ratio=Math.min(devicePixelRatio || 1,1.5);
    canvas.width=curtain.width=Math.round(width*ratio);canvas.height=curtain.height=Math.round(height*ratio);
    render();
  }

  function animate(now) {
    frame=0;
    if(paused || !active) return;
    if(previous) active.elapsed += Math.min(64,now-previous);
    previous=now;
    if(active.elapsed >= active.duration) {
      if(active.kind==='flood') {
        covered=true;h.clearRect(0,0,worldWidth,worldHeight);occupancy.fill(0);canvas.dataset.strokes='0';
      } else { paint(h,1,true); coverage(active.path,true); }
      active=null; previous=0; render(); return;
    }
    render();frame=requestAnimationFrame(animate);
  }
  const api = {
    ready,
    setTheme(value) { themeOverride = value; render(); },
    get busy() { return Boolean(active); },
    start(role) {
      if(active) return;
      const viewHeight = Math.min(height,worldHeight);
      const offset = (worldHeight-viewHeight)/2;
      const path=window.AmenoPatterns.choosePath(worldWidth,viewHeight,candidate => coverage({...candidate,y:candidate.y+offset}));
      path.y += offset;
      const strip=window.AmenoPatterns.makeStrip(role,path.length,120,images);
      active={path,strip,elapsed:0,duration:role==='designer'?900:2200,revealStart:(worldWidth-width)/2/Math.cos(path.angle),revealLength:width/Math.cos(path.angle)}; previous=0;
      canvas.dataset.lastRole=role;
      canvas.dataset.strokes=String(Number(canvas.dataset.strokes || 0)+1);
      if(!paused) frame=requestAnimationFrame(animate);
    },
    flood() {
      if(active) return;
      active={kind:'flood',elapsed:0,duration:1800,drips:Array.from({length:25},()=>Math.random()*150)};
      previous=0;
      if(!paused) frame=requestAnimationFrame(animate);
    },
    reveal() { covered=false;render(); },
    setPaused(value) {
      paused=value; cancelAnimationFrame(frame); frame=0;previous=0;
      if(!paused && active) frame=requestAnimationFrame(animate);
    },
    cancel() { cancelAnimationFrame(frame);frame=0;active=null;covered=false;previous=0;render(); }
  };
  light.addEventListener('change', render);
  window.addEventListener('resize',resize); resize();
  window.AmenoBackground=api;
})();
