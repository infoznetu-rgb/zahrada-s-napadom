#!/usr/bin/env python3
"""Generate an RSS 2.0 feed from published Slovak blog HTML pages."""
from pathlib import Path
from html.parser import HTMLParser
from email.utils import format_datetime
from datetime import datetime, timezone
from urllib.parse import quote, unquote, urlsplit
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
BASE = "https://zahradasnapadom.sk"
DOMAIN = "zahradasnapadom.sk"


class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.desc = ""
        self.image = ""
        self.canonical = ""
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            key = d.get("property", d.get("name", "")).lower()
            if key in ("description", "og:description") and not self.desc:
                self.desc = d.get("content", "")
            if key in ("og:image", "twitter:image") and not self.image:
                self.image = d.get("content", "")
            if key == "og:title" and not self.title:
                self.title = d.get("content", "")
        if tag == "link" and d.get("rel") == "canonical":
            self.canonical = d.get("href", "")

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title and not self.title:
            self.title = data.strip()


def updated(path):
    try:
        ts = subprocess.check_output(
            ["git", "log", "-1", "--format=%cI", "--", str(path.relative_to(ROOT))],
            cwd=ROOT,
            text=True,
        ).strip()
        return datetime.fromisoformat(ts) if ts else datetime.now(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def rss_jpeg(image_url):
    """Return a public JPEG URL for a local raster image, or an existing JPEG URL."""
    if not image_url:
        return None, 0
    absolute = image_url if "://" in image_url else BASE + (image_url if image_url.startswith("/") else "/" + image_url)
    parts = urlsplit(absolute)
    if parts.scheme not in ("http", "https"):
        return None, 0
    if parts.hostname != DOMAIN:
        if parts.path.lower().endswith((".jpg", ".jpeg")):
            return absolute, 0
        return None, 0

    source = (ROOT / unquote(parts.path).lstrip("/")).resolve()
    if not source.is_relative_to(ROOT.resolve()) or not source.is_file():
        return None, 0
    suffix = source.suffix.lower()
    if suffix in (".jpg", ".jpeg"):
        return absolute, source.stat().st_size
    if suffix not in (".webp", ".png"):
        return None, 0

    jpeg = source.with_name(source.stem + "-facebook.jpg")
    if not jpeg.is_file() or jpeg.stat().st_size == 0:
        return None, 0
    jpeg_path = "/" + jpeg.relative_to(ROOT).as_posix()
    return BASE + quote(jpeg_path, safe="/-._~"), jpeg.stat().st_size


items = []
for path in (ROOT / "blog").glob("*/index.html"):
    if path.stat().st_size < 1500:
        continue
    p = Meta()
    try:
        p.feed(path.read_text(encoding="utf-8"))
    except (UnicodeError, ValueError):
        continue
    if not p.title:
        continue
    url = BASE + "/blog/" + path.parent.name + "/"
    if p.canonical and (
        not p.canonical.startswith(BASE) or p.canonical.rstrip("/") != url.rstrip("/")
    ):
        continue
    items.append((updated(path), p, url))

items.sort(key=lambda x: x[0], reverse=True)
rss = ET.Element("rss", version="2.0")
ch = ET.SubElement(rss, "channel")
for tag, value in (
    ("title", "Záhrada s nápadom – články"),
    ("link", BASE + "/blog/"),
    ("description", "Praktické rady do záhrady a dielne"),
    ("language", "sk-SK"),
):
    ET.SubElement(ch, tag).text = value

for date, p, url in items[:50]:
    item = ET.SubElement(ch, "item")
    for tag, value in (
        ("title", p.title),
        ("link", url),
        ("guid", url),
        ("description", p.desc or p.title),
        ("pubDate", format_datetime(date)),
    ):
        ET.SubElement(item, tag).text = value
    image, length = rss_jpeg(p.image)
    if image:
        ET.SubElement(item, "enclosure", url=image, type="image/jpeg", length=str(length))

ET.indent(rss, space="  ")
ET.ElementTree(rss).write(ROOT / "rss.xml", encoding="utf-8", xml_declaration=True)
print("Generated rss.xml with", min(len(items), 50), "items")
