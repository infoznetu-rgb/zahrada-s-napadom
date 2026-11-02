# Záhrada s nápadom

Nekomerčný hobby projekt o záhrade, tvorení a nápadoch od ľudí pre ľudí.

## Audit verejného webu (2. 11. 2026)

Aktuálny katalóg obsahuje 387 kontrolovaných blogových článkov. Zostávajúcich 41 starších alebo zlúčených blogových adries presmeruje na existujúci obsah. Česká a poľská verzia, recepty a bazár zostávajú pozastavené podľa nastavenia nasadenia.

Postup v `.github/workflows/pages.yml` zostaví verejný web, zosúladí archív s HTML článkov a overí sitemapu, lokálne zdroje, titulné obrázky, alternatívne texty, rozmery a metadáta. Aktuálny výsledok je v `data/site-audit.json`; samostatný záznam kontroly externých zdrojov v `data/external-link-audit.json` výslovne rozlišuje úspešné a nejednoznačné požiadavky.

Tieto kontroly nie sú zárukou schválenia AdSense ani tvrdením o úplnom odbornom overení každej vety. Počet slov slúži iba ako interný signál na zachytenie prázdneho či nedokončeného návodu.
