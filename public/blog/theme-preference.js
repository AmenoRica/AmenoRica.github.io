(() => {
  const key = 'amenorica-blog-theme';
  const read = () => {
    try {
      const value = sessionStorage.getItem(key);
      return value === 'light' ? true : value === 'dark' ? false : null;
    } catch { return null; }
  };
  const save = light => {
    try { sessionStorage.setItem(key, light ? 'light' : 'dark'); } catch {}
  };
  window.blogTheme = { read, save };
  const light = read() ?? !matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
})();
