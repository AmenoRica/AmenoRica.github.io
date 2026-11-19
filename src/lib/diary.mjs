export const isDiary = post => post.data.category.id === 'diary';
export const visibleDiary = (post, dev = false) => isDiary(post) && (!post.data.draft || (dev && post.id.startsWith('sample-diary-')));
export const monthNumber = date => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
export const monthKey = value => `${Math.floor(value / 12)}-${String(value % 12 + 1).padStart(2, '0')}`;
export function archiveMonths(posts) {
  if (!posts.length) return [];
  const values = posts.map(post => monthNumber(post.data.createdAt));
  const newest = Math.max(...values), oldest = Math.min(...values);
  return Array.from({length: newest - oldest + 1}, (_, i) => monthKey(newest - i));
}
export const monthTarget = (months, selected) => months.find(month => month <= selected) ?? months.at(-1);
