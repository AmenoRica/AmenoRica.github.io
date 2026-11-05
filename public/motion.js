(() => {
  const title = document.querySelector('h1');
  const name = document.querySelector('.name-text');
  const fullName = 'AmenoRica';
  const roles = [...document.querySelectorAll('.role-option')].map(role => role.textContent);
  const roleText = document.querySelector('.role-text');
  const tagline = document.querySelector('.tagline');
  const outro = document.querySelector('.outro-text');
  const control = document.querySelector('.motion-control');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const background = window.AmenoBackground;
  const pairs = [
    ['IBM Plex Mono', 'Space Grotesk'],
    ['DM Sans', 'Unbounded'],
    ['Instrument Serif', 'Bodoni Moda'],
    ['Cormorant Garamond', 'Italiana'],
    ['Syne', 'Playfair Display']
  ];
  const loadedFonts = new Set();
  let roleIndex = 0, nextRole = 0, round = 0;
  let target = 'settle', deleting = true, hold = 12;
  let paused = false, ready = false, timer;

  function applyFont(index) {
    const family = pairs[index][round % 2];
    title.style.fontFamily = loadedFonts.has(family) ? `"${family}", serif` : 'serif';
  }
  function updateCursor() {
    const active = !reduced.matches && !paused && !document.hidden && hold <= 3;
    name.classList.toggle('typing', active && (target === 'name' || target === 'restart-name' || (target === 'wipe' && name.textContent.length > 0)));
    roleText.classList.toggle('typing', active && target === 'role');
    outro.classList.toggle('typing', active && ['outro','restart-erase','restart-subtitle'].includes(target));
  }
  function tick() {
    if (!ready) return;
    if (hold > 0) { hold--; return; }
    if (target === 'settle') {
      background.start(roles[roleIndex]); target='painting'; updateCursor(); return;
    }
    if (target === 'painting') {
      if (background.busy) return;
      if(roleIndex===roles.length-1) {
        tagline.classList.toggle('ending',true);outro.textContent=`Fun-driven ${roles[roleIndex]}`;
        target='outro';deleting=true;hold=8;updateCursor();return;
      }
      nextRole=roleIndex+1;
      target='name'; deleting=true; hold=8; return;
    }
    if(target==='outro') {
      if(deleting) {
        outro.textContent=outro.textContent.slice(0,-1);
        if(!outro.textContent) {deleting=false;hold=3;}
      } else {
        outro.textContent='And…?'.slice(0,outro.textContent.length+1);
        if(outro.textContent==='And…?') {target='outro-hold';hold=14;}
      }
      updateCursor();return;
    }
    if(target==='outro-hold') {background.flood();target='wipe';updateCursor();return;}
    if(target==='wipe') {
      if(name.textContent) name.textContent=name.textContent.slice(0,-1);
      else if(!background.busy) {
        background.reveal();target='restart-erase';hold=5;
      }
      updateCursor();return;
    }
    if(target==='restart-erase') {
      outro.textContent=outro.textContent.slice(0,-1);
      if(!outro.textContent) {
        round++;roleIndex=nextRole=0;roleText.textContent=roles[0];applyFont(0);
        target='restart-name';hold=3;
      }
      updateCursor();return;
    }
    if(target==='restart-name') {
      name.textContent=fullName.slice(0,name.textContent.length+1);
      if(name.textContent===fullName) {target='restart-subtitle';hold=5;}
      updateCursor();return;
    }
    if(target==='restart-subtitle') {
      const subtitle=`Fun-driven ${roles[0]}`;
      outro.textContent=subtitle.slice(0,outro.textContent.length+1);
      if(outro.textContent===subtitle) {
        tagline.classList.toggle('ending',false);outro.textContent='';
        target='settle';hold=12;deleting=true;
      }
      updateCursor();return;
    }
    const text = target === 'name' ? name : roleText;
    if (deleting) {
      text.textContent = text.textContent.slice(0, -1);
      if (!text.textContent) {
        if (target === 'name') applyFont(nextRole);
        else roleIndex=nextRole;
        deleting=false;hold=3;
      }
    } else {
      const fullText=target==='name'?fullName:roles[roleIndex];
      text.textContent=fullText.slice(0,text.textContent.length+1);
      if(text.textContent===fullText) {
        target=target==='name'?'role':'settle';
        deleting=true;hold=target==='settle'?12:5;
      }
    }
    updateCursor();
  }
  function sync() {
    clearInterval(timer);
    control.hidden=reduced.matches;
    background.setPaused(reduced.matches || paused || document.hidden);
    if(reduced.matches) {
      background.cancel();tagline.classList.toggle('ending',false);outro.textContent='';roleIndex=nextRole=round=0;
      roleText.textContent=roles[0];name.textContent=fullName;
      target='settle';deleting=true;hold=12;
      if(ready) applyFont(0);
    }
    updateCursor();
    if(!reduced.matches && !paused && !document.hidden) timer=setInterval(tick,80);
  }
  control.addEventListener('click',()=>{
    paused=!paused;control.setAttribute('aria-pressed',String(paused));
    control.textContent=paused?'Resume animation':'Pause animation';sync();
  });
  reduced.addEventListener('change',sync);
  document.addEventListener('visibilitychange',sync);
  sync();
  Promise.all([
    ...pairs.flat().map(async family=>{
      try { if((await document.fonts.load(`400 100px "${family}"`,'AmenoRica')).length) loadedFonts.add(family); }
      catch { /* A failed font keeps the role sequence intact with a serif fallback. */ }
    }),
    document.fonts.load('27px "Noto Sans Runic"','ᚠᚢᚦ').catch(()=>{}),
    document.fonts.load('400 30px "Pretendard"', 'Fun-driven developer designer composer artist project manager And…?').catch(()=>{}),
    background.ready
  ]).then(()=>{ready=true;applyFont(roleIndex);sync();});
})();
