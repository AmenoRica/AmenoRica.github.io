(() => {
  const context = document.createElement('canvas').getContext('2d');
  const logos = [...document.querySelectorAll('.identity')].map(identity => {
    const tagline = identity.querySelector('.tagline');
    const baseline = document.createElement('span');
    baseline.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    baseline.setAttribute('aria-hidden', 'true');
    tagline.append(baseline);
    return { identity, tagline, baseline, rule: identity.querySelector('.identity-rule') };
  });
  function align() {
    for (const { identity, tagline, baseline, rule } of logos) {
      const style = getComputedStyle(tagline);
      context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const descent = context.measureText(tagline.textContent).actualBoundingBoxDescent;
      const bottom = baseline.getBoundingClientRect().top + descent;
      rule.style.height = `${bottom - identity.getBoundingClientRect().top}px`;
    }
  }
  const observer = new ResizeObserver(align);
  logos.forEach(({ tagline }) => observer.observe(tagline));
  document.fonts.ready.then(align);
  document.fonts.addEventListener('loadingdone', align);
})();
