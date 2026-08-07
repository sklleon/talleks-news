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
  // Иконка не лежит в репозитории — правило проекта запрещает держать в git
  // графику. Файл /favicon.svg генерируется на этапе сборки
  // (tools/generate-favicon.mjs, вызывается из postbuild): на сайте он есть
  // по обычному адресу, в репозитории его нет. Яндекс.Вебмастер требует favicon
  // отдельным пунктом и без файла сообщает «не найден».
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
  // Подтверждение прав в Google Search Console и Яндекс.Вебмастере.
  // Кодов Яндекса два, потому что сайт подтверждён в двух разных аккаунтах
  // Вебмастера: e0db4e1... — тот, где сайт был заведён при переезде 23.07.2026,
  // d99f6566... — основной аккаунт компании, где живут talleks.ru и счётчик
  // Метрики 103813205 (код у Яндекса выдаётся на аккаунт, а не на сайт).
  // Оба нужны: убрать первый — отвалится старый кабинет.
  verification: {
    google: 'rM6mw21S6Nd6LbRQyDdOsDMm7Lsxa62aHJG2mx5DIkI',
    yandex: ['e0db4e1af6c8e791', 'd99f6566ecd66fcd'],
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

// Организация — единый блок на всех страницах. Нужен, чтобы поисковик связывал
// новостной поддомен с юрлицом и его адресом: без адреса на страницах Яндекс.Вебмастер
// не даёт подтвердить регион сайта (упёрлись в это 03.08.2026).
// NAP обязан совпадать с эталоном в `catalogs/kartochka-kompanii.md` основного репозитория —
// расхождения мешают поисковикам склеить карточки в один бизнес.
const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${MAIN_SITE}/#organization`,
  name: 'Таллекс Какао',
  legalName: 'ООО «Таллекс Какао»',
  url: MAIN_SITE,
  telephone: '+7 (499) 390-08-38',
  email: 'info@talleks.ru',
  taxID: '9717001406',
  vatID: '9717001406',
  identifier: { '@type': 'PropertyValue', name: 'ОГРН', value: '1157746857377' },
  description:
    'Оптовый поставщик какао-порошка, какао-масла и какао тёртого ' +
    'для пищевых и кондитерских производств России.',
  address: {
    '@type': 'PostalAddress',
    postalCode: '129075',
    addressCountry: 'RU',
    addressRegion: 'Москва',
    addressLocality: 'Москва',
    streetAddress: 'ул. Аргуновская, д. 3, корп. 1, этаж 6, офис 26',
  },
  openingHours: 'Mo-Fr 09:00-18:00',
  sameAs: [SITE_URL],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <script dangerouslySetInnerHTML={{ __html: metrikaSnippet }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }}
        />
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

            {/* Адрес и реквизиты видимым текстом: по нему Яндекс подтверждает регион сайта. */}
            <address className="footer-nap">
              <strong>ООО «Таллекс Какао»</strong>
              <br />
              ИНН 9717001406 · ОГРН 1157746857377
              <br />
              Офис: 129075, г. Москва, ул. Аргуновская, д. 3, корп. 1, этаж 6, офис 26
              <br />
              Склад отгрузки: 142006, Московская обл., г. Домодедово, ул. Рябиновая, стр. 14, к. 1
              <br />
              Режим работы: Пн–Пт, 09:00–18:00
            </address>

            <p>
              <a href={MAIN_SITE}>talleks.ru</a> · <a href="tel:+74993900838">+7 (499) 390-08-38</a> ·{' '}
              <a href="mailto:info@talleks.ru">info@talleks.ru</a> · <a href="/rss.xml">RSS</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
