#!/usr/bin/env python3
"""Keep Czech and Polish translated articles accessible but out of search results."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ROBOTS = "noindex,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
META_TAG = re.compile(r"<meta\\b[^>]*>", re.IGNORECASE)
ROBOTS_NAME = re.compile(r"""\\bname\\s*=\\s*(["'])robots\\1""", re.IGNORECASE)
CONTENT_ATTR = re.compile(r"""(\\bcontent\\s*=\\s*)(["'])(.*?)\\2""", re.IGNORECASE | re.DOTALL)

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
            r"</head\\s*>",
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
    blog = ROOT / locale / "blog"
    if blog.is_dir():
        pages.extend(sorted(blog.glob("*/index.html")))

if not pages:
    raise SystemExit("No Czech or Polish article pages found")

changed = sum(update_page(path) for path in pages)
print(f"Checked {len(pages)} Czech/Polish article pages; updated {changed}.")
