(() => {
  const pick = (items, random) => items[Math.floor(random() * items.length)];
  function edgePath(width, height, random = Math.random) {
    const y = height * (.08 + random() * .84);
    const delta = (random() - .5) * Math.min(width * .24, height * .14);
    const angle = Math.atan2(delta, width);
    return { x: 0, y, angle, length: Math.hypot(width, delta), endX: width, endY: y + delta };
  }

  function choosePath(width, height, score, random = Math.random) {
    let best, bestScore = Infinity;
    for (let i = 0; i < 96; i++) {
      const path = edgePath(width, height, random);
      const cost = score(path);
      if (cost < bestScore) { best = path; bestScore = cost; }
    }
    return best;
  }

  function makeStrip(role, length, width, images, random = Math.random) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(length + width); canvas.height = width;
    const c = canvas.getContext('2d');
    const rand = (a, b) => a + random() * (b - a);
    const line = (points, color, weight = 1) => {
      c.beginPath(); c.strokeStyle = color; c.lineWidth = weight;
      points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.stroke();
    };
    const dot = (x, y, radius, color) => { c.beginPath(); c.fillStyle = color; c.arc(x,y,radius,0,Math.PI*2); c.fill(); };
    if (role === 'developer') {
      const runes = [...'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ'];
      const colors = ['#8c619e','#528b9f','#a27b49','#71945c','#ac687f','#60958b'];
      c.font = '23px "Noto Sans Runic", monospace'; c.textBaseline = 'middle';
      for (let row = 0; row < 3; row++) {
        let x = rand(-35, 0);
        const y = width/2 + (row-1)*30;
        const token = (text, color) => {
          c.fillStyle=color; c.fillText(text,x,y); x+=c.measureText(text).width+9;
        };
        while (x < canvas.width) {
          const brackets=pick([['(',')'],['[',']'],['{','}']],random);
          token(brackets[0], '#9b905f');
          for (let word=0; word<3; word++) {
            let text='';
            for (let i=0, count=Math.floor(rand(2,6)); i<count; i++) text+=pick(runes,random);
            token(text,colors[(row+word+Math.floor(rand(0,colors.length)))%colors.length]);
            if(word<2) token(pick([',',':','='],random),'#6e7686');
          }
          token(brackets[1],'#9b905f');
          x+=14;
        }
      }
    } else if (role === 'designer') {
      const upper=[], lower=[];
      const phase=rand(0,Math.PI*2);
      for(let x=-4;x<=canvas.width+4;x+=4) {
        const center=width/2+Math.sin(x/180+phase)*2;
        const pressure=7+Math.sin(x/230+phase)*3+rand(-1.8,1.8);
        upper.push([x,center-pressure-rand(0,2)]);
        lower.push([x,center+pressure+rand(0,2)]);
      }
      c.beginPath();
      [...upper,...lower.reverse()].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));
      c.closePath();c.fillStyle='#64605a';c.fill();
      // Dry bristles leave irregular transparent gaps in one continuous ink stroke.
      c.save();c.globalCompositeOperation='destination-out';
      for(let i=0;i<canvas.width*.9;i++) {
        const x=rand(0,canvas.width),y=width/2+rand(-12,12);
        line([[x,y],[x+rand(2,24),y+rand(-.7,.7)]],`rgba(0,0,0,${rand(.15,.8)})`,rand(.3,1.2));
      }
      c.restore();
      for(let i=0;i<canvas.width/20;i++) {
        const x=rand(0,canvas.width),side=random()<.5?-1:1;
        dot(x,width/2+side*rand(10,17),rand(.3,1),'#46423e');
      }
    } else if (role === 'composer') {
      for (let i = -2; i <= 2; i++) line([[0,width/2+i*9],[canvas.width,width/2+i*9]],'#353535',1);
      for (let x = 10; x < canvas.width; x += rand(22, 48)) {
        const y = rand(15,width-15), up = random() < .5 ? 1 : -1;
        c.save(); c.translate(x,y); c.rotate(rand(-.5,.3));
        c.beginPath(); c.ellipse(0,0,6,4,0,0,Math.PI*2); c.fillStyle='#505050'; c.fill();
        line([[5,0],[5,-up*rand(20,34)]],'#505050',1.5);
        if (random() < .6) { c.beginPath(); c.moveTo(5,-up*26); c.quadraticCurveTo(22,-up*21,10,-up*10); c.stroke(); }
        c.restore();
      }
    } else if (role === 'artist') {
      for (let x = -30; x < canvas.width; x += 60) {
        const image = pick(images, random); if (!image) continue;
        const size = rand(44, 52);
        c.save(); c.translate(x, width / 2 + rand(-14, 14));
        if (image.fitWhole) {
          // Preserve the complete cover/composition, including its original colors and aspect ratio.
          const scale = size / Math.max(image.naturalWidth, image.naturalHeight);
          const w = image.naturalWidth*scale, h = image.naturalHeight*scale;
          c.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, -w/2, -h/2, w, h);
        } else {
          const focal = pick(image.focalPoints || [[.5,.5,.5]], random);
          const crop = Math.min(image.naturalWidth, image.naturalHeight) * focal[2] * rand(.96, 1.04);
          const sx = Math.max(0, Math.min(image.naturalWidth - crop, image.naturalWidth*focal[0] - crop/2));
          const sy = Math.max(0, Math.min(image.naturalHeight - crop, image.naturalHeight*focal[1] - crop/2));
          c.rotate(rand(-.16, .16));
          c.filter = `hue-rotate(${rand(-16,16)}deg) saturate(${rand(.85,1.2)}) contrast(${rand(1.05,1.25)})`;
          c.drawImage(image, sx, sy, crop, crop, -size/2, -size/2, size, size);
        }
        c.filter = 'none';
        c.fillStyle = 'rgba(0,0,0,.42)'; c.fillRect(-size/2, -size/2, size, size);
        c.restore();
      }
    } else if (role === 'project manager') {
      const colors=['#9c874a','#a7697b','#668f87','#7287ab','#9680a8','#a57b55'];
      for (let x = -20, item=0; x < canvas.width; x += 66, item++) {
        const size=rand(44,55);
        c.save(); c.translate(x,width/2+rand(-18,18)); c.rotate(rand(-.14,.14));
        if(item%3===2) {
          const radius=22, color=pick(colors,random);
          dot(0,0,radius,'#17191d');
          c.beginPath();c.arc(0,0,radius,0,Math.PI*2);c.strokeStyle=color;c.lineWidth=2;c.stroke();
          for(let tick=0;tick<12;tick++) {
            const a=tick*Math.PI/6;
            line([[Math.cos(a)*18,Math.sin(a)*18],[Math.cos(a)*20,Math.sin(a)*20]],color,1);
          }
          for(const length of [10,16]) {
            const a=rand(0,Math.PI*2);
            line([[0,0],[Math.cos(a)*length,Math.sin(a)*length]],color,1.7);
          }
          dot(0,0,1.8,color);c.restore();continue;
        }
        c.fillStyle=pick(colors,random);c.fillRect(-size/2,-size/2,size,size);
        c.restore();
      }
    }
    return canvas;
  }
  const api = { edgePath, choosePath, makeStrip };
  if (typeof module !== 'undefined') module.exports = api;
  else window.AmenoPatterns = api;
})();
