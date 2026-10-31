#!/usr/bin/env python3
"""Hide translations and unreviewed pages from search, with safe redirects for merged pages."""
from pathlib import Path
import json
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

# Unreviewed 2 Oct batch: sampled pages repeated a short generic template and
# near-identical care advice, so keep them out of search and the archive pending editing.
REVIEW_PENDING_SK_ARTICLES = (
    "ako-sadit-hortenziu",
    "hnojenie-hortenzii-na-jar",
    "hnojenie-hortenzii-v-lete",
    "hnojivo-na-hortenzie",
    "hortenzia-cierne-listy",
    "hortenzia-dubolista-pestovanie",
    "hortenzia-hnede-listy",
    "hortenzia-kalinolista-pestovanie",
    "hortenzia-listy-spalene-slnkom",
    "hortenzia-metlinata-pestovanie",
    "hortenzia-nekvitne-po-zime",
    "hortenzia-pilovita-pestovanie",
    "hortenzia-po-mraze",
    "hortenzia-po-zime-nerastie",
    "hortenzia-popinava-pestovanie",
    "hortenzia-preliata",
    "hortenzia-rastie-pomaly",
    "hortenzia-skvrny-na-listoch",
    "hortenzia-stromcekovita-annabelle-pestovanie",
    "hortenzia-sucha",
    "hortenzia-v-kvetinaci-vadne",
    "hortenzia-vadnutie-horucava",
    "hortenzia-zlte-listy",
    "hortenzie-kalendar-starostlivosti",
    "hortenzie-po-presadeni-vadnu",
    "hortenzie-pod-stromami",
    "hortenzie-v-chladnych-oblastiach",
    "kam-zasadit-hortenziu",
    "kedy-sadit-hortenzie",
    "mucnatka-na-hortenzii",
    "mulcovanie-hortenzii",
    "poda-pre-hortenzie",
    "presadzanie-hortenzie",
    "rez-hortenzie-kalinolistej",
    "rez-hortenzie-metlinatej",
    "roztoce-na-hortenzii",
    "slimaky-hortenzie",
    "substrat-pre-hortenzie-v-kvetinaci",
    "vosky-na-hortenzii",
    "vzdialenost-hortenzii-pri-vysadbe",
    "zalievanie-hortenzii",
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
for slug in (*LOW_VALUE_SK_ARTICLES, *REVIEW_PENDING_SK_ARTICLES):
    article = ROOT / "blog" / slug / "index.html"
    if article.is_file():
        low_value_pages.append(article)
    else:
        missing_low_value.append(slug)

curated_path = ROOT / "data" / "seo-blog-100-list.json"
if not curated_path.is_file():
    raise SystemExit("Curated article list is missing; refusing to change article indexing")
try:
    curated_items = json.loads(curated_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as error:
    raise SystemExit(f"Could not read curated article list: {error}")
curated_slugs = {
    str(item.get("slug", "")).strip()
    for item in curated_items
    if isinstance(item, dict) and item.get("slug")
}
if not curated_slugs:
    raise SystemExit("Curated article list is empty; refusing to change article indexing")

all_blog_pages = sorted((ROOT / "blog").glob("*/index.html"))
reviewed_low_value = set(low_value_pages)
unreviewed_blog_pages = [
    page for page in all_blog_pages
    if page not in reviewed_low_value and page.parent.name not in curated_slugs
]

# Keep merged redirect stubs and other noindex pages out of the visitor archive too.
curated_noindex_pages = []

pages_to_hide = list(dict.fromkeys(translation_pages + low_value_pages))
if not pages_to_hide:
    raise SystemExit("No Czech, Polish, or reviewed low-value pages found")

hidden_routes = {page_route(path) for path in pages_to_hide}

# Keep the archive, CMS fallback, and search index aligned with the reviewed shortlist.
hidden_blog_slugs = sorted({
    path.parent.name
    for path in (*low_value_pages, *unreviewed_blog_pages, *curated_noindex_pages)
})
(ROOT / "data" / "hidden-blog-slugs.json").write_text(
    json.dumps(hidden_blog_slugs, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
for path in pages_to_hide:
    redirect_page(path)

# Preserve unreviewed pages for visitors, but keep them out of search results.
def mark_noindex(source: str) -> str:
    matches = [
        match for match in META_TAG.finditer(source)
        if ROBOTS_NAME.search(match.group(0))
    ]
    for match in reversed(matches):
        tag = match.group(0)
        if CONTENT_ATTR.search(tag):
            updated_tag = CONTENT_ATTR.sub(
                lambda attr: attr.group(1) + attr.group(2) + ROBOTS + attr.group(2),
                tag,
                count=1,
            )
        else:
            updated_tag = tag[:-1].rstrip() + ' content="' + ROBOTS + '">'
        source = source[:match.start()] + updated_tag + source[match.end():]
    if matches:
        return source

    head = re.search(r"<head\b[^>]*>", source, re.IGNORECASE)
    if not head:
        raise ValueError("HTML page has no <head> element")
    tag = '\n  <meta name="robots" content="' + ROBOTS + '">'
    return source[:head.end()] + tag + source[head.end():]

def canonical_href(source: str) -> str:
    for tag in re.findall(r"<link\b[^>]*>", source, re.IGNORECASE):
        rel = re.search(r"\brel\s*=\s*([\"\'])canonical\1", tag, re.IGNORECASE)
        href = re.search(r"\bhref\s*=\s*([\"\'])(.*?)\1", tag, re.IGNORECASE)
        if rel and href:
            return href.group(2)
    return ""

article_routes = {
    "https://zahradasnapadom.sk/blog/" + page.parent.name + "/"
    for page in all_blog_pages
    if page.parent.name not in curated_slugs
}
blog_page_set = set(all_blog_pages)
unreviewed_alias_pages = []
for path in ROOT.rglob("*.html"):
    relative = path.relative_to(ROOT).as_posix()
    if relative.startswith(("admin/", "cs/", "pl/", "work/")) or path in blog_page_set:
        continue
    source = path.read_text(encoding="utf-8")
    if canonical_href(source) in article_routes:
        unreviewed_alias_pages.append(path)

for path in (*unreviewed_blog_pages, *unreviewed_alias_pages):
    source = path.read_text(encoding="utf-8")
    path.write_text(mark_noindex(source), encoding="utf-8")

# Remove links to redirected translations and reviewed low-value articles.
# On the blog archive, remove complete cards so they are not left as empty text.
def normalized_href(href: str) -> str:
    href = href.strip().split("#", 1)[0].split("?", 1)[0]
    href = re.sub(r"^https?://[^/]+", "", href, flags=re.IGNORECASE)
    return "/" + href.lstrip("./").lstrip("/")

hidden_route_keys = {route.rstrip("/") for route in hidden_routes}
anchor_pattern = re.compile(r"""<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>[\s\S]*?</a\s*>""", re.IGNORECASE)
article_pattern = re.compile(r"<article\b[\s\S]*?</article\s*>", re.IGNORECASE)

for page in ROOT.rglob("*.html"):
    relative = page.relative_to(ROOT).as_posix()
    if relative.startswith(("admin/", "cs/", "pl/", "work/")) or page in pages_to_hide:
        continue
    source = page.read_text(encoding="utf-8")
    if relative == "blog.html":
        def keep_card(match):
            routes = [normalized_href(href) for _, href in re.findall(r"""<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1""", match.group(0), re.IGNORECASE)]
            if any(route.rstrip("/") in hidden_route_keys for route in routes):
                return ""
            return match.group(0)
        source = article_pattern.sub(keep_card, source)
    source = anchor_pattern.sub(
        lambda match: "" if normalized_href(match.group(2)).rstrip("/") in hidden_route_keys else match.group(0),
        source,
    )
    page.write_text(source, encoding="utf-8")

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
    f"{len(low_value_pages)} redirected low-value Slovak pages and "
    f"{len(unreviewed_blog_pages)} unreviewed Slovak pages and "
    f"{len(unreviewed_alias_pages)} legacy aliases marked noindex; "
    f"removed {removed_sitemap_entries} matching sitemap entries."
)
