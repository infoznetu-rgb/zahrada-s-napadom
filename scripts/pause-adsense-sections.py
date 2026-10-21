#!/usr/bin/env python3
"""Temporarily hide recipes and the community bazaar from the public build without deleting source or data."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def redirect_page(route: str) -> str:
    """Keep a hidden route out of public view and send visitors to a working section."""
    destination = "/blog.html"
    return f'''<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://zahradasnapadom.sk{destination}">
  <meta http-equiv="refresh" content="0;url={destination}">
  <title>Presmerovanie | Záhrada s nápadom</title>
  <script>location.replace("{destination}");</script>
</head>
<body></body>
</html>
'''

def hide_links(source: str) -> str:
    anchor = re.compile(r'<a\b[^>]*\bhref\s*=\s*(["\'])(.*?)\1[^>]*>[\s\S]*?</a\s*>', re.IGNORECASE)
    def keep_or_remove(match):
        href = match.group(2).strip().split("#", 1)[0].split("?", 1)[0]
        href = re.sub(r"^https?://(?:www\.)?zahradasnapadom\.sk", "", href, flags=re.I)
        route = href.lstrip("./")
        if route in {"bazar.html", "recepty.html"} or route.startswith("recepty/"):
            return ""
        return match.group(0)
    return anchor.sub(keep_or_remove, source)

# Keep the old URLs out of public view; original source and data remain in GitHub/Supabase.
for route in ("bazar.html", "recepty.html"):
    (ROOT / route).write_text(redirect_page(route), encoding="utf-8")

# Remove every public navigation or in-content link to the paused sections.
changed = 0
for path in ROOT.rglob("*.html"):
    rel = path.relative_to(ROOT).as_posix()
    if rel.startswith(("admin/", "cs/", "pl/", "work/")):
        continue
    before = path.read_text(encoding="utf-8")
    source = hide_links(before)
    if rel == "o-projekte.html":
        source = source.replace(
            'Vlastné realizácie dopĺňa <a href="/blog.html">blog</a>, recepty zo záhrady, sezónne rady a <a href="/pomocky.html">praktické kalkulačky</a>.',
            'Vlastné realizácie dopĺňa <a href="/blog.html">blog</a>, sezónne rady a <a href="/pomocky.html">praktické kalkulačky</a>.',
        )
        source = re.sub(
            r'<h2>Komunita a bazár</h2>\s*<p>[\s\S]*?</p>',
            '<h2>Komunita</h2><p>Vlastný nápad možno poslať cez formulár na titulnej stránke. Príspevky sa pred zverejnením kontrolujú.</p>',
            source,
        )
    if rel == "moja-zahrada.html":
        # Keep the private garden app, but remove its now-paused recipe promotions.
        source = re.sub(
            r'<a\b[^>]*class=["\'][^"\']*app-home-highlight-recipes[^"\']*["\'][^>]*>[\s\S]*?</a\s*>',
            "",
            source,
            count=1,
            flags=re.I,
        )
        source = re.sub(
            r'<div class=["\']app-home-reading-group["\']>\s*<h3>RECEPT ZO ZÁHRADY</h3>[\s\S]*?</div>\s*</div>\s*</section>',
            '</div>\n    </section>',
            source,
            count=1,
            flags=re.I,
        )
        source = source.replace(
            "Krátka ukážka článkov zo záhrady a receptov z vlastnej úrody.",
            "Krátka ukážka praktických článkov zo záhrady.",
        )
        source = source.replace(
            ".app-home-reading-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}",
            ".app-home-reading-grid{display:grid;grid-template-columns:1fr;gap:14px}",
        )
    if rel == "index.html":
        source = source.replace(
            "Nájdeš tu vlastné nápady, skúsenosti, inšpiráciu a bezplatný bazár pre záhradu a dielňu, kde môžu inzerovať ľudia aj firmy.",
            "Nájdeš tu vlastné nápady, skúsenosti, inšpiráciu a praktické pomôcky pre záhradu a dielňu.",
        )
        source = source.replace(
            "Nájdeš tu vlastné návody, projekty, praktické pomôcky a bezplatný komunitný bazár.",
            "Nájdeš tu vlastné návody, projekty a praktické pomôcky.",
        )
    if source != before:
        path.write_text(source, encoding="utf-8")
        changed += 1

# Keep paused pages out of discovery, including any stale entries from earlier builds.
sitemap_path = ROOT / "sitemap.xml"
if sitemap_path.exists():
    sitemap = sitemap_path.read_text(encoding="utf-8")
    url_entry = re.compile(r"<url\b[^>]*>[\s\S]*?</url\s*>", re.IGNORECASE)
    def keep_url(match):
        loc = re.search(r"<loc>\s*https?://[^/]+([^<]*)</loc>", match.group(0), re.IGNORECASE)
        if not loc:
            return match.group(0)
        route = loc.group(1).split("#", 1)[0].split("?", 1)[0].lstrip("/")
        return "" if route in {"bazar.html", "recepty.html"} or route.startswith("recepty/") else match.group(0)
    sitemap_path.write_text(url_entry.sub(keep_url, sitemap), encoding="utf-8")

print(f"Redirected paused recipes and bazaar; scrubbed section links in {changed} public HTML files.")
