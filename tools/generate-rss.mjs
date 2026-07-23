// RSS собирается после сборки: обработчики маршрутов в статическом экспорте
// недоступны, а лента нужна для агрегаторов и подписки на новости.
import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';

const SITE_URL = 'https://news.talleks.ru';
const CONTENT_DIR = path.join(process.cwd(), 'content', 'news');
const OUT_FILE = path.join(process.cwd(), 'out', 'rss.xml');

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const posts = fs
  .readdirSync(CONTENT_DIR)
  .filter((file) => file.endsWith('.md'))
  .map((file) => {
    const { data } = matter(fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8'));
    return {
      slug: file.replace(/\.md$/, ''),
      title: data.title ?? '',
      description: data.description ?? '',
      date: data.date ?? '',
    };
  })
  .sort((a, b) => (a.date < b.date ? 1 : -1))
  .slice(0, 30);

const items = posts
  .map((post) => {
    const url = `${SITE_URL}/${post.slug}/`;
    const pubDate = new Date(`${post.date}T09:00:00+03:00`).toUTCString();
    return `    <item>
      <title>${escape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escape(post.description)}</description>
    </item>`;
  })
  .join('\n');

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Новости Таллекс Какао</title>
    <link>${SITE_URL}/</link>
    <description>Поставки какао-продуктов, сертификация, рынок какао и подбор сырья для производств.</description>
    <language>ru</language>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, rss, 'utf8');
console.log(`RSS собран: ${posts.length} записей → ${OUT_FILE}`);
