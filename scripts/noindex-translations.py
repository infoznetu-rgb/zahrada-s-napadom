#!/usr/bin/env python3
"""Keep Czech, Polish, and reviewed low-value Slovak pages with heavily repeated text out of search results."""
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

def update_page(path: Path) -> bool:
    original = path.read_text(encoding="utf-8-sig")
    changed_tag = False

    def replace_tag(match):
        nonlocal changed_tag
        tag = match.group(0)
        if not ROBOTS_NAME.search(tag):
            return tag
        content = CONTENT_ATTR.search(tag)
        if content:
            replacement = content.group(1) + content.group(2) + ROBOTS + content.group(2)
            updated = CONTENT_ATTR.sub(replacement, tag, count=1)
        else:
            updated = tag[:-1] + ' content="' + ROBOTS + '">'
        changed_tag = updated != tag
        return updated

    updated = META_TAG.sub(replace_tag, original)
    if not ROBOTS_NAME.search(updated):
        updated = re.sub(
            r"</head\s*>",
            '<meta name="robots" content="' + ROBOTS + '"></head>',
            updated,
            count=1,
            flags=re.IGNORECASE,
        )
        changed_tag = updated != original
    if changed_tag:
        path.write_text(updated, encoding="utf-8")
    return changed_tag

pages = []
for locale in ("cs", "pl"):
    locale_root = ROOT / locale
    if locale_root.is_dir():
        pages.extend(sorted(locale_root.rglob("*.html")))

for slug in LOW_VALUE_SK_ARTICLES:
    article = ROOT / "blog" / slug / "index.html"
    if article.is_file():
        pages.append(article)

if not pages:
    raise SystemExit("No Czech, Polish, or reviewed low-value pages found")

changed = sum(update_page(path) for path in pages)
print(f"Checked {len(pages)} locale and reviewed low-value pages; updated {changed}.")
