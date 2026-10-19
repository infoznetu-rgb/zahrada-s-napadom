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
    replacement = '<link rel="stylesheet" href="/homepage-bundle.css?v=20261019">'
    html = html[:first.start()] + replacement + html[first.end():]
    html = pattern.sub("", html)
    print(f"Bundled {len(matches)} stylesheets")

# These assets render in known cards. Reserve dimensions to reduce layout shifts.
html = re.sub(r'(<img\s+class="community-photo"\b[^>]*?)(\s*/?>)',
              lambda m: m.group(1) + (' width="1200" height="900"' if 'width=' not in m.group(1) else '') + m.group(2), html)
html = html.replace('<img class="brand-mark" src="brand-mark.svg?v=1"', '<img class="brand-mark" width="46" height="46" src="brand-mark.svg?v=1"')
homepage.write_text(html, encoding="utf-8")
