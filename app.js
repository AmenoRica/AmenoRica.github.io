const projectList = document.querySelector('#project-list');

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function externalLink(label, value, className) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid URL');
  const link = element('a', className, label);
  link.href = url.href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${label} (새 탭)`);
  return link;
}

function renderProject(project, index) {
  if (!project.title || !project.description || !project.url) throw new Error('Missing project fields');
  const article = element('article', 'project');
  const headingId = `project-${index + 1}`;
  article.setAttribute('aria-labelledby', headingId);
  const top = element('div', 'project-top');
  top.append(element('span', 'project-kind', project.category || '프로젝트'), element('span', 'project-number', String(index + 1).padStart(2, '0')));
  const content = element('div', 'project-content');
  const heading = element('h3', '', project.title);
  heading.id = headingId;
  const link = externalLink('사이트 방문 ↗', project.url, 'project-link');
  link.setAttribute('aria-label', `${project.title} 사이트 방문 (새 탭)`);
  content.append(heading, element('p', 'project-description', project.description), link);
  const writing = element('div', 'writing');
  writing.append(element('h4', '', '회고 · 관련 글'));
  if (project.posts?.length) {
    const list = element('ul');
    for (const post of project.posts) {
      if (!post.title || !post.url) throw new Error('Missing post fields');
      const item = element('li');
      item.append(externalLink(`${post.title} ↗`, post.url));
      if (post.date && /^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
        const date = element('time', '', post.date.replaceAll('-', '.'));
        date.dateTime = post.date;
        item.append(date);
      }
      list.append(item);
    }
    writing.append(list);
  } else {
    writing.append(element('p', 'writing-empty', '프로젝트의 이야기를 이곳에 차근차근 기록할 예정입니다.'));
  }
  article.append(top, content, writing);
  return article;
}

async function loadProjects() {
  projectList.replaceChildren(element('p', 'load-message', '프로젝트를 불러오는 중입니다.'));
  try {
    const response = await fetch('./data/projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const projects = await response.json();
    if (!Array.isArray(projects)) throw new Error('Expected a project list');
    const items = projects.map(renderProject);
    projectList.replaceChildren(...items);
    if (!items.length) projectList.append(element('p', 'load-message', '등록된 프로젝트가 없습니다.'));
  } catch (error) {
    const message = element('p', 'load-message', '프로젝트 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const retry = element('button', 'retry', '다시 불러오기');
    retry.type = 'button';
    retry.addEventListener('click', loadProjects);
    projectList.replaceChildren(message, retry);
    console.error('Project loading failed:', error);
  }
}

const navLinks = [...document.querySelectorAll('.rail nav a')];
const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
let framePending = false;
function updateNavigation() {
  const marker = window.innerHeight * 0.35;
  let active = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= marker) active = section;
  }
  if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) active = sections.at(-1);
  for (const link of navLinks) {
    if (link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
  framePending = false;
}
function scheduleNavigationUpdate() {
  if (!framePending) { framePending = true; requestAnimationFrame(updateNavigation); }
}
window.addEventListener('scroll', scheduleNavigationUpdate, { passive: true });
window.addEventListener('resize', scheduleNavigationUpdate);
loadProjects().then(updateNavigation);
