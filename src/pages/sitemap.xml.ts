import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  const paths = ['/', '/blog/', '/resume/', ...posts.map(post => `/blog/${encodeURIComponent(post.id)}/`).sort()];
  const urls = paths.map(path => `<url><loc>${new URL(path, site).href.replaceAll('&', '&amp;')}</loc></url>`);
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
