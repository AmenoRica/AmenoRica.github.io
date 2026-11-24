import type { CollectionEntry } from 'astro:content';

export function isPublishedBlogPost({ data }: CollectionEntry<'posts'>) {
  return !data.draft && data.category.id !== 'diary';
}

export function singleLineTitle(title: string) {
  return title.replace(/\s*[\r\n]+\s*/g, ' ');
}
