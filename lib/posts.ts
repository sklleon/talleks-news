import fs from 'node:fs';
import path from 'node:path';

import matter from 'gray-matter';
import { marked } from 'marked';

export const SITE_URL = 'https://news.talleks.ru';
export const MAIN_SITE = 'https://talleks.ru';
export const SITE_NAME = 'Новости Таллекс Какао';

const CONTENT_DIR = path.join(process.cwd(), 'content', 'news');

export type Post = {
  slug: string;
  title: string;
  date: string;
  dateEstimated: boolean;
  rubric: string;
  description: string;
  cover: string;
  sourceUrl: string;
  /** Канон на другом домене. Заполняется, когда первоисточник текста —
   *  основной сайт talleks.ru, а здесь лежит копия: тогда canonical уводит
   *  на talleks.ru, и материал не попадает в нашу карту сайта. */
  canonicalUrl: string;
  body: string;
};

/** YAML разбирает `date: 2026-05-20` в Date — возвращаем обратно к «ГГГГ-ММ-ДД»,
 *  иначе в разметку попадает «Wed May 20 2026 03:00:00 GMT+0300», а сортировка
 *  по строке такой даты даёт произвольный порядок. */
function normalizeDate(value: unknown): string {
  if (value instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  }
  return String(value ?? '');
}

function readPost(fileName: string): Post {
  const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), 'utf8');
  const { data, content } = matter(raw);
  return {
    slug: fileName.replace(/\.md$/, ''),
    title: String(data.title ?? ''),
    date: normalizeDate(data.date),
    dateEstimated: data.date_estimated === true,
    rubric: String(data.rubric ?? ''),
    description: String(data.description ?? ''),
    cover: String(data.cover ?? ''),
    sourceUrl: String(data.source_url ?? ''),
    canonicalUrl: String(data.canonical_url ?? ''),
    body: content.trim(),
  };
}

export function getAllPosts(): Post[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map(readPost)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function getPost(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

export function getRubrics(): string[] {
  const rubrics = new Set<string>();
  for (const post of getAllPosts()) {
    if (post.rubric) rubrics.add(post.rubric);
  }
  return [...rubrics].sort();
}

// Рубрики в адресах — латиницей: кириллица в путях статического сайта
// превращается в процент-кодирование и плохо читается в выдаче
const RUBRIC_SLUGS: Record<string, string> = {
  'Новое поступление': 'novoe-postuplenie',
  'Спецпредложение': 'spetspredlozhenie',
  'Ассортимент': 'assortiment',
  'Сертификация': 'sertifikatsiya',
  'Рынок': 'rynok',
};

export function rubricSlug(rubric: string): string {
  return RUBRIC_SLUGS[rubric] ?? rubric.toLowerCase().replace(/\s+/g, '-');
}

export function rubricBySlug(slug: string): string | undefined {
  return Object.keys(RUBRIC_SLUGS).find((r) => RUBRIC_SLUGS[r] === slug)
    ?? getRubrics().find((r) => rubricSlug(r) === slug);
}

export function renderMarkdown(body: string): string {
  return marked.parse(body, { async: false }) as string;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`;
}
