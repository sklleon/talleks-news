"""
Разовое сохранение обложек материалов с CDN Tilda, пока посты в Потоке живы.
После удаления постов файлы на static.tildacdn.com станут недоступны — это
единственный шанс сохранить оригиналы.

Картинки НЕ коммитятся в git (правило проекта, CLAUDE.md): складываем в
news-site/covers/ (папка в .gitignore) и пишем манифест соответствия
«адрес на Tilda → локальный файл» для будущей перезаливки на постоянный хостинг.

Запуск:  python3 news-site/tools/download_covers.py
"""

import json
import re
import ssl
import urllib.request
from pathlib import Path

import certifi

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content" / "news"
OUT = ROOT / "covers"
SSL_CTX = ssl.create_default_context(cafile=certifi.where())
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36"


def tilda_id(url: str) -> str:
    # tild3063-3130-4564-b664-623633313335 — стабильный идентификатор файла
    m = re.search(r"/(tild[0-9a-f-]+)/", url)
    return m.group(1) if m else re.sub(r"[^a-z0-9]+", "-", url.lower())[-40:]


def main() -> None:
    covers = {}
    for md in sorted(CONTENT.glob("*.md")):
        m = re.search(r'^cover:\s*"([^"]+)"', md.read_text(encoding="utf-8"), re.M)
        if m and m.group(1).strip():
            covers.setdefault(m.group(1).strip(), []).append(md.name)

    OUT.mkdir(exist_ok=True)
    manifest = {}
    for i, (url, posts) in enumerate(covers.items(), 1):
        ext = ".jpg" if ".jp" in url.lower() else Path(url).suffix or ".jpg"
        name = f"{tilda_id(url)}{ext}"
        dest = OUT / name
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            data = urllib.request.urlopen(req, timeout=30, context=SSL_CTX).read()
            dest.write_bytes(data)
            manifest[url] = {"file": name, "bytes": len(data), "posts": posts}
            print(f"  [{i}/{len(covers)}] {name}  ({len(data) // 1024} КБ, постов: {len(posts)})")
        except Exception as e:
            manifest[url] = {"file": None, "error": str(e), "posts": posts}
            print(f"  [{i}/{len(covers)}] ОШИБКА {url}: {e}")

    (OUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    ok = sum(1 for v in manifest.values() if v.get("file"))
    print(f"\nСохранено {ok}/{len(covers)} обложек в {OUT}")
    print(f"Манифест: {OUT / 'manifest.json'}")


if __name__ == "__main__":
    main()
