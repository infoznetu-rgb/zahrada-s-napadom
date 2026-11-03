#!/usr/bin/env python3
"""Bundle homepage CSS without changing cascade order, and reserve image layout space."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
homepage = root / "index.html"
html = homepage.read_text(encoding="utf-8")
# Inline render-blocking CSS in its original cascade position on the homepage.
# Unlike an external bundle this removes stylesheet network round trips.
# Below-the-fold sheets retain their existing deferred loading behavior.
critical_sheets = ('zahrada.css', 'studio-2026.css', 'spring-2026.css', 'typography-2026.css', 'app.css')
for filename in critical_sheets:
    css = (root / filename).read_text(encoding="utf-8")
    tag = f'<style data-home-critical="{filename}">\n{css}\n</style>'
    pattern = r'<link\b(?=[^>]*href=["\']/?' + re.escape(filename) + r'(?:\?[^"\']*)?["\'])[^>]*>'
    html = re.sub(pattern, lambda _: tag, html, flags=re.I)
    html = re.sub(r'<style data-home-critical="' + re.escape(filename) + r'">[\s\S]*?</style>', lambda _: tag, html)
print("Homepage critical CSS inlined in original cascade order")

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

# Inline the small homepage-only sheet in its original cascade position.
# Keep this sheet after the earlier critical rules, matching the source order.
clarity = (root / "home-clarity.css").read_text(encoding="utf-8")
clarity_tag = '<style data-home-clarity-inline>\n' + clarity + '\n</style>'
html = re.sub(r'<link\b(?=[^>]*href=["\']/?home-clarity\.css(?:\?[^"\']*)?["\'])[^>]*>', lambda _: clarity_tag, html, flags=re.I)
html = re.sub(r'<style data-home-clarity-inline>[\s\S]*?</style>', lambda _: clarity_tag, html)

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
