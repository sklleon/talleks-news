import { formatDate, getAllPosts, getRubrics, rubricSlug, SITE_URL } from '../lib/posts';

export default function FeedPage() {
  const posts = getAllPosts();
  const rubrics = getRubrics();

  // Лента отдаётся в готовом HTML — в отличие от Потока Tilda,
  // где список подставлялся скриптом и поисковики его не видели
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${SITE_URL}/${post.slug}/`,
      name: post.title,
    })),
  };

  return (
    <>
      <h1 className="page-title">Новости и материалы</h1>
      <p className="page-subtitle">
        Поступления, условия поставок, сертификация и разбор свойств какао-продуктов
        для технологов пищевых производств.
      </p>

      {rubrics.length > 0 && (
        <div className="rubrics">
          {rubrics.map((rubric) => (
            <a key={rubric} className="rubric-chip" href={`/rubrika/${rubricSlug(rubric)}/`}>
              {rubric}
            </a>
          ))}
        </div>
      )}

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.slug} className="post-card">
            <h2>
              <a href={`/${post.slug}/`}>{post.title}</a>
            </h2>
            <div className="post-meta">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              {post.rubric && <span className="rubric-tag">{post.rubric}</span>}
            </div>
            {post.description && <p>{post.description}</p>}
          </li>
        ))}
      </ul>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
    </>
  );
}
