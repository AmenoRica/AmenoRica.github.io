export function inkFrames(width, height) {
  const reach = Math.hypot(width / 2, height) * 2.2;
  return Array.from({ length: 17 }, (_, frame) => {
    const progress = frame / 16;
    const radius = reach * progress ** 1.15;
    const points = [`${width / 2}px -8px`];
    for (let i = 0; i <= 160; i++) {
      const angle = -.08 + (Math.PI + .16) * i / 160;
      const edge = .72 + .12 * Math.sin(angle * 5 + .7) + .07 * Math.sin(angle * 11 + 2)
        + .035 * Math.sin(angle * 27 + .4) + .015 * Math.sin(angle * 61);
      points.push(`${(width / 2 + Math.cos(angle) * radius * edge).toFixed(2)}px ${(Math.sin(angle) * radius * edge - 8).toFixed(2)}px`);
    }
    return { clipPath: `polygon(evenodd, 0px 0px,${width}px 0px,${width}px ${height}px,0px ${height}px,0px 0px,${points.join(',')},${width / 2}px -8px,0px 0px)`, offset: progress };
  });
}
