import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import {
  formatDate,
  getAllPosts,
  getRubrics,
  rubricBySlug,
  rubricSlug,
  SITE_URL,
} from '../../../lib/posts';

type Params = { params: Promise<{ rubric: string }> };

export function generateStaticParams() {
  return getRubrics().map((rubric) => ({ rubric: rubricSlug(rubric) }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { rubric: slug } = await params;
  const rubric = rubricBySlug(slug);
  if (!rubric) return {};

  return {
    title: `${rubric} — новости Таллекс Какао`,
    description: `Материалы Таллекс Какао в рубрике «${rubric}».`,
    alternates: { canonical: `${SITE_URL}/rubrika/${slug}/` },
  };
}

export default async function RubricPage({ params }: Params) {
  const { rubric: slug } = await params;
  const rubric = rubricBySlug(slug);
  if (!rubric) notFound();

  const posts = getAllPosts().filter((post) => post.rubric === rubric);
  const rubrics = getRubrics();

  return (
    <>
      <h1 className="page-title">{rubric}</h1>
      <p className="page-subtitle">Материалы Таллекс Какао в рубрике «{rubric}».</p>

      <div className="rubrics">
        <a className="rubric-chip" href="/">
          Все материалы
        </a>
        {rubrics.map((item) => (
          <a
            key={item}
            className="rubric-chip"
            data-active={item === rubric}
            href={`/rubrika/${rubricSlug(item)}/`}
          >
            {item}
          </a>
        ))}
      </div>

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-card">
            <h2>
              <a href={`/${post.slug}/`}>{post.title}</a>
            </h2>
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
            {post.description && <p>{post.description}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}
