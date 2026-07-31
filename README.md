# Marveen Codex Bridge Federation 0.3.0

Önálló, frissítésálló Federation Bridge a Marveen és a valódi OpenAI Codex CLI
között. A Bridge nem patch-eli és nem importálja a Marveen forrását: kizárólag
a publikus Federation v1 HTTP-szerződésen kommunikál vele.

## Kiadási állapot

A `0.3.0` az első stabil Federation Edition kiadás. A production cutover
Marveen 1.25.1-en, Node 22.23.1-en és Codex CLI 0.145.0-val sikeresen lefutott,
beleértve a Marveen → Codex → Marveen, pontosan-egyszeri élő canaryt.

Fő tulajdonságok:

- külön systemd user service és saját `127.0.0.1:3431/dashboard`;
- tartós inbox, outbox, futás-, approval- és artifact-állapot SQLite-ban;
- szigorú peer-identitás, bearer tokenek, loopback-only HTTP;
- `gpt-5.6-terra`, konfigurálható reasoning effort és verziózott
  fejlesztői szerepkör;
- manuális jóváhagyási broker külső vagy érzékeny műveletekhez;
- Codex képalkotás és ellenőrzött, megváltoztathatatlan artifact-másolatok;
- atomikus telepítés, immutable release-könyvtár, rollback pointerek;
- Marveen-forráscsatolás nélküli frissíthetőség.

## Követelmények

- Linux vagy WSL2, systemd user service támogatással;
- pontosan Node.js 22;
- Codex CLI 0.145.0, aktív ChatGPT bejelentkezéssel;
- Marveen Federation v1 (a validált production baseline: Marveen 1.25.1).

## Ellenőrzés

```bash
npm ci --no-audit --no-fund
export MARVEEN_CODEX_BRIDGE_BETTER_SQLITE3_PATH="$PWD/node_modules/better-sqlite3"
npm run check
npm test
```

A teljes WSL-verifikáció:

```bash
./scripts/verify-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --clean-marveen-root "$HOME/bela-codex-preflight/marveen-upgrade-v1.25.1"
```

## Önálló telepítés

Előkészítés szolgáltatásindítás nélkül:

```bash
./scripts/install-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --prepare-only
```

Aktiválás új telepítésnél:

```bash
./scripts/install-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --activate
```

Az installer új konfigurációnál létrehozza a privát tokeneket és beemeli a
[`config/programozo-developer-instructions.hu.md`](config/programozo-developer-instructions.hu.md)
szerepkört. Meglévő privát konfigurációt nem ír felül.

## Dashboard

Az admin felület: `http://127.0.0.1:3431/dashboard`

Az admin token a telepített gépen:

```bash
cat "$HOME/.config/marveen-codex-bridge/admin.token"
```

A dashboardon látható az agent modellje és reasoning effortja, valamint ezek a
legutóbbi futások mellett is megjelennek.

## Frissítés és rollback

A Bridge frissítése független a Marveen frissítésétől. Új Bridge-verziót előbb
`--prepare-only` módban kell telepíteni, ellenőrizni, majd aktiválni. A
`current`, `candidate` és `previous` pointerek biztosítják a visszaállást.

A Marveen frissítése előtt külön Federation contract teszt szükséges; a Bridge
nem indokolja a Marveen saját forrásának módosítását.

Részletes üzemeltetés:

- [Telepítés, frissítés, rollback és eltávolítás](docs/operations.md)
- [Production cutover szerződés](docs/phase7-production-cutover.md)
- [Biztonsági modell](docs/phase5-approval-and-tools.md)
- [Képalkotás és artifactok](docs/phase5.2-imagegen-and-artifacts.md)

## Licenc

[MIT License](LICENSE)
