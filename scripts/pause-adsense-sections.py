#!/usr/bin/env python3
"""Temporarily hide recipes and the community bazaar from the public build without deleting source or data."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def paused_page(title: str, description: str, route: str, message: str) -> str:
    return f'''<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="{description}">
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="https://zahradasnapadom.sk{route}">
  <meta name="theme-color" content="#5f965f">
  <title>{title} | Záhrada s nápadom</title>
  <link rel="stylesheet" href="/app.css?v=fix20261002">
  <style>
    body{{margin:0;background:#f8f8f2;color:#243226;font:16px/1.65 system-ui,sans-serif}}
    .pause-wrap{{max-width:760px;margin:8vh auto;padding:24px}}
    .pause-card{{padding:clamp(24px,5vw,48px);border:1px solid #d9dfcf;border-radius:24px;background:#fff}}
    .pause-card h1{{margin-top:0;color:#31533a}}
    .pause-card a{{color:#245d3e}}
    .pause-brand{{font-weight:750;text-decoration:none}}
  </style>
</head>
<body>
  <main class="pause-wrap">
    <p><a class="pause-brand" href="/">Záhrada s nápadom</a></p>
    <section class="pause-card" role="status">
      <h1>{title}</h1>
      <p>{message}</p>
      <p><a href="/blog.html">Prejsť na záhradné návody →</a></p>
    </section>
  </main>
</body>
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

# Rebuild these two routes as clear, noindex notices; their source content and data remain in GitHub/Supabase.
(ROOT / "bazar.html").write_text(
    paused_page(
        "Bazár je dočasne pozastavený",
        "Komunitný bazár je počas kontroly ponúk dočasne pozastavený.",
        "/bazar.html",
        "Kontrolujeme pravidlá a ponuky. Inzeráty ani formuláre sa počas kontroly nezobrazujú.",
    ),
    encoding="utf-8",
)
(ROOT / "recepty.html").write_text(
    paused_page(
        "Recepty momentálne kontrolujeme",
        "Receptovú sekciu dočasne kontrolujeme a nepridávame do verejnej ponuky.",
        "/recepty.html",
        "Recepty sme dočasne skryli, kým preveríme ich jedinečnosť, kvalitu a praktickosť.",
    ),
    encoding="utf-8",
)

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
        source = source.replace(
            '<h2>Komunita a bazár</h2><p>Vlastný nápad môžeš poslať cez formulár. Zverejnenie podlieha kontrole. <a href="/bazar.html">Bazár</a> umožňuje bezplatnú inzerciu súkromným osobám aj firmám; dohoda o predaji zostáva medzi inzerentom a záujemcom.</p>',
            '<h2>Komunita</h2><p>Vlastný nápad možno poslať cez formulár na titulnej stránke. Príspevky sa pred zverejnením kontrolujú.</p>',
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

print(f"Paused recipes and bazaar; scrubbed section links in {changed} public HTML files.")
