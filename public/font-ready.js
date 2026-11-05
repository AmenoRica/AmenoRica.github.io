(() => {
  document.querySelectorAll('[data-fonts]').forEach(async element => {
    const text = element.textContent || 'AmenoRica';
    await Promise.allSettled(element.dataset.fonts.split('|').map(font => document.fonts.load(font, text)));
    element.classList.add('fonts-ready');
  });
})();
