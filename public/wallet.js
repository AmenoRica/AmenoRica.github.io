(() => {
  const address = document.querySelector('#eth-address');
  const status = document.querySelector('#wallet-status');
  let timer;
  address.addEventListener('click', async () => {
    clearTimeout(timer);
    try {
      await navigator.clipboard.writeText(address.textContent.trim());
      status.textContent = '복사됨!';
    } catch {
      status.textContent = '복사 실패 — 주소를 선택해 복사해 주세요.';
    }
    status.classList.add('visible');
    timer = setTimeout(() => {
      status.classList.remove('visible');
      status.textContent = '';
    }, 2400);
  });
})();
