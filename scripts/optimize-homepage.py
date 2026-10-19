#!/usr/bin/env python3
"""Bundle homepage CSS without changing cascade order, and reserve image layout space."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
homepage = root / "index.html"
html = homepage.read_text(encoding="utf-8")
pattern = re.compile(r'<link\s+rel="stylesheet"\s+href="([^"]+\.css(?:\?[^"]*)?)"\s*/?>', re.I)
matches = list(pattern.finditer(html))
if len(matches) < 2:
    print("Homepage CSS already bundled or no matching stylesheets")
else:
    parts = []
    for match in matches:
        filename = match.group(1).split("?")[0]
        cssfile = root / filename
        if not cssfile.is_file():
            raise FileNotFoundError(f"Missing stylesheet: {filename}")
        parts.append(f"/* {filename} */\n" + cssfile.read_text(encoding="utf-8"))
    (root / "homepage-bundle.css").write_text("\n\n".join(parts), encoding="utf-8")
    first = matches[0]
    # Begin fetching the render-blocking bundle as early as possible.
    # Keep the ordinary stylesheet link to preserve CSS order and rendering.
    replacement = ('<link rel="preload" href="/homepage-bundle.css?v=20261019" as="style">\n'
                   '<link rel="stylesheet" href="/homepage-bundle.css?v=20261019">')
    html = html[:first.start()] + replacement + html[first.end():]
    html = pattern.sub("", html)
    print(f"Bundled {len(matches)} stylesheets")

# Reserve dimensions for the static logo and homepage project cards.
# The previous expression used a word boundary after a quote and never matched
# class="community-photo"; this explicitly matches the full class attribute.
def reserve_image_dimensions(match):
    tag = match.group(0)
    if 'width=' in tag or 'height=' in tag:
        return tag
    if re.search(r'class="[^"]*\bbrand-mark\b[^"]*"', tag):
        return tag[:-1] + ' width="46" height="46">'
    if re.search(r'class="[^"]*\bcommunity-photo\b[^"]*"', tag):
        return tag[:-1] + ' width="1200" height="900">'
    return tag

html = re.sub(r'<img\b[^>]*>', reserve_image_dimensions, html, flags=re.I)
homepage.write_text(html, encoding="utf-8")

# Replace the oversized remote title image with an optimized local WebP.
try:
    from urllib.request import urlopen
    from io import BytesIO
    from PIL import Image
    source = "https://pmrexbworebprrarhuxn.supabase.co/storage/v1/object/public/zahrada-media/opory-pre-hortenzie-a-pivonie/hortenzie-opora-titulna.png"
    with urlopen(source, timeout=15) as response:
        raw = response.read(8 * 1024 * 1024)
    image = Image.open(BytesIO(raw)).convert("RGB")
    image.thumbnail((1400, 1400))
    target = root / "assets" / "hortenzie-opora-titulna-optimized.webp"
    image.save(target, "WEBP", quality=78, method=6)
    for page in [root / "index.html", root / "dielna-s-napadom/opory-pre-hortenzie-a-pivonie/index.html"]:
        if page.exists():
            content = page.read_text(encoding="utf-8").replace(source, "/assets/hortenzie-opora-titulna-optimized.webp")
            page.write_text(content, encoding="utf-8")
    print(f"Optimized hydrangea image: {target.stat().st_size // 1024} KiB")
except Exception as error:
    print(f"Image optimization skipped (original remains): {error}")
