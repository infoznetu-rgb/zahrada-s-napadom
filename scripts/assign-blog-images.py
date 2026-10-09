from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
changed=0
for page in (root/"blog").glob("*/index.html"):
    slug=page.parent.name
    matches=list((root/"assets/blog").rglob(slug+".webp"))
    if len(matches)!=1: continue
    image="/"+matches[0].relative_to(root).as_posix()
    text=page.read_text(encoding="utf-8")
    updated=re.sub(r'(<figure class="post-hero"><img src=")[^"]+',lambda m:m.group(1)+image,text,count=1)
    updated=re.sub(r'(<meta property="og:image" content=")[^"]+',lambda m:m.group(1)+"https://zahradasnapadom.sk"+image,updated,count=1)
    if updated!=text:
        page.write_text(updated,encoding="utf-8")
        changed+=1
print("Updated",changed,"articles")
