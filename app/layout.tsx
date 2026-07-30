import type { Metadata } from 'next';

import { MAIN_SITE, SITE_NAME, SITE_URL } from '../lib/posts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — какао-порошок, какао-масло, какао тёртое оптом`,
    template: '%s | Таллекс Какао',
  },
  description:
    'Новости и экспертные материалы Таллекс Какао: поступления какао-продуктов, ' +
    'сертификация, рынок какао и подбор сырья для пищевых производств.',
  alternates: {
    types: { 'application/rss+xml': `${SITE_URL}/rss.xml` },
  },
  // Подтверждение прав в Google Search Console и Яндекс.Вебмастере
  verification: {
    google: 'rM6mw21S6Nd6LbRQyDdOsDMm7Lsxa62aHJG2mx5DIkI',
    yandex: 'e0db4e1af6c8e791',
  },
};

// Тот же счётчик, что и на talleks.ru, — чтобы путь «читал новость → перешёл
// на основной сайт → оставил заявку» считался как один визит, а не два разных.
// В отчётах домены разделяются фильтром по URL страницы.
const METRIKA_ID = 103813205;

const metrikaSnippet = `
(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${METRIKA_ID}, "init", {
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  webvisor: true
});
`.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script dangerouslySetInnerHTML={{ __html: metrikaSnippet }} />
      </head>
      <body>
        <noscript>
          <div>
            <img
              src={`https://mc.yandex.ru/watch/${METRIKA_ID}`}
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>

        <header className="site-header">
          <div className="wrap">
            <a className="brand" href="/">
              Таллекс <span>Какао</span>
            </a>
            <nav className="site-nav">
              <a href={`${MAIN_SITE}/catalog/`}>Каталог</a>
              <a href={`${MAIN_SITE}/about/`}>О компании</a>
              <a href={`${MAIN_SITE}/contacts/`}>Контакты</a>
            </nav>
          </div>
        </header>

        <main className="wrap">{children}</main>

        <footer className="site-footer">
          <div className="wrap">
            <p>
              Таллекс Какао — оптовый поставщик какао-продуктов по всей России.
              Какао-порошок, какао-масло, какао тёртое для пищевых и кондитерских производств.
            </p>
            <p>
              <a href={MAIN_SITE}>talleks.ru</a> · <a href="tel:+74993900838">+7 (499) 390-08-38</a> ·{' '}
              <a href="/rss.xml">RSS</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
