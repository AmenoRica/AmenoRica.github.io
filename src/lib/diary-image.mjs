import { parse, walkSync, render, ELEMENT_NODE } from 'ultrahtml';

export async function photoPreview(html) {
  let image;
  walkSync(parse(html), node => {
    if (!image && node.type === ELEMENT_NODE && node.name === 'img' && node.attributes.src) image = node;
  });
  if (!image) return '';
  image.attributes.loading = 'lazy';
  image.attributes.decoding = 'async';
  image.attributes.class = 'entry-photo';
  delete image.attributes.id;
  return render(image);
}
