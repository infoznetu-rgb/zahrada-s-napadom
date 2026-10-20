#!/usr/bin/env python3
"""Generate JPEG sidecars for local raster images used by article RSS enclosures."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://zahradasnapadom.sk"
DOMAIN = "zahradasnapadom.sk"


class ArticleImages(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []

    def handle_starttag(self, tag, attrs):
        if tag != "meta":
            return
        attrs = dict(attrs)
        key = attrs.get("property", "").lower()
        if key == "og:image" and attrs.get("content"):
            self.images.append(attrs["content"])


def local_image_path(url):
    parts = urlsplit(url if "://" in url else BASE + (url if url.startswith("/") else "/" + url))
    if parts.hostname != DOMAIN or parts.username or parts.password:
        return None
    path = (ROOT / unquote(parts.path).lstrip("/")).resolve()
    if not path.is_relative_to(ROOT.resolve()) or not path.is_file():
        return None
    return path


def jpeg_sidecar(path):
    return path.with_name(path.stem + "-facebook.jpg")


def main():
    sources = set()
    for article in (ROOT / "blog").glob("*/index.html"):
        parser = ArticleImages()
        try:
            parser.feed(article.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, ValueError):
            continue
        for url in parser.images:
            source = local_image_path(url)
            if source and source.suffix.lower() in {".webp", ".png"}:
                sources.add(source)

    generated = 0
    for source in sorted(sources):
        target = jpeg_sidecar(source)
        target.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original)
            if image.mode in ("RGBA", "LA") or "transparency" in image.info:
                rgba = image.convert("RGBA")
                background = Image.new("RGB", rgba.size, "white")
                background.paste(rgba, mask=rgba.getchannel("A"))
                image = background
            else:
                image = image.convert("RGB")
            image.save(target, format="JPEG", quality=88, optimize=True, progressive=True)
        if not target.is_file() or target.stat().st_size == 0:
            raise RuntimeError(f"JPEG sidecar was not created: {target.relative_to(ROOT)}")
        generated += 1
    print(f"Generated {generated} Facebook JPEG sidecars")


if __name__ == "__main__":
    main()
