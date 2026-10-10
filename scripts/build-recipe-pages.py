#!/usr/bin/env python3
"""Build crawlable recipe pages and add them to sitemap.xml from published CMS data."""

from __future__ import annotations

import html
import json
import re
import time
import unicodedata
from datetime import date
from pathlib import Path
from urllib.error import URLError
from urllib.parse import quote, urlencode, urlparse, unquote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SITE = "https://zahradasnapadom.sk"
JS = (ROOT / "recepty.js").read_text(encoding="utf-8")
URL_MATCH = re.search(r'RECIPE_URL="([^"]+)"', JS)
KEY_MATCH = re.search(r'RECIPE_KEY="([^"]+)"', JS)
if not URL_MATCH or not KEY_MATCH:
    raise SystemExit("Cannot read the public Supabase URL/key from recepty.js")
API = URL_MATCH.group(1).rstrip("/") + "/rest/v1/zahrada_posts"
API_KEY = KEY_MATCH.group(1)
RECIPE_IMAGE_MAP = json.loads((ROOT / "data" / "recipe-unique-image-map.json").read_text(encoding="utf-8"))
RECIPE_REDIRECTS = {
    "baklazan-a-paradajky-zapecene-zeleninove-jedlo": "/recepty.html",
    "brokolica-a-mrkva-zapecene-zeleninove-jedlo": "/recepty.html",
    "chia-a-maliny-tepla-ranajkova-kasa": "/recepty.html",
    "cuketa-a-paradajky-zapecene-zeleninove-jedlo": "/recepty.html",
    "fazulove-struky-a-zemiaky-zapecene-zeleninove-jedlo": "/recepty.html",
    "huby-a-petrzlen-zapecene-zeleninove-jedlo": "/recepty.html",
    "jogurt-a-ribezle-tepla-ranajkova-kasa": "/recepty.html",
    "karfiol-a-por-zapecene-zeleninove-jedlo": "/recepty.html",
    "karfiol-a-zemiaky-zapecene-zeleninove-jedlo": "/recepty.html",
    "kel-a-zemiaky-zapecene-zeleninove-jedlo": "/recepty.html",
    "ovsene-vlocky-a-cucoriedky-tepla-ranajkova-kasa": "/recepty.html",
    "ovsene-vlocky-a-jablko-tepla-ranajkova-kasa": "/recepty.html",
    "ovsene-vlocky-a-tekvica-tepla-ranajkova-kasa": "/recepty.html",
    "pohanka-a-hruska-tepla-ranajkova-kasa": "/recepty.html",
    "por-a-zemiaky-zapecene-zeleninove-jedlo": "/recepty.html",
    "pseno-a-marhule-tepla-ranajkova-kasa": "/recepty.html",
    "ryzova-kasa-a-slivky-tepla-ranajkova-kasa": "/recepty.html",
    "tekvica-a-spenat-zapecene-zeleninove-jedlo": "/recepty.html",
    "tvaroh-a-broskyne-tepla-ranajkova-kasa": "/recepty.html",
    "baklazan-a-paradajky-pecena-zelenina-z-rury": "/recepty.html",
    "baklazan-a-sosovica-plnena-zelenina": "/recepty.html",
    "banan-a-ribezle-makke-domace-muffiny": "/recepty.html",
    "bataty-a-cervena-cibula-pecena-zelenina-z-rury": "/recepty.html",
    "bataty-a-rozmarin-domace-gnocchi": "/recepty.html",
    "bazalka-a-slnecnicove-semienka-vonave-domace-pesto": "/recepty.html",
    "biela-fazula-a-kel-domaca-zeleninova-polievka": "/recepty.html",
    "biela-fazula-a-paradajky-strukovinovy-hrniec": "/recepty.html",
    "bob-a-mrkva-strukovinovy-hrniec": "/recepty.html",
    "brokolica-a-cedar-slany-kolac-z-rury": "/recepty.html",
    "brokolica-a-citron-kremove-zeleninove-rizoto": "/recepty.html",
    "brokolica-a-parmezan-domace-gnocchi": "/recepty.html",
    "brokolica-a-syr-chrumkave-zeleninove-placky": "/recepty.html",
    "brokolica-a-zemiaky-domaca-zeleninova-polievka": "/recepty.html",
    "broskyne-a-cili-sladkokysle-domace-catni": "/recepty.html",
    "broskyne-a-ovsena-mrvenicka-jednoduchy-domaci-kolac": "/recepty.html",
    "broskyne-a-vanilka-teply-ovocny-dezert": "/recepty.html",
    "bulgur-a-paradajky-syty-obilninovy-salat": "/recepty.html",
    "ceresne-a-mandle-teply-ovocny-dezert": "/recepty.html",
    "ceresne-a-tvaroh-jednoduchy-domaci-kolac": "/recepty.html",
    "cervena-kapusta-a-jablko-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "cervena-sosovica-a-tekvica-strukovinovy-hrniec": "/recepty.html",
    "cibula-a-pohanka-plnena-zelenina": "/recepty.html",
    "cibulky-a-bobkovy-list-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "cicer-a-cuketa-strukovinovy-hrniec": "/recepty.html",
    "cicer-a-paprika-syty-obilninovy-salat": "/recepty.html",
    "cicer-a-spenat-strukovinovy-hrniec": "/recepty.html",
    "cucoriedky-a-citron-jednoduchy-domaci-kolac": "/recepty.html",
    "cucoriedky-a-jogurt-makke-domace-muffiny": "/recepty.html",
    "cuketa-a-bulgur-plnena-zelenina": "/recepty.html",
    "cuketa-a-cili-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "cuketa-a-citron-makke-domace-muffiny": "/recepty.html",
    "cuketa-a-feta-sviezi-salat-zo-zahrady": "/recepty.html",
    "cuketa-a-mata-kremove-zeleninove-rizoto": "/recepty.html",
    "cuketa-a-mrkva-chrumkave-zeleninove-placky": "/recepty.html",
    "cuketa-a-paprika-pecena-zelenina-z-rury": "/recepty.html",
    "cuketa-a-paradajky-slany-kolac-z-rury": "/recepty.html",
    "cuketa-a-quinoa-plnena-zelenina": "/recepty.html",
    "cvikla-a-chren-sladkokysle-domace-catni": "/recepty.html",
    "cvikla-a-kozi-syr-domace-gnocchi": "/recepty.html",
    "cvikla-a-kozi-syr-kremove-zeleninove-rizoto": "/recepty.html",
    "cvikla-a-ovsene-vlocky-chrumkave-zeleninove-placky": "/recepty.html",
    "cvikla-a-pomaranc-sviezi-salat-zo-zahrady": "/recepty.html",
    "cvikla-a-rasca-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "cvikla-a-zemiaky-domaca-zeleninova-polievka": "/recepty.html",
    "cvikla-a-zemiaky-pecena-zelenina-z-rury": "/recepty.html",
    "dule-a-med-teply-ovocny-dezert": "/recepty.html",
    "fazula-a-cibula-sviezi-salat-zo-zahrady": "/recepty.html",
    "fazula-a-kel-strukovinovy-hrniec": "/recepty.html",
    "fazula-a-kukurica-syty-obilninovy-salat": "/recepty.html",
    "fazulove-struky-a-kopor-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "fenikel-a-jablko-sviezi-salat-zo-zahrady": "/recepty.html",
    "fenikel-a-zemiaky-pecena-zelenina-z-rury": "/recepty.html",
    "hneda-sosovica-a-zeler-strukovinovy-hrniec": "/recepty.html",
    "hrach-a-por-strukovinovy-hrniec": "/recepty.html",
    "hrasok-a-mata-chrumkave-zeleninove-placky": "/recepty.html",
    "hrasok-a-mata-domace-gnocchi": "/recepty.html",
    "hrasok-a-mata-slany-kolac-z-rury": "/recepty.html",
    "hrasok-a-petrzlen-kremove-zeleninove-rizoto": "/recepty.html",
    "hrasok-a-zemiaky-strukovinovy-hrniec": "/recepty.html",
    "hrusky-a-kakao-jednoduchy-domaci-kolac": "/recepty.html",
    "hrusky-a-med-teply-ovocny-dezert": "/recepty.html",
    "hrusky-a-vlasske-orechy-makke-domace-muffiny": "/recepty.html",
    "hrusky-a-zazvor-sladkokysle-domace-catni": "/recepty.html",
    "huby-a-pazitka-slany-kolac-z-rury": "/recepty.html",
    "huby-a-tymian-kremove-zeleninove-rizoto": "/recepty.html",
    "jablka-a-cibula-sladkokysle-domace-catni": "/recepty.html",
    "jablka-a-orechy-teply-ovocny-dezert": "/recepty.html",
    "jablka-a-ovsene-vlocky-makke-domace-muffiny": "/recepty.html",
    "jablka-a-skorica-jednoduchy-domaci-kolac": "/recepty.html",
    "jacmenne-krupy-a-huby-syty-obilninovy-salat": "/recepty.html",
    "jahody-a-rebarbora-teply-ovocny-dezert": "/recepty.html",
    "kapusta-a-rasca-chrumkave-zeleninove-placky": "/recepty.html",
    "kapusta-a-redkovka-sviezi-salat-zo-zahrady": "/recepty.html",
    "karfiol-a-brokolica-pecena-zelenina-z-rury": "/recepty.html",
    "karfiol-a-horcicne-semienka-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "karfiol-a-kurkuma-kremove-zeleninove-rizoto": "/recepty.html",
    "karfiol-a-petrzlen-slany-kolac-z-rury": "/recepty.html",
    "karfiol-a-syr-chrumkave-zeleninove-placky": "/recepty.html",
    "kel-a-udeny-syr-slany-kolac-z-rury": "/recepty.html",
    "kopor-a-slnecnicove-semienka-vonave-domace-pesto": "/recepty.html",
    "koriander-a-arasidy-vonave-domace-pesto": "/recepty.html",
    "kukurica-a-cuketa-domaca-zeleninova-polievka": "/recepty.html",
    "kukurica-a-pazitka-chrumkave-zeleninove-placky": "/recepty.html",
    "kuskus-a-cuketa-syty-obilninovy-salat": "/recepty.html",
    "listovy-salat-a-redkovky-sviezi-salat-zo-zahrady": "/recepty.html",
    "maliny-a-biela-cokolada-makke-domace-muffiny": "/recepty.html",
    "marhule-a-cibula-sladkokysle-domace-catni": "/recepty.html",
    "marhule-a-mandle-jednoduchy-domaci-kolac": "/recepty.html",
    "marhule-a-tymian-teply-ovocny-dezert": "/recepty.html",
    "medvedi-cesnak-a-lieskove-orechy-vonave-domace-pesto": "/recepty.html",
    "mrkva-a-jablko-makke-domace-muffiny": "/recepty.html",
    "mrkva-a-jablko-sviezi-salat-zo-zahrady": "/recepty.html",
    "mrkva-a-pastrnak-pecena-zelenina-z-rury": "/recepty.html",
    "mrkva-a-tymian-domace-gnocchi": "/recepty.html",
    "mrkva-a-zazvor-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "mrkva-a-zemiaky-domaca-zeleninova-polievka": "/recepty.html",
    "mrkvova-vnat-a-kesu-vonave-domace-pesto": "/recepty.html",
    "nektarinky-a-rozmarin-teply-ovocny-dezert": "/recepty.html",
    "paprika-a-cesnak-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "paprika-a-fazula-plnena-zelenina": "/recepty.html",
    "paprika-a-olivy-slany-kolac-z-rury": "/recepty.html",
    "paprika-a-proso-plnena-zelenina": "/recepty.html",
    "paprika-a-ryza-plnena-zelenina": "/recepty.html",
    "paradajky-a-baklazan-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-bazalka-domaca-zeleninova-polievka": "/recepty.html",
    "paradajky-a-bazalka-kremove-zeleninove-rizoto": "/recepty.html",
    "paradajky-a-cili-sladkokysle-domace-catni": "/recepty.html",
    "paradajky-a-cuketa-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-fazula-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-hriby-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-karfiol-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-kuskus-plnena-zelenina": "/recepty.html",
    "paradajky-a-mrkva-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-olivy-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-paprika-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-ryza-plnena-zelenina": "/recepty.html",
    "paradajky-a-spenat-domaca-omacka-na-cestoviny": "/recepty.html",
    "paradajky-a-tekvica-domaca-omacka-na-cestoviny": "/recepty.html",
    "pastrnak-a-muskatovy-oriesok-domace-gnocchi": "/recepty.html",
    "patizon-a-zemiaky-plnena-zelenina": "/recepty.html",
    "pazitka-a-tekvicove-semienka-vonave-domace-pesto": "/recepty.html",
    "petrzlen-a-mandle-vonave-domace-pesto": "/recepty.html",
    "pohanka-a-cvikla-syty-obilninovy-salat": "/recepty.html",
    "por-a-karfiol-domaca-zeleninova-polievka": "/recepty.html",
    "por-a-spenat-kremove-zeleninove-rizoto": "/recepty.html",
    "por-a-syr-slany-kolac-z-rury": "/recepty.html",
    "pseno-a-tekvica-syty-obilninovy-salat": "/recepty.html",
    "quinoa-a-uhorka-syty-obilninovy-salat": "/recepty.html",
    "rebarbora-a-jablko-sladkokysle-domace-catni": "/recepty.html",
    "rebarbora-a-jahody-jednoduchy-domaci-kolac": "/recepty.html",
    "repa-a-cokolada-makke-domace-muffiny": "/recepty.html",
    "ribezle-a-cibula-sladkokysle-domace-catni": "/recepty.html",
    "ribezle-a-jablko-teply-ovocny-dezert": "/recepty.html",
    "ribezle-a-vanilka-jednoduchy-domaci-kolac": "/recepty.html",
    "rukola-a-parmezan-vonave-domace-pesto": "/recepty.html",
    "ruzickovy-kel-a-jablko-pecena-zelenina-z-rury": "/recepty.html",
    "ryza-a-hrasok-syty-obilninovy-salat": "/recepty.html",
    "slivky-a-cervena-cibula-sladkokysle-domace-catni": "/recepty.html",
    "slivky-a-kakao-makke-domace-muffiny": "/recepty.html",
    "slivky-a-mak-jednoduchy-domaci-kolac": "/recepty.html",
    "slivky-a-skorica-teply-ovocny-dezert": "/recepty.html",
    "sosovica-a-cvikla-sviezi-salat-zo-zahrady": "/recepty.html",
    "sosovica-a-mrkva-strukovinovy-hrniec": "/recepty.html",
    "sosovica-a-mrkva-syty-obilninovy-salat": "/recepty.html",
    "spargla-a-citron-kremove-zeleninove-rizoto": "/recepty.html",
    "spenat-a-feta-chrumkave-zeleninove-placky": "/recepty.html",
    "spenat-a-feta-slany-kolac-z-rury": "/recepty.html",
    "spenat-a-ricotta-domace-gnocchi": "/recepty.html",
    "spenat-a-vlasske-orechy-vonave-domace-pesto": "/recepty.html",
    "spenat-a-zemiaky-domaca-zeleninova-polievka": "/recepty.html",
    "tekvica-a-cibula-pecena-zelenina-z-rury": "/recepty.html",
    "tekvica-a-jablko-sladkokysle-domace-catni": "/recepty.html",
    "tekvica-a-kozi-syr-slany-kolac-z-rury": "/recepty.html",
    "tekvica-a-rasca-chrumkave-zeleninove-placky": "/recepty.html",
    "tekvica-a-salvia-domace-gnocchi": "/recepty.html",
    "tekvica-a-salvia-kremove-zeleninove-rizoto": "/recepty.html",
    "tekvica-a-skorica-makke-domace-muffiny": "/recepty.html",
    "tekvica-a-vlasske-orechy-jednoduchy-domaci-kolac": "/recepty.html",
    "uhorka-a-paradajky-sviezi-salat-zo-zahrady": "/recepty.html",
    "uhorky-a-kopor-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "zelene-paradajky-a-cibula-zelenina-v-sladkokyslom-naleve": "/recepty.html",
    "zeleny-hrasok-a-mata-domaca-zeleninova-polievka": "/recepty.html",
    "zeler-a-jablko-domaca-zeleninova-polievka": "/recepty.html",
    "zeler-a-mrkva-pecena-zelenina-z-rury": "/recepty.html",
    "zemiaky-a-cesnak-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-cibula-chrumkave-zeleninove-placky": "/recepty.html",
    "zemiaky-a-huby-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-kel-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-kopor-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-medvedi-cesnak-domace-gnocchi": "/recepty.html",
    "zemiaky-a-paprika-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-pazitka-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-pazitka-sviezi-salat-zo-zahrady": "/recepty.html",
    "zemiaky-a-petrzlen-domace-gnocchi": "/recepty.html",
    "zemiaky-a-por-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-rozmarin-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-spenat-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zemiaky-a-tekvica-rychle-jedlo-zo-zemiakov": "/recepty.html",
    "zihlava-a-vlasske-orechy-vonave-domace-pesto": "/recepty.html",
}
RECIPE_ILLUSTRATIONS = json.loads((ROOT / "data" / "recipe-illustration-fallback-map.json").read_text(encoding="utf-8"))
DUPLICATED_ORIGINAL_COVERS: set[str] = set()


def localize_recipe_image(url: str) -> str:
    """Use the repository copy of a GitHub-hosted recipe image when available."""
    parsed = urlparse(url)
    if parsed.netloc.lower() != "raw.githubusercontent.com":
        return url
    prefix = "/infoznetu-rgb/zahrada-s-napadom/main/"
    if not parsed.path.startswith(prefix):
        return url
    relative = unquote(parsed.path[len(prefix):])
    if not relative.startswith("images/recepty/") or ".." in Path(relative).parts:
        return url
    return SITE + "/" + relative if (ROOT / relative).is_file() else url


def recipe_cover(post: dict) -> str:
    slug = str(post.get("slug") or "").strip()
    matched = RECIPE_IMAGE_MAP.get(slug)
    if matched and (ROOT / matched.lstrip("/")).is_file():
        return SITE + matched
    original = str(post.get("cover_url") or "").strip()
    fallback = RECIPE_ILLUSTRATIONS.get(slug)
    if fallback and (not original or original.split("?")[0] in DUPLICATED_ORIGINAL_COVERS) and (ROOT / fallback.lstrip("/")).is_file():
        return SITE + fallback
    return localize_recipe_image(original)



def fetch_recipes() -> list[dict]:
    fields = "slug,title,excerpt,content,cover_url,published_at,updated_at,tags,generated_by_ai"
    query = urlencode({
        "select": fields,
        "status": "eq.published",
        "content_type": "eq.blog",
        "category": "eq.Recepty zo záhrady",
        "order": "published_at.desc,slug.asc",
        "limit": "1000",
    })
    request = Request(
        f"{API}?{query}",
        headers={"apikey": API_KEY, "Authorization": f"Bearer {API_KEY}", "Cache-Control": "no-cache"},
    )
    for attempt in range(3):
        try:
            with urlopen(request, timeout=45) as response:
                rows = json.loads(response.read().decode("utf-8"))
            if not isinstance(rows, list):
                raise ValueError("Supabase returned an unexpected recipe response")
            return rows
        except (URLError, TimeoutError, ValueError) as error:
            if attempt == 2:
                raise RuntimeError(f"Could not load published recipes: {error}") from error
            time.sleep(2 ** attempt)
    return []


LABELS = {
    "portions": re.compile(r"^PORCIE\s*:\s*(.*)$", re.I),
    "prep": re.compile(r"^PRÍPRAVA\s*:\s*(.*)$", re.I),
    "cook": re.compile(r"^VARENIE\s*:\s*(.*)$", re.I),
    "ingredients": re.compile(r"^SUROVINY\s*:\s*(.*)$", re.I),
    "steps": re.compile(r"^POSTUP\s*:\s*(.*)$", re.I),
    "tips": re.compile(r"^TIP\s*:\s*(.*)$", re.I),
}


def parse_recipe(content: str) -> dict:
    lines = str(content or "").replace("\\n", "\n").splitlines()
    sections: dict[str, list[str]] = {key: [] for key in LABELS}
    intro: list[str] = []
    current: str | None = None
    for line in lines:
        match_key = None
        value = ""
        for key, pattern in LABELS.items():
            match = pattern.match(line.strip())
            if match:
                match_key, value = key, match.group(1).strip()
                break
        if match_key:
            current = match_key
            if value:
                sections[current].append(value)
        elif current:
            value = line.strip()
            if value:
                sections[current].append(value)
        elif line.strip():
            intro.append(line.strip())

    def clean(key: str) -> list[str]:
        output = []
        for item in sections[key]:
            item = re.sub(r"^\s*[-•]\s*", "", item)
            item = re.sub(r"^\s*\d+[.)]\s*", "", item)
            item = item.strip()
            if item and item.upper() not in {"SUROVINY", "POSTUP"}:
                output.append(item)
        return output

    facts = {}
    for key in ("portions", "prep", "cook"):
        vals = clean(key)
        facts[key] = " ".join(vals)
    return {
        "intro": " ".join(intro),
        "portions": facts["portions"],
        "prep": facts["prep"],
        "cook": facts["cook"],
        "ingredients": clean("ingredients"),
        "steps": clean("steps"),
        "tips": clean("tips"),
    }


def esc(value: object) -> str:
    return html.escape(str(value or ""), quote=True)


def iso_date(value: object) -> str:
    if not value:
        return ""
    found = re.match(r"^(\d{4}-\d{2}-\d{2})", str(value))
    return found.group(1) if found else ""


def duration(value: str) -> str | None:
    match = re.search(r"\d+", value or "")
    return f"PT{match.group(0)}M" if match else None


def build_schema(post: dict, recipe: dict, canonical: str) -> dict:
    schema = {
        "@context": "https://schema.org",
        "@type": "Recipe",
        "name": post["title"],
        "description": post.get("excerpt") or recipe["intro"],
        "url": canonical,
        "inLanguage": "sk-SK",
        "recipeIngredient": recipe["ingredients"],
        "recipeInstructions": [
            {"@type": "HowToStep", "position": n, "text": text}
            for n, text in enumerate(recipe["steps"], 1)
        ],
    }
    cover = recipe_cover(post)
    if cover and str(cover).startswith(("https://", "http://")):
        schema["image"] = [cover]
    if recipe["portions"]:
        schema["recipeYield"] = recipe["portions"]
    prep, cook = duration(recipe["prep"]), duration(recipe["cook"])
    if prep:
        schema["prepTime"] = prep
    if cook:
        schema["cookTime"] = cook
    if prep and cook:
        total = int(prep[2:-1]) + int(cook[2:-1])
        schema["totalTime"] = f"PT{total}M"
    published = iso_date(post.get("published_at"))
    if published:
        schema["datePublished"] = published
    return schema


def render_page(post: dict) -> tuple[str, str]:
    slug = str(post.get("slug") or "").strip()
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_-]{0,150}", slug):
        raise ValueError(f"Unsafe or missing recipe slug: {slug!r}")
    title = str(post.get("title") or "").strip()
    if not title:
        raise ValueError(f"Recipe {slug} has no title")
    excerpt = str(post.get("excerpt") or "").strip()
    content = parse_recipe(str(post.get("content") or ""))
    canonical = f"{SITE}/recepty/{quote(slug)}/"
    cover = recipe_cover(post)
    if cover and not cover.startswith(("https://", "http://", "/")):
        cover = ""
    schema = json.dumps(build_schema(post, content, canonical), ensure_ascii=False).replace("</", "<\\/")
    breadcrumb_schema = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Domov", "item": SITE + "/"},
            {"@type": "ListItem", "position": 2, "name": "Recepty zo záhrady", "item": SITE + "/recepty.html"},
            {"@type": "ListItem", "position": 3, "name": title, "item": canonical},
        ],
    }, ensure_ascii=False).replace("</", "<\\/")
    facts = [("Porcie", content["portions"]), ("Príprava", content["prep"]), ("Varenie", content["cook"])]
    facts_html = "".join(f'<span><b>{esc(label)}:</b> {esc(value)}</span>' for label, value in facts if value)
    ingredients = "".join(f'<li><label><input type="checkbox"><span>{esc(item)}</span></label></li>' for item in content["ingredients"])
    steps = "".join(f"<li>{esc(item)}</li>" for item in content["steps"])
    tips = "".join(f'<p class="recipe-tip"><b>Tip:</b> {esc(item)}</p>' for item in content["tips"])
    fallback = RECIPE_ILLUSTRATIONS.get(slug, "")
    fallback_attr = (f' onerror="this.onerror=null;this.src=\'{esc(fallback)}\'"' if fallback and (ROOT / fallback.lstrip("/")).is_file() and not cover.endswith(fallback) else "")
    image_html = (
        f'<figure class="recipe-detail-image"><img src="{esc(cover)}"{fallback_attr} alt="{esc(title)}" loading="eager" fetchpriority="high"><figcaption>{esc(title)}</figcaption></figure>'
        if cover else ""
    )
    related = related_recipes(post, content, ALL_POSTS)
    recipe_disclosure = (
        "Text návrhu receptu vznikol s pomocou AI a autor ho zatiaľ osobne nevyskúšal."
        if post.get("generated_by_ai")
        else "Autor tento recept zatiaľ osobne nevyskúšal."
    )
    transparency_html = (
        f'<aside class="recipe-disclaimer" role="note"><strong>Transparentne</strong>'
        f'{esc(recipe_disclosure)} Hlavný obrázok je ilustračný vizuál vytvorený pomocou AI '
        f'a nemusí presne zodpovedať skutočnému výsledku.</aside>'
    )
    related_html = "".join(
        f'<li><a href="/recepty/{quote(str(item["slug"]))}/">{esc(item["title"])}</a></li>'
        for item in related
    )
    body = f'''<!doctype html>
<html lang="sk">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <title>{esc(title)} | Recept zo záhrady | Záhrada s nápadom</title>
  <meta name="description" content="{esc(excerpt or title)}">
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">
  <link rel="canonical" href="{esc(canonical)}">
  <meta property="og:type" content="article"><meta property="og:locale" content="sk_SK">
  <meta property="og:site_name" content="Záhrada s nápadom"><meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(excerpt or title)}"><meta property="og:url" content="{esc(canonical)}">
  {f'<meta property="og:image" content="{esc(cover if cover.startswith(("https://", "http://")) else SITE + cover)}">' if cover else ''}
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{schema}</script><script type="application/ld+json">{breadcrumb_schema}</script>
  <link rel="icon" type="image/svg+xml" href="/brand-mark.svg?v=1">
  <link rel="stylesheet" href="/zahrada.css?v=10"><link rel="stylesheet" href="/studio-2026.css?v=1">
  <link rel="stylesheet" href="/spring-2026.css?v=3"><link rel="stylesheet" href="/typography-2026.css?v=13">
  <link rel="stylesheet" href="/app.css?v=8"><link rel="stylesheet" href="/recepty.css?v=2">
  <style>.recipe-detail{{max-width:900px;margin:0 auto;padding:24px 20px 64px}}.recipe-detail .back-link{{display:inline-block;margin:8px 0 28px}}.recipe-detail h1{{font-size:clamp(2rem,5vw,3.4rem);line-height:1.12;margin:.35rem 0 1rem}}.recipe-detail .recipe-lead{{font-size:1.13rem;line-height:1.75;max-width:780px}}.recipe-detail-image{{margin:28px 0}}.recipe-detail-image img{{display:block;width:100%;max-height:600px;object-fit:cover;border-radius:22px}}.recipe-detail-image figcaption{{margin-top:8px;color:#687267;font-size:.9rem}}.recipe-facts{{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0}}.recipe-facts span{{padding:9px 13px;background:#f0f5eb;border-radius:999px}}.recipe-detail h2{{margin:2rem 0 .8rem}}.recipe-detail li{{margin:.55rem 0;line-height:1.65}}.recipe-ingredients{{list-style:none;padding-left:0}}.recipe-ingredients label{{display:flex;gap:10px;align-items:flex-start;cursor:pointer}}.recipe-ingredients input{{margin-top:.35rem;accent-color:#527b45}}.recipe-tip{{padding:16px 18px;border-left:4px solid #6f955e;background:#f5f8f1}}.recipe-disclaimer{{margin:18px 0;padding:14px 17px;border:1px solid #d4dfcf;border-left:4px solid #6f955e;border-radius:12px;background:#f5f8f1;line-height:1.65}}.recipe-disclaimer strong{{display:block;margin-bottom:4px}}.recipe-actions{{margin:22px 0}}.recipe-actions button{{border:0;border-radius:999px;padding:12px 18px;background:#315b3b;color:white;font:inherit;font-weight:700;cursor:pointer}}@media print{{.site-header,.footer,.back-link,.recipe-actions,.recipe-related{{display:none!important}}.recipe-detail{{max-width:none;padding:0}}.recipe-detail-image img{{max-height:320px}}}}</style>
</head>
<body class="article-page recipe-detail-page"><a class="skip" href="#obsah">Preskočiť na obsah</a>
  <header class="site-header"><div class="top container"><a class="brand" href="/"><img class="brand-mark" src="/brand-mark.svg?v=1" alt="" aria-hidden="true"><span class="brand-text"><strong>Záhrada</strong><small>s nápadom</small></span></a><nav class="desktop-nav" aria-label="Hlavná navigácia"><a href="/">Domov</a><a href="/blog.html">Blog</a><a href="/recepty.html" aria-current="page">Recepty</a><a href="/pomocky.html">Pomôcky</a></nav><button class="menu" type="button" aria-expanded="false" aria-controls="mobile-nav"><span>Menu</span><span aria-hidden="true">☰</span></button></div><nav id="mobile-nav" class="mobile-nav container" aria-label="Mobilná navigácia"><a href="/">Domov</a><a href="/blog.html">Blog</a><a href="/recepty.html">Recepty</a><a href="/pomocky.html">Pomôcky</a></nav></header>
  <main id="obsah"><article class="recipe-detail"><a class="back-link" href="/recepty.html">← Späť na recepty</a><span class="kicker">RECEPT ZO ZÁHRADY</span><h1>{esc(title)}</h1><p class="recipe-lead">{esc(excerpt or content["intro"])}</p>{transparency_html}{image_html}<div class="recipe-facts">{facts_html}</div>{f'<p>{esc(content["intro"])}</p>' if content["intro"] and excerpt else ''}<section><h2>Suroviny</h2><ul class="recipe-ingredients">{ingredients}</ul></section><section><h2>Postup</h2><ol>{steps}</ol></section>{tips}<div class="recipe-actions"><button type="button" onclick="window.print()">Vytlačiť recept</button></div>{f'<section class="recipe-related"><h2>Podobné recepty</h2><ul>{related_html}</ul></section>' if related_html else ''}<p><a href="/recepty.html">Pozri ďalšie recepty zo sezónnej úrody →</a></p></article></main>
  <footer class="footer container"><div class="footer-brand"><a class="brand small-brand" href="/"><span class="brand-text"><strong>Záhrada</strong><small>s nápadom</small></span></a><p>Záhrada, dielňa a nápady, ktoré vznikajú pre radosť.</p></div><div class="footer-links"><a href="/">Domov</a><a href="/blog.html">Blog</a><a href="/recepty.html">Recepty</a><a href="/#kontakt">Kontakt</a></div><small>© 2026 · Hobby projekt pre záhradu a dielňu</small></footer><script src="/app.js?v=19" defer></script>
</body></html>'''
    return slug, body


def update_sitemap(posts: list[dict]) -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\s*<url>\s*<loc>https://zahradasnapadom\.sk/recepty/[^<]+</loc>.*?</url>", "", text)
    blocks = []
    for post in posts:
        slug = str(post["slug"]).strip()
        loc = f"{SITE}/recepty/{quote(slug)}/"
        modified = iso_date(post.get("updated_at") or post.get("published_at")) or date.today().isoformat()
        blocks.append(f"  <url><loc>{html.escape(loc)}</loc><lastmod>{modified}</lastmod><changefreq>yearly</changefreq><priority>0.6</priority></url>")
    marker = "</urlset>"
    if marker not in text:
        raise ValueError("sitemap.xml has no closing urlset element")
    text = text.replace(marker, "\n" + "\n".join(blocks) + "\n" + marker)
    path.write_text(text, encoding="utf-8")


STOP_WORDS = set("a aj alebo ako bez do dva dve jeden jedna jednu je jemne jemná jemné k kusy kusov l lyžica lyžice lyžička lyžičky malé malý na nadol niekoľko nový nové o od olivový olej oleja korenie podľa pohár pol polievková prášok pre s so soľ soľou strúčik strúčiky teplá teplej toho trochu veľká veľké veľký vody voda vňať z za čerstvá čerstvé čerstvý čierne mleté mletá mletý chuti".split())


def ingredient_tokens(recipe: dict) -> set[str]:
    tokens: set[str] = set()
    for ingredient in recipe["ingredients"]:
        value = unicodedata.normalize("NFD", ingredient.lower())
        value = "".join(char for char in value if unicodedata.category(char) != "Mn")
        value = re.sub(r"\d+(?:[.,]\d+)?", " ", value)
        value = re.sub(r"\b(?:kg|g|ml|cl|dl|l|ks|bal|lyzic\w*|lyzick\w*|hrnce\w*|polievkov\w*|kavov\w*)\b", " ", value)
        tokens.update(word for word in re.split(r"[^a-z]+", value) if len(word) > 2 and word not in STOP_WORDS)
    return tokens


def related_recipes(current: dict, recipe: dict, posts: list[dict]) -> list[dict]:
    current_tokens = ingredient_tokens(recipe)
    current_tags = {str(tag).lower().strip() for tag in current.get("tags") or []}
    ranked = []
    for post in posts:
        if post.get("slug") == current.get("slug"):
            continue
        other_recipe = parse_recipe(str(post.get("content") or ""))
        common_ingredients = current_tokens & ingredient_tokens(other_recipe)
        other_tags = {str(tag).lower().strip() for tag in post.get("tags") or []}
        score = 4 * len(common_ingredients) + 2 * len(current_tags & other_tags)
        if score:
            ranked.append((score, len(common_ingredients), str(post.get("title") or ""), post))
    ranked.sort(key=lambda row: (-row[0], -row[1], row[2]))
    return [row[3] for row in ranked[:3]]


def main() -> None:
    global ALL_POSTS, DUPLICATED_ORIGINAL_COVERS
    posts = fetch_recipes()
    if not posts:
        raise SystemExit("No published recipes returned; refusing to replace recipe pages or sitemap")
    from collections import Counter
    original_counts = Counter(str(post.get("cover_url") or "").strip().split("?")[0] for post in posts if post.get("cover_url"))
    DUPLICATED_ORIGINAL_COVERS = {url for url, count in original_counts.items() if count > 1}
    generated = 0
    ALL_POSTS = posts
    from collections import Counter
    image_counts = Counter(recipe_cover(post).split("?")[0] for post in posts if recipe_cover(post))
    duplicates = {url: count for url, count in image_counts.items() if count > 1}
    exact_matches = sum(bool(RECIPE_IMAGE_MAP.get(str(post.get("slug") or "").strip())) for post in posts)
    illustration_matches = sum(recipe_cover(post).startswith(SITE + "/images/recepty/unikatne/") for post in posts)
    missing_covers = [str(post.get("slug") or "") for post in posts if not recipe_cover(post)]
    original_covers = sum(bool(recipe_cover(post)) and not recipe_cover(post).startswith((SITE + "/assets/recipes/", SITE + "/images/recepty/unikatne/")) for post in posts)
    local_missing = []
    local_used = {}
    external_covers = 0
    external_domains = {}
    external_examples = {}
    external_urls = []
    illustration_slugs = []
    photo_slugs = []
    for post in posts:
        cover = recipe_cover(post)
        if not cover:
            continue
        parsed = urlparse(cover)
        if parsed.path.lower().endswith(".svg"):
            illustration_slugs.append(str(post.get("slug") or ""))
        elif parsed.path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".avif")):
            photo_slugs.append(str(post.get("slug") or ""))
        if parsed.netloc and parsed.netloc not in {"zahradasnapadom.sk", "www.zahradasnapadom.sk"}:
            external_covers += 1
            external_urls.append((str(post.get("slug") or ""), cover))
            domain = parsed.netloc.lower()
            external_domains[domain] = external_domains.get(domain, 0) + 1
            external_examples.setdefault(domain, (str(post.get("slug") or ""), cover))
            continue
        local_path = unquote(parsed.path).lstrip("/")
        if not local_path or not (ROOT / local_path).is_file():
            local_missing.append((str(post.get("slug") or ""), cover))
        else:
            local_used[local_path] = local_used.get(local_path, 0) + 1
    print(f"Recipe visual quality audit: {len(photo_slugs)} raster photo/image covers; {len(illustration_slugs)} SVG illustrations; {len(posts)-len(photo_slugs)-len(illustration_slugs)} other/unknown formats")
    print("  FIRST ILLUSTRATION REPLACEMENT CANDIDATES: " + ", ".join(illustration_slugs[:20]))
    print(f"Recipe image file audit: {len(local_used)} local image files referenced; {external_covers} external URLs (not file-verified); {len(local_missing)} missing local files")
    for domain, count in sorted(external_domains.items(), key=lambda item: (-item[1], item[0])):
        example_slug, example_url = external_examples[domain]
        print(f"  EXTERNAL IMAGE HOST: {domain}: {count} recipes; example recipe: {example_slug}; example URL: {example_url}")
    # Check the few remaining remote images rather than assuming their URLs work.
    for slug, url in external_urls[:20]:
        try:
            request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; RecipeImageAudit/1.0)", "Range": "bytes=0-0"})
            with urlopen(request, timeout=12) as response:
                content_type = response.headers.get("Content-Type", "")
                status = response.status
                print(f"  REMOTE IMAGE CHECK: {slug}: HTTP {status}; content-type={content_type}")
                if not content_type.lower().startswith("image/"):
                    print(f"  REMOTE IMAGE WARNING: {slug}: non-image response at {url}")
        except Exception as exc:
            print(f"  REMOTE IMAGE FAILED: {slug}: {type(exc).__name__}: {exc}")
    for slug, cover in local_missing[:60]:
        print(f"  BROKEN LOCAL IMAGE: {slug}: {cover}")
    print(f"Recipe image audit: {len(posts)} published recipes; {exact_matches} matched WebP assets; {illustration_matches} unique illustrations; {original_covers} original covers; {len(missing_covers)} missing covers; {len(duplicates)} duplicated image URLs covering {sum(duplicates.values())} recipes")
    for slug in missing_covers[:40]:
        print(f"  MISSING COVER: {slug}")
    for url, count in sorted(duplicates.items(), key=lambda pair: (-pair[1], pair[0]))[:30]:
        print(f"  DUPLICATE x{count}: {url}")
    # Prevent publishing recipe pages with broken or unassigned images.
    if local_missing or missing_covers:
        raise SystemExit(f"Recipe image validation failed: {len(local_missing)} broken local files and {len(missing_covers)} missing covers. Fix these before publishing.")
    active_slugs = set()
    for post in posts:
        slug, page = render_page(post)
        active_slugs.add(slug)
        target = ROOT / "recepty" / slug / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page, encoding="utf-8")
        generated += 1
    recipe_root = ROOT / "recepty"
    for slug, destination in RECIPE_REDIRECTS.items():
        if slug in active_slugs:
            raise ValueError(f"Recipe redirect slug is still published: {slug}")
        target = recipe_root / slug / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            f'''<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="robots" content="noindex,follow"><meta http-equiv="refresh" content="0;url={destination}"><title>Recepty zo záhrady</title></head><body><p>Tento recept už nie je dostupný. <a href="{destination}">Pozri aktuálne recepty zo záhrady</a>.</p><script>window.location.replace("{destination}");</script></body></html>''',
            encoding="utf-8",
        )
        active_slugs.add(slug)

    for child in recipe_root.iterdir():
        if child.is_dir() and child.name not in active_slugs:
            generated_index = child / "index.html"
            if generated_index.is_file():
                generated_index.unlink()
                try:
                    child.rmdir()
                except OSError:
                    pass
    update_sitemap(posts)
    print(f"Generated {generated} public recipe pages and added them to sitemap.xml")


if __name__ == "__main__":
    main()
