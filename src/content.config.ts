import { defineCollection, reference, z } from 'astro:content';
import { glob } from 'astro/loaders';
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}, '유효한 날짜(YYYY-MM-DD)가 필요합니다.');
export const collections = {
  posts: defineCollection({
    loader: glob({ pattern: '*.md', base: './src/content/posts' }),
    schema: z.object({ title: z.string().min(1), subtitle: z.string().optional(), createdAt: z.preprocess(value => value instanceof Date ? value.toISOString().slice(0,10) : value, day), category: reference('categories'), draft: z.boolean().default(false) }),
  }),
  categories: defineCollection({
    loader: glob({ pattern: '*.json', base: './src/content/categories', generateId: ({data}) => String(data.key) }),
    schema: z.object({key: z.string().regex(/^(?!all$)[a-z0-9-]+$/), title:z.string().min(1), style:z.enum(['','ugcatalog','bukichi','toys','amenorica','weblog']).default('weblog'), image:z.string().regex(/^\/uploads\/[^\s]+$/).optional(), order:z.number().default(0)}),
  }),
};
