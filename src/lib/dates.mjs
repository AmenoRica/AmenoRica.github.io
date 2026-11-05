import { execFileSync } from 'node:child_process';
export const displayDate = value => value.replaceAll('-', '.');
export function modificationDay(history, createdAt) {
  const commits = history.trim().split('\n').filter(Boolean);
  if (commits.length < 2) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(commits[0]));
  const part = name => parts.find(part => part.type === name).value;
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  return date > createdAt ? date : null;
}
export function lastModified(filePath, createdAt) {
  let history;
  try {
    history = execFileSync('git', ['log','--follow','--format=%cI','--',filePath], {encoding:'utf8',stdio:['ignore','pipe','pipe']});
  } catch (error) {
    if (process.env.GITHUB_ACTIONS) throw error;
    return null; // Local source archives have no Git history.
  }
  return modificationDay(history, createdAt);
}
