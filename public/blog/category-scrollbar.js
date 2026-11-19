(() => {
  const options = document.querySelector('#category-options');
  const track = document.querySelector('.category-scrollbar');
  const thumb = track.firstElementChild;
  let drag;
  function measure() {
    const range = options.scrollWidth - options.clientWidth;
    track.hidden = options.hidden || range <= 0;
    if (track.hidden) return;
    track.style.left = `${options.offsetLeft}px`;
    track.style.width = `${options.clientWidth}px`;
    const width = Math.max(24, options.clientWidth ** 2 / options.scrollWidth);
    thumb.style.width = `${width}px`;
    thumb.style.transform = `translateX(${options.scrollLeft / range * (options.clientWidth - width)}px)`;
  }
  options.addEventListener('scroll', measure, {passive:true});
  new ResizeObserver(measure).observe(options);
  track.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const bounds = thumb.getBoundingClientRect();
    drag = {id:event.pointerId, offset:event.clientX >= bounds.left && event.clientX <= bounds.right ? event.clientX - bounds.left : bounds.width / 2};
    track.setPointerCapture(event.pointerId);
    track.setAttribute('data-dragging', '');
    event.preventDefault();
    move(event);
  });
  function move(event) {
    if (!drag || drag.id !== event.pointerId) return;
    const width = track.getBoundingClientRect().width;
    const travel = width - thumb.getBoundingClientRect().width;
    if (travel <= 0) return;
    const position = event.clientX - track.getBoundingClientRect().left - drag.offset;
    options.scrollLeft = Math.max(0, Math.min(1, position / travel)) * (options.scrollWidth - options.clientWidth);
    measure();
  }
  track.addEventListener('pointermove', move);
  function end(event) {
    if (!drag || drag.id !== event.pointerId) return;
    drag = null;
    track.removeAttribute('data-dragging');
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  }
  track.addEventListener('pointerup', end);
  track.addEventListener('pointercancel', end);
  track.addEventListener('lostpointercapture', end);
  measure();
})();
