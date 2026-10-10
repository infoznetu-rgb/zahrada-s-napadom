#!/usr/bin/env python3
"""Hide translations and reviewed low-value pages from the public build, with safe redirects."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ROBOTS = "noindex,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
META_TAG = re.compile(r"<meta\b[^>]*>", re.IGNORECASE)
ROBOTS_NAME = re.compile(r"""\bname\s*=\s*(["'])robots\1""", re.IGNORECASE)
CONTENT_ATTR = re.compile(r"""(\bcontent\s*=\s*)(["'])(.*?)\2""", re.IGNORECASE | re.DOTALL)

LOW_VALUE_SK_ARTICLES = (
    "chloroza-hortenzie-zelezo",
    "hortenzia-kvitne-zeleno",
    "hortenzia-meni-farbu-na-jesen",
    "hortenzia-na-balkone",
    "hortenzia-polamane-konare",
    "hortenzie-a-dazdova-voda",
    "hortenzie-a-okrasne-travy",
    "hortenzie-do-vazy",
    "hortenzie-k-trvalkam",
    "hortenzie-po-silnom-vetru",
    "hortenzie-tvrda-voda",
    "hortenzie-v-zime",
    "jarna-starostlivost-o-hortenzie",
    "jesenna-starostlivost-o-hortenzie",
    "kedy-rozmnozovat-hortenzie",
    "kedy-strihat-hortenzie-do-vazy",
    "letna-starostlivost-o-hortenzie",
    "odkvitnute-kvety-hortenzie",
    "omladenie-starej-hortenzie",
    "rez-annabelle",
    "rozmnozovanie-hortenzie-odrezkami",
    "susenie-kvetov-hortenzie",
    "velkost-kvetinaca-pre-hortenziu",
    "zimovanie-hortenzie-v-kvetinaci",
    "hortenzia-z-obchodu-do-zahrady",
    "hortenzie-a-hosty",
    "hortenzie-korene",
    "kontrola-opor-stromov-pred-zimou",
    "predzimny-vysev-kopru",
    "vysadba-aronie-na-jesen",
    "hortenzia-kvety-male",
    "hortenzia-slabe-vyhonky",
    "kora-pod-hortenzie",
    "vtacie-napajadlo-v-zime",
    "zazimovanie-vavrinu-v-crepniku",
    "hortenzia-v-tieni",
    "kompost-k-hortenziam",
    "najcastejsie-chyby-hortenzie",
    "raselina-hortenzie",
    "vanille-fraise-hortenzia",
    "vysadba-bazy-ciernej-na-jesen",
    "hortenzia-pada-po-dazdi",
    "phantom-hortenzia",
    "uskladnenie-akumulatorov-zahradnej-techniky",
    "zazimovanie-olivovnika-v-crepniku",
    "zazimovanie-tlakoveho-cistica",
    "endless-summer-hortenzia",
    "hortenzia-listy-ovisnute-rano",
    "little-lime-hortenzia",
    "rozmnozovanie-hortenzie-potapanim",
    "hortenzia-po-kupeni",
    "hortenzie-do-malej-zahrady",
    "najkrajsie-metlinate-hortenzie",
    "zimny-zber-topinamburov",
    "bobo-hortenzia",
    "hortenzie-myty",
    "hortenzie-pre-zaciatocnikov",
    "hortenzie-pri-dome",
    "limelight-hortenzia-pestovanie",
    "annabelle-vs-strong-annabelle",
    "hortenzia-na-plnom-slnku",
    "hortenzia-v-interieri",
    "hortenzia-v-kvetinaci",
    "hortenzie-a-ruze",
    "hortenzie-zivy-plot",
)

def redirect_page(path: Path) -> None:
    destination = "/blog.html"
    path.write_text(
        '<!doctype html><html lang="sk"><head><meta charset="utf-8">'
        '<meta name="robots" content="noindex,follow">'
        '<meta http-equiv="refresh" content="0;url=' + destination + '">'
        '<link rel="canonical" href="https://zahradasnapadom.sk' + destination + '">'
        '<title>Články o záhrade</title></head><body>'
        '<p>Tento článok už nie je dostupný. <a href="' + destination + '">Pozri aktuálne články o záhrade</a>.</p>'
        '<script>window.location.replace("' + destination + '");</script>'
        '</body></html>',
        encoding="utf-8",
    )


def page_route(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative.endswith("/index.html"):
        return "/" + relative[:-len("index.html")]
    if relative == "index.html":
        return "/"
    return "/" + relative


translation_pages = []
for locale in ("cs", "pl"):
    locale_root = ROOT / locale
    if locale_root.is_dir():
        translation_pages.extend(sorted(locale_root.rglob("*.html")))

low_value_pages = []
missing_low_value = []
for slug in LOW_VALUE_SK_ARTICLES:
    article = ROOT / "blog" / slug / "index.html"
    if article.is_file():
        low_value_pages.append(article)
    else:
        missing_low_value.append(slug)

pages_to_hide = list(dict.fromkeys(translation_pages + low_value_pages))
if not pages_to_hide:
    raise SystemExit("No Czech, Polish, or reviewed low-value pages found")

hidden_routes = {page_route(path) for path in pages_to_hide}
for path in pages_to_hide:
    redirect_page(path)

sitemap_path = ROOT / "sitemap.xml"
removed_sitemap_entries = 0
if sitemap_path.is_file():
    sitemap = sitemap_path.read_text(encoding="utf-8")
    url_pattern = re.compile(r"<url\b[^>]*>[\s\S]*?</url\s*>", re.IGNORECASE)

    def keep_sitemap_entry(match):
        global removed_sitemap_entries
        entry = match.group(0)
        loc = re.search(r"<loc>\s*https?://[^/]+([^<]*)</loc>", entry, re.IGNORECASE)
        if loc and loc.group(1) in hidden_routes:
            removed_sitemap_entries += 1
            return ""
        return entry

    sitemap = url_pattern.sub(keep_sitemap_entry, sitemap)
    sitemap_path.write_text(sitemap, encoding="utf-8")

if missing_low_value:
    print("WARNING: audited article files not found: " + ", ".join(missing_low_value))

print(
    f"Hidden {len(translation_pages)} Czech/Polish pages and "
    f"{len(low_value_pages)} reviewed low-value Slovak pages; "
    f"removed {removed_sitemap_entries} matching sitemap entries."
)
