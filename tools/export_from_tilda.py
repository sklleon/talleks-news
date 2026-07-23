"""
Разовая выгрузка новостей и статей с talleks.ru (Поток Tilda + отдельные страницы)
в markdown-файлы нового сайта.

Как работает:
1. Список постов Потока собирается headless-браузером со страницы /news/ (лента
   рендерится скриптом, в исходном HTML ссылок нет). Дополнительно берутся адреса
   из sitemap.xml — там лежат экспертные статьи, которых в ленте может не быть.
2. Каждая страница скачивается обычным GET (текст поста отдаётся сервером в HTML)
   и разбирается: заголовок, дата, рубрика, обложка, тело.
3. Тело переводится в markdown, файл пишется в content/news/<slug>.md.

Slug генерируется заново из заголовка: в Tilda адреса выглядят как
«lzg551ly61-zhirnost-kakao-poroshka-1012-i-2022-kak» — с техническим префиксом
и обрезанным хвостом. Прежний адрес сохраняется в поле source_url, из него
потом собирается карта 301-редиректов.

Запуск:  python3 news-site/tools/export_from_tilda.py
"""

import json
import re
import ssl
import sys
import urllib.request
from datetime import datetime
from pathlib import Path

import certifi
from bs4 import BeautifulSoup

# У python.org-сборок на macOS нет системных корневых сертификатов — берём из certifi
SSL_CTX = ssl.create_default_context(cafile=certifi.where())

SITE = "https://talleks.ru"
FEED_URL = f"{SITE}/news/"
SITEMAP_URL = f"{SITE}/sitemap.xml"
OUT_DIR = Path(__file__).resolve().parent.parent / "content" / "news"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

# Транслитерация для чистых адресов
TRANSLIT = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sch",
    "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def slugify(title: str) -> str:
    s = title.lower().replace("ё", "е")
    s = "".join(TRANSLIT.get(c, c) for c in s)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    # адрес не должен быть простынёй: режем по границе слова
    if len(s) > 70:
        s = s[:70].rsplit("-", 1)[0]
    return s


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept-Language": "ru-RU"})
    with urllib.request.urlopen(req, timeout=30, context=SSL_CTX) as r:
        return r.read().decode("utf-8", errors="ignore")


def collect_feed_urls() -> list[str]:
    """Лента рендерится скриптом — снимаем ссылки браузером."""
    from playwright.sync_api import sync_playwright

    urls = set()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1400, "height": 1000}, locale="ru-RU")
        page.goto(FEED_URL, wait_until="networkidle", timeout=60000)
        # Лента рисуется скриптом с заметной задержкой: без явного ожидания
        # карточек можно снять пустую страницу и молча потерять все посты
        try:
            page.wait_for_selector("a[href*='/news/']", timeout=30000)
        except Exception:
            page.reload(wait_until="networkidle", timeout=60000)
            page.wait_for_selector("a[href*='/news/']", timeout=30000)
        page.wait_for_timeout(3000)
        for _ in range(12):
            page.mouse.wheel(0, 4000)
            page.wait_for_timeout(800)
            for sel in (".t-feed__showmore-btn", "button:has-text('Показать ещё')"):
                try:
                    el = page.locator(sel).first
                    if el.is_visible(timeout=400):
                        el.click(timeout=2000)
                        page.wait_for_timeout(1500)
                except Exception:
                    pass
        for href in page.eval_on_selector_all("a[href]", "els => els.map(e => e.href)"):
            clean = href.split("?")[0].split("#")[0]
            if "/news/" in clean and clean.rstrip("/") != FEED_URL.rstrip("/"):
                urls.add(clean)
        browser.close()
    return sorted(urls)


# Даты последнего изменения из sitemap — запасной вариант для страниц,
# у которых в разметке даты нет вовсе (экспертные статьи)
SITEMAP_DATES: dict[str, str] = {}


def collect_sitemap_urls() -> list[str]:
    try:
        xml = fetch(SITEMAP_URL)
    except Exception as e:
        print(f"  sitemap недоступен ({e}) — пропускаем", file=sys.stderr)
        return []
    for block in re.findall(r"<url>(.*?)</url>", xml, re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        mod = re.search(r"<lastmod>(\d{4}-\d{2}-\d{2})", block)
        if loc and mod:
            SITEMAP_DATES[loc.group(1).split("?")[0]] = mod.group(1)
    urls = re.findall(r"<loc>([^<]+)</loc>", xml)
    return sorted({u.split("?")[0] for u in urls
                   if "/news/" in u and u.rstrip("/") != FEED_URL.rstrip("/")})


def html_to_markdown(node) -> str:
    """Тело поста Tilda: h2/h3, абзацы, списки, ссылки, выделение."""
    def inline(el) -> str:
        out = []
        for child in el.children:
            name = getattr(child, "name", None)
            if name is None:
                out.append(str(child))
            elif name in ("strong", "b"):
                out.append(f"**{inline(child).strip()}**")
            elif name in ("em", "i"):
                out.append(f"*{inline(child).strip()}*")
            elif name == "a":
                href = child.get("href", "")
                out.append(f"[{inline(child).strip()}]({href})" if href else inline(child))
            elif name == "br":
                out.append("\n")
            else:
                out.append(inline(child))
        return "".join(out)

    # Редактор Потока не размечает абзацы тегами <p>: весь текст лежит одним
    # блоком .t-redactor__text, а абзацы разделены парами <br>. Такие блоки
    # разбираем отдельно, иначе разметки для поиска просто нет.
    block_tags = node.find_all(["h1", "h2", "h3", "h4", "p", "ul", "ol", "blockquote"])
    if not block_tags:
        # Абзац отделяется одним <br>, а не парой — режем по каждому переводу строки
        raw = inline(node)
        paragraphs = [re.sub(r"\s+", " ", p).strip() for p in raw.split("\n")]
        return "\n\n".join(p for p in paragraphs if p)

    blocks = []
    for el in block_tags:
        if el.find_parent(["ul", "ol"]) and el.name not in ("ul", "ol"):
            continue
        if el.name in ("h1", "h2"):
            text = inline(el).strip()
            if text:
                blocks.append(f"## {text}")
        elif el.name in ("h3", "h4"):
            text = inline(el).strip()
            if text:
                blocks.append(f"### {text}")
        elif el.name == "blockquote":
            text = inline(el).strip()
            if text:
                blocks.append(f"> {text}")
        elif el.name in ("ul", "ol"):
            items = []
            for i, li in enumerate(el.find_all("li", recursive=False), 1):
                text = inline(li).strip()
                if text:
                    items.append(f"{i}. {text}" if el.name == "ol" else f"- {text}")
            if items:
                blocks.append("\n".join(items))
        else:
            text = inline(el).strip()
            if text:
                blocks.append(text)

    md = "\n\n".join(blocks)
    md = re.sub(r"[ \t]+", " ", md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip()


def clean_body(body: str, title: str) -> str:
    """Убирает следы вёрстки Tilda из готового markdown."""
    # Служебные метки блоков вида «T004» в начале абзаца
    body = re.sub(r"(?m)^T\d{3,4}\s+", "", body)
    # Разделители «---» ломали бы фронтматтер файла
    body = re.sub(r"(?m)^-{3,}\s*$", "", body)

    lines = [ln for ln in body.split("\n")]
    # Заголовок выводится страницей из фронтматтера — в теле он был бы дублем
    while lines and not lines[0].strip():
        lines.pop(0)
    if lines and re.sub(r"^#+\s*", "", lines[0]).strip().lower() == title.strip().lower():
        lines.pop(0)

    cleaned = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", cleaned).strip()


def parse_post(browser, url: str) -> dict | None:
    # И лента, и тексты постов Потока подставляются скриптом — сырой HTML пуст,
    # поэтому каждую страницу открываем браузером. Пост Потока рисуется поверх
    # ленты, и переиспользованная вкладка оставляет текст от предыдущего поста,
    # поэтому на каждый адрес берём свежую вкладку и ждём появления текста.
    page = browser.new_page(viewport={"width": 1400, "height": 1000}, locale="ru-RU")
    try:
        page.goto(url, wait_until="networkidle", timeout=60000)
        try:
            page.wait_for_function(
                """() => {
                    const el = document.querySelector('.js-feed-post-text, .t-feed__post-popup__text');
                    if (el && el.innerText.trim().length > 80) return true;
                    // экспертные статьи свёрстаны обычными блоками, а не Потоком
                    return document.querySelectorAll('.t-records .t-text').length > 0;
                }""",
                timeout=20000,
            )
        except Exception:
            page.wait_for_timeout(3000)
        html = page.content()
    finally:
        page.close()

    soup = BeautifulSoup(html, "lxml")

    title_el = soup.select_one(".js-feed-post-title") or soup.select_one("h1")
    og_title = soup.find("meta", property="og:title")
    title = (title_el.get_text(strip=True) if title_el
             else og_title["content"] if og_title else "")
    if not title:
        return None

    body_el = soup.select_one(".js-feed-post-text") or soup.select_one(".t-feed__post-popup__text")
    if body_el is None and soup.select_one(".t-feed") is None:
        # Экспертные статьи свёрстаны обычными блоками Tilda, а не Потоком: текст
        # лежит в одном крупном блоке .t-rec, рядом с меню, шапкой и контактами.
        # Берём самый объёмный блок — остальные заведомо короче.
        # Для постов Потока такая подмена запрещена: она подсунула бы вместо тела
        # заголовок и замаскировала посты, у которых текста нет вовсе.
        blocks = sorted(soup.select(".t-rec"), key=lambda r: len(r.get_text(" ", strip=True)))
        body_el = blocks[-1] if blocks else soup.body
    body = clean_body(html_to_markdown(body_el), title) if body_el is not None else ""

    # Дата встречается в двух видах: «2026-07-08 11:26» в сыром HTML и «08.07.2026» после рендера
    date = ""
    for up in soup.select(".t-uptitle, .t-feed__post-popup__date"):
        text = up.get_text(" ", strip=True)
        iso = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
        ru = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", text)
        if iso:
            date = iso.group(0)
            break
        if ru:
            date = f"{ru.group(3)}-{ru.group(2)}-{ru.group(1)}"
            break

    rubric = ""
    tag = soup.select_one(".t-feed__post-popup__tag")
    if tag:
        rubric = tag.get_text(strip=True)

    og_image = soup.find("meta", property="og:image")
    desc_el = soup.find("meta", attrs={"name": "description"})
    description = desc_el["content"].strip() if desc_el and desc_el.get("content") else ""
    if not description and body:
        first = body.split("\n\n")[0]
        description = re.sub(r"[*#\[\]]", "", first)[:160].strip()

    # У экспертных страниц даты в разметке нет — подставляем lastmod из sitemap
    # и помечаем флагом, чтобы её можно было выправить вручную
    estimated = not date
    if estimated:
        date = SITEMAP_DATES.get(url) or SITEMAP_DATES.get(url.rstrip("/") + "/") \
            or datetime.now().strftime("%Y-%m-%d")

    return {
        "title": title,
        "slug": slugify(title),
        "date": date,
        "date_estimated": estimated,
        "rubric": rubric,
        "description": description,
        "cover": og_image["content"] if og_image and og_image.get("content") else "",
        "source_url": url,
        "body": body,
    }


def yaml_escape(value: str) -> str:
    return '"' + value.replace("\\", "\\\\").replace('"', '\\"') + '"'


def write_markdown(post: dict, seen: dict) -> Path | None:
    """Пишет пост. При совпадении адресов оставляет более полный текст."""
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{post['slug']}.md"

    previous = seen.get(post["slug"])
    if previous is not None:
        if len(post["body"]) <= len(previous["body"]):
            print(f"      дубль адреса {post['slug']} — оставлен более полный текст "
                  f"({len(previous['body'])} зн. против {len(post['body'])})")
            return None
        print(f"      дубль адреса {post['slug']} — заменён на более полный текст "
              f"({len(post['body'])} зн. против {len(previous['body'])})")
    seen[post["slug"]] = post

    front = "\n".join([
        "---",
        f"title: {yaml_escape(post['title'])}",
        f"date: {post['date']}",
        f"date_estimated: {'true' if post.get('date_estimated') else 'false'}",
        f"rubric: {yaml_escape(post['rubric'])}",
        f"description: {yaml_escape(post['description'])}",
        f"cover: {yaml_escape(post['cover'])}",
        f"source_url: {yaml_escape(post['source_url'])}",
        "---",
        "",
    ])
    path.write_text(front + post["body"] + "\n", encoding="utf-8")
    return path


def main() -> None:
    print("Собираю адреса постов из ленты (браузер)…")
    urls = collect_feed_urls()
    print(f"  из ленты: {len(urls)}")
    if not urls:
        sys.exit("Лента не отдала ни одной ссылки — прерываюсь, чтобы не затереть "
                 "уже выгруженные материалы. Запусти ещё раз.")
    extra = [u for u in collect_sitemap_urls() if u not in urls]
    print(f"  из sitemap дополнительно: {len(extra)}")
    urls = urls + extra

    from playwright.sync_api import sync_playwright

    posts, failed, duplicates, seen = [], [], [], {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for i, url in enumerate(urls, 1):
            try:
                # Сайт за DDoS-Guard изредка не отвечает за отведённое время —
                # одна осечка не должна стоить нам поста
                try:
                    post = parse_post(browser, url)
                except Exception as first_error:
                    print(f"      повтор после ошибки: {str(first_error)[:60]}")
                    post = parse_post(browser, url)
                if post is None or not post["body"]:
                    failed.append((url, "на сайте у поста нет текста — только заголовок"))
                    print(f"  [{i}/{len(urls)}] БЕЗ ТЕКСТА  {url}")
                    continue
                path = write_markdown(post, seen)
                if path is None:
                    # Дубль: файл не переписан, но прежний адрес всё равно
                    # должен вести на новый — иначе он останется без редиректа
                    duplicates.append(post)
                    continue
                posts.append(post)
                print(f"  [{i}/{len(urls)}] {path.name}  ({len(post['body'])} зн., {post['date']}, {post['rubric'] or 'без рубрики'})")
            except Exception as e:
                failed.append((url, str(e)))
                print(f"  [{i}/{len(urls)}] ОШИБКА {url}: {e}")
        browser.close()

    # Карта редиректов: прежний адрес → новый. Посты без текста ведут на ленту —
    # переносить у них нечего, но 404 на проиндексированном адресе недопустим.
    redirects = {p["source_url"].replace(SITE, ""): f"/{p['slug']}" for p in posts + duplicates}
    for url, _ in failed:
        redirects.setdefault(url.replace(SITE, ""), "/")
    map_path = OUT_DIR.parent.parent / "redirects.json"
    map_path.write_text(json.dumps(redirects, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nГотово: {len(posts)} перенесено, {len(failed)} не удалось.")
    print(f"Карта редиректов: {map_path}")
    if failed:
        print("Не удалось:")
        for url, why in failed:
            print(f"  - {url}: {why}")


if __name__ == "__main__":
    main()
