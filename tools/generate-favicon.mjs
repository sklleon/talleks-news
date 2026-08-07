// Иконка сайта собирается на этапе сборки, а не лежит в репозитории.
//
// Зачем так: Яндекс.Вебмастер отдельным пунктом требует favicon и без него
// сообщает «файл favicon не найден», а правило проекта запрещает держать
// в git графические файлы (.ico/.svg/.png). Генерация в out/ решает оба:
// на сайте файл есть по обычному адресу /favicon.svg, в репозитории его нет.
//
// Рисунок: какао-боб фирменного цвета (--accent #b29057) с продольной бороздой
// на кремовом скруглённом фоне (--cream #fff6ed) — те же цвета, что у шапки сайта.
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'out');

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="12" fill="#fff6ed"/>
  <ellipse cx="32" cy="32" rx="15" ry="21" transform="rotate(-20 32 32)" fill="#b29057"/>
  <path d="M25 17 Q32 32 39 47" stroke="#fff6ed" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>
`;

if (!fs.existsSync(OUT_DIR)) {
  console.error('generate-favicon: папки out/ нет — сборка не выполнялась');
  process.exit(1);
}

fs.writeFileSync(path.join(OUT_DIR, 'favicon.svg'), FAVICON, 'utf8');
console.log('generate-favicon: out/favicon.svg записан');
