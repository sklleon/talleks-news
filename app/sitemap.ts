import type { MetadataRoute } from 'next';

import { getAllPosts, getRubrics, rubricSlug, SITE_URL } from '../lib/posts';

// Статический экспорт требует явного признака: файл собирается на билде
export const dynamic = 'force-static';

// Карта сайта собирается из файлов контента на каждой сборке —
// в отличие от sitemap.xml на Tilda, где вручную поддерживались 4 адреса из 30
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const latest = posts[0]?.date;

  return [
    { url: `${SITE_URL}/`, lastModified: latest, changeFrequency: 'weekly', priority: 1 },
    ...getRubrics().map((rubric) => ({
      url: `${SITE_URL}/rubrika/${rubricSlug(rubric)}/`,
      lastModified: latest,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/${post.slug}/`,
      lastModified: post.date,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
