import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  formatDate,
  getAllPosts,
  getPost,
  MAIN_SITE,
  renderMarkdown,
  SITE_NAME,
  SITE_URL,
} from '../../lib/posts';

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `${SITE_URL}/${post.slug}/`;
  // Материал-копия указывает каноном страницу основного сайта: два домена
  // с одним текстом иначе конкурируют друг с другом в выдаче
  const canonical = post.canonicalUrl || url;
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      locale: 'ru_RU',
      publishedTime: post.date,
      images: post.cover ? [post.cover] : undefined,
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    image: post.cover || undefined,
    mainEntityOfPage: `${SITE_URL}/${post.slug}/`,
    publisher: {
      '@type': 'Organization',
      name: 'Таллекс Какао',
      url: MAIN_SITE,
    },
  };

  return (
    <article>
      <header className="article-header">
        <div className="post-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {post.rubric && <span className="rubric-tag">{post.rubric}</span>}
        </div>
        <h1>{post.title}</h1>
      </header>

      {post.cover && (
        // Обложки лежат на CDN Tilda — оптимизатор Next на статике недоступен
        // eslint-disable-next-line @next/next/no-img-element
        <img className="article-cover" src={post.cover} alt="" loading="lazy" />
      )}

      <div
        className="article-body"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(post.body) }}
      />

      <section className="cta">
        <h2>Нужен расчёт под вашу рецептуру?</h2>
        <p>
          Подберём какао-продукт под задачу и пришлём цены на объём. Минимальная партия — 25 кг.
        </p>
        <a className="button" href={`${MAIN_SITE}/contacts/`}>
          Запросить цену
        </a>
      </section>

      <a className="back-link" href="/">
        ← Все материалы
      </a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }}
      />
    </article>
  );
}
