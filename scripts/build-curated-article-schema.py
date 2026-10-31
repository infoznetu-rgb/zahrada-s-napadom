#!/usr/bin/env python3
"""Add consistent BlogPosting structured data to reviewed Slovak articles."""
from __future__ import annotations

from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://zahradasnapadom.sk"


class ArticleHead(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title = ""
        self.description = ""
        self.canonical = ""
        self.image = ""
        self.in_title = False
        self.in_h1 = False
        self.h1 = ""
        self.schemas: list[dict] = []
        self.in_schema = False
        self.schema_text = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.in_h1 = True
        elif tag == "meta" and a.get("name", "").lower() == "description":
            self.description = a.get("content") or ""
        elif tag == "meta" and a.get("property", "").lower() == "og:image":
            self.image = a.get("content") or ""
        elif tag == "link" and a.get("rel", "").lower() == "canonical":
            self.canonical = a.get("href") or ""
        elif tag == "script" and a.get("type", "").lower() == "application/ld+json":
            self.in_schema = True
            self.schema_text = ""

    def handle_data(self, data: str) -> None:
        if self.in_title:
            self.title += data
        if self.in_h1:
            self.h1 += data
        if self.in_schema:
            self.schema_text += data

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.in_title = False
        elif tag == "h1":
            self.in_h1 = False
        elif tag == "script" and self.in_schema:
            try:
                value = json.loads(self.schema_text)
            except json.JSONDecodeError as error:
                raise SystemExit(f"Invalid JSON-LD in curated article: {error}")
            self.schemas.append(value)
            self.in_schema = False


def walk(value):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def date_value(value: str, slug: str) -> str:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date().isoformat()
    except (TypeError, ValueError):
        raise SystemExit(f"Curated article has invalid published_at: {slug}")


items = json.loads((ROOT / "data/seo-blog-100-list.json").read_text(encoding="utf-8"))
updated = 0
for item in items:
    slug = str(item.get("slug", "")).strip()
    page = ROOT / "blog" / slug / "index.html"
    if not slug or not page.is_file():
        raise SystemExit(f"Curated article page is missing: {slug or item}")
    source = page.read_text(encoding="utf-8-sig")
    head = ArticleHead()
    head.feed(source)
    canonical = f"{ORIGIN}/blog/{slug}/"
    if head.canonical != canonical:
        raise SystemExit(f"Curated article canonical mismatch: {slug}")
    existing = [node for schema in head.schemas for node in walk(schema)]
    if any(
        node.get("url") == canonical
        and any(t in (node.get("@type") if isinstance(node.get("@type"), list) else [node.get("@type")])
                for t in ("BlogPosting", "Article"))
        for node in existing
    ):
        continue

    title = head.h1.strip()
    description = head.description.strip()
    image = head.image.strip() or str(item.get("cover_url", "")).strip()
    if not title or not description or not image:
        raise SystemExit(f"Curated article is missing title, description, or image: {slug}")
    if image.startswith("/"):
        image = ORIGIN + image
    if not image.startswith(ORIGIN + "/"):
        raise SystemExit(f"Curated article image must be hosted on the site: {slug}")

    date_published = date_value(str(item.get("published_at", "")), slug)
    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": description,
        "url": canonical,
        "mainEntityOfPage": {"@type": "WebPage", "@id": canonical},
        "image": image,
        "datePublished": date_published,
        "articleSection": str(item.get("category", "Záhrada")),
        "inLanguage": "sk-SK",
        "isAccessibleForFree": True,
        "author": {"@type": "Organization", "name": "Záhrada s nápadom", "url": ORIGIN + "/"},
        "publisher": {"@type": "Organization", "name": "Záhrada s nápadom", "url": ORIGIN + "/"},
    }
    snippet = '<script type="application/ld+json">' + json.dumps(schema, ensure_ascii=False, separators=(",", ":")) + "</script>\n"
    if "</head>" not in source.lower():
        raise SystemExit(f"Curated article has no head close tag: {slug}")
    source = re.sub(r"</head\s*>", lambda _: snippet + "</head>", source, count=1, flags=re.IGNORECASE)
    page.write_text(source, encoding="utf-8")
    updated += 1

print(f"Structured data: added BlogPosting metadata to {updated} reviewed articles; retained existing valid article schema.")
