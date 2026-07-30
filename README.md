# Marveen Codex Bridge 0.3.0 – Phase 7.11

Önálló Federation Bridge valódi Codex App Server runtime-mal, a Marveen
forráskódjának módosítása nélkül.

> **Fejlesztési állapot:** a 0.3.0 Phase 7.11 kiadás előzetes, kontrollált
> telepítésre és validációra készült. Éles átállás előtt kötelező a dokumentált
> preflight, mentés és rollback-útvonal ellenőrzése.

A Phase 7.11 a Marveen 1.25.1-re épített migrációs checkpointot, a Phase 0
mentést és a Phase 6.3 önálló Bridge-et egy tranzakciós éles átállásban köti
össze. A Marveen forrását nem patch-eli: a kapcsolat kizárólag a publikus
Federation API-n történik.

## A Phase 7 újdonságai

- alapértelmezetten read-only cutover preflight, külön `--execute` kapuval;
- Phase 0 mentés, privát candidate bundle és SHA-256 kötelező ellenőrzése;
- a Phase 0 kanonikus `MANIFEST.json` fájljának és teljes `SHA256SUMS`
  leltárának fail-closed ellenőrzése;
- a Federation API nélküli, pontosan v1.21.1 legacy kiinduló állapot explicit
  felismerése; minden más bizonytalan route/verzió kombináció blokkolja az átállást;
- a teljes régi Marveen working tree privát, azonosított stash-checkpointja;
- a régi `node_modules` atomikus megőrzése rollbackhez;
- a régi `dist` atomikus megőrzése és a candidate tiszta buildje, így eltávolított
  modul nem maradhat vissza a kimenetben;
- az új service kizárólag az immutable release-könyvtárból indul; a `current`
  symlink csak release-pointer, nem runtime-modulútvonal;
- `ProtectHome=read-only` mellett kizárólag az ellenőrzött, nem symlink
  `CODEX_HOME` (alapból `~/.codex`) kap írási jogot az App Server
  hitelesített runtime-állapotához;
- a Codex stderr hitelesítőadat-mintái maszkolva, sorai korlátozva és a
  váratlan kilépés diagnosztikai tailjében megőrizve jelennek meg;
- a valódi systemd-sandbox és readiness próba még a Marveen working tree
  stash-elése vagy verzióváltása előtt lefut;
- az új immutable Bridge release production függőségei rögzített Node 22
  környezetben, atomikus stagingben települnek; a cutover nem hagyatkozik
  korábbi vagy kézzel javított `node_modules` könyvtárra;
- Marveen 1.25.1 tiszta Node 22 telepítés, typecheck, syntax check és build;
- párosítás kizárólag a publikus Federation API-n, letiltott állapotban;
- a Bridge nem feltételezi, hogy a Marveen Federation rendszerazonosítója
  `marveen`: a publikus API által közölt `systemId` értéket ellenőrzi, majd
  atomikusan ehhez köti a peer- és agentazonosítást még az aktiválás előtt;
- a friss és a korábban létrehozott, biztonságosan folytatott pairing eredménye
  egyaránt kötelezően továbbadja a Marveen rendszerazonosítóját;
- a peer-identitás módosítása után az új Bridge-et letiltott Federation mellett
  újraindítja és readiness-próbával ellenőrzi; hiba esetén az eredeti privát
  konfigurációt is visszaállítja;
- korábbi megszakított cutover peerje csak a privát állapot és token-ujjlenyomatok
  pontos egyezésekor folytatható;
- az éles Federation canary a föderált kimenő sor tényleges terminális
  `delivered` állapotát és pontosan egy külön marker-választ követel meg;
- a legacy Bridge rövid leállítása után, de bármilyen Marveen-módosítás előtt
  az új runtime valódi systemd-környezetben bizonyítja a readiness állapotát;
- `advisory` alapértelmezett routing, majd pontosan-egyszeri élő canary;
- hiba esetén először Federation-disable, majd az aktuális kísérletben létrehozott
  peer eltávolítása, az eredeti `dist`, `node_modules`, Marveen-forrás,
  dashboard és legacy Bridge ellenőrzött visszaállítása;
- a Phase 0 mentés és a legacy adapter karantén változatlanul megmarad.

A részletes sorrend és rollback-szerződés:
`docs/phase7-production-cutover.md`.

## Licenc

A projekt az [MIT License](LICENSE) feltételei szerint használható.

## Phase 7 előkészítés

```bash
./scripts/install-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --prepare-only
```

Ez még nem állít le és nem indít újra szolgáltatást.

## Phase 7 cutover preflight

```bash
./scripts/cutover-phase7.sh \
  --marveen-root "$HOME/marveen" \
  --phase0-root "$HOME/bela-codex-preflight/phase0-freeze-20260729-093309" \
  --candidate-commit 27ff7f8f18c1fc33e46dc53655977787203916c8 \
  --bundle "$HOME/bela-codex-preflight/marveen-v1.25.1-local-candidate-1.bundle" \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex"
```

Csak a `RESULT: PHASE 7 CUTOVER PREFLIGHT PASS (NO MUTATION)` eredmény után
szabad ugyanazt a parancsot `--execute` kapcsolóval futtatni.

## A Phase 6.1 újdonságai

- `prepare-only` az alapértelmezett: nincs service-indítás vagy Marveen-leállítás;
- külön `releases`, `candidate`, `current` és `previous` release pointer;
- aktiválási hiba esetén automatikus release-pointer rollback;
- a régi `bela-codex-bridge.service` aktív állapotában fail-closed;
- saját `127.0.0.1:3431/dashboard`, Marveentől teljesen függetlenül;
- admin token csak `sessionStorage`-ban, külső JavaScript/CSS nélkül;
- futás-, approval-, artifact-, inbox- és outbox-állapotok;
- dashboardról approve/decline;
- CSP, `frame-ancestors 'none'`, `DENY`, `nosniff`, loopback-only listener;
- Node 22-höz kötött npm futtatás, a Béla/Marveen Node 24 környezetétől függetlenül.

## A Phase 6.3 újdonságai

- kizárólag a 0.2.1-es legacy adapter 26 szerződésben rögzített útvonala
  kerül privát, visszaállítható git-karanténba;
- minden más staged, unstaged és untracked Marveen-változás érintetlen marad;
- a git által ignorált Marveen üzemi adatok változatlanul a helyükön maradnak;
- read-only karantén-preflight, külön `--execute` végrehajtási kapuval;
- kizárólag publikus Marveen Federation API-n végzett párosítás;
- loopback-only URL- és privát tokenfájl-kapuk;
- már létező peer vagy aktív Federation esetén fail-closed;
- részleges párosítási hiba esetén automatikus peer rollback;
- tokenmentes privát állapotfájl, kizárólag SHA-256 ujjlenyomatokkal;
- a párosítás végén a Federation és az új Bridge service továbbra is inaktív.

## A Phase 5.2 tartalma

- tartós, manuális command/file-change approval broker;
- admin API az approvalok listázására és eldöntésére;
- approve, decline, timeout és leállás közbeni fail-closed kezelés;
- process-újraindításon át monoton App Server generation;
- provider request identity kötése az aktív run/agent/thread/turn négyeshez;
- `marveen_agent_message_send` dinamikus Codex-eszköz;
- `marveen_image_artifact_register` dinamikus Codex-eszköz;
- kötelező `modelProvider/capabilities/read` GPT-image képességkapu;
- `gpt-image-2` használata ugyanazzal a ChatGPT-bejelentkezéssel;
- végleges workspace-PNG canonical path-, symlink-, méret-, CRC-, képméret- és
  SHA-256-ellenőrzése;
- ellenőrzött kép külön, `0400` módú, változtathatatlan Bridge-másolatban;
- tartós artifact-metaadat és Federation run-result receipt;
- hitelesített artifact-lista, metaadat- és bináris tartalom API;
- imagegen run nem lehet sikeres regisztrált végleges artifact nélkül;
- identitáskötött, idempotens Federation outbox;
- továbbra is működő threadfolytatás és runtime-idempotencia.

A Bridge nem patch-eli, nem importálja és nem indítja újra Marveent. A kapcsolat
csak a publikus Federation v1 HTTP-szerződésen keresztül történik.

## Biztonsági modell

Az agent `approvalPolicy` értéke:

- `never`: minden command/file-change approval automatikusan elutasított;
- `manual`: a kérés `pending` állapotba kerül, és admin döntésre vár.

Egy approval csak az azt létrehozó App Server generation és aktív
run/agent/thread/turn számára érvényes. Timeout, Bridge-leállás vagy App Server
kiesés esetén automatikusan `expired` és `decline` lesz.

A `marveen_agent_message_send` nem fogad `from` mezőt. A forrásidentitást a
Bridge állítja elő `codex/<agentId>` formában, a Federation peer és a célagent
pedig konfigurációs/validációs kapun megy át.

## Admin API

```text
GET  /v1/approvals
GET  /v1/approvals?state=approved|declined|expired
GET  /v1/approvals/:approvalId
POST /v1/approvals/:approvalId/decision
GET  /v1/artifacts
GET  /v1/artifacts?runId=:runId&agentId=:agentId
GET  /v1/artifacts/:artifactId
GET  /v1/artifacts/:artifactId/content
GET  /v1/runs
GET  /v1/dashboard/summary
```

Döntési törzs:

```json
{"decision":"approve"}
```

vagy:

```json
{"decision":"decline"}
```

Az admin végpontokhoz a külön admin bearer token szükséges. Az azonos döntés
ismétlése idempotens; az ellentétes második döntés `409`.

## WSL-verifikáció

```bash
cd ~/bela-codex-preflight

sha256sum -c \
  Marveen-Codex-Bridge-v0.3.0-Phase7.11.tar.gz.sha256

tar -xzf \
  Marveen-Codex-Bridge-v0.3.0-Phase7.11.tar.gz

cd marveen-codex-bridge-0.3.0-phase7.11

./scripts/verify-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --clean-marveen-root \
    "$HOME/bela-codex-preflight/marveen-upgrade-v1.25.1"
```

A verifier:

1. 117 mock, adatbázis-, dashboard-, telepítő-, párosítási, git-karantén-,
   artifact-biztonsági és integrációs tesztet futtat;
2. megismétli a Phase 4 valódi read-only handshake/thread-restart kaput;
3. egy privát, eldobható könyvtárban valódi approve és decline döntést tesztel;
4. valódi modellel meghívatja a `marveen_agent_message_send` eszközt;
5. ellenőrzi, hogy pontosan egy identitáskötött outbox rekord keletkezett;
6. valódi `gpt-image-2` képet generáltat egy eldobható workspace-be;
7. ellenőrzi az 1024×1024 PNG-t, a dinamikus regisztrációt, az immutable
   másolatot és az artifact API-n visszaolvasott SHA-256-ot.

Elvárt zárás:

```text
tests 117
pass 117
fail 0
skipped 0
RESULT: PHASE 4 REAL CODEX PREFLIGHT PASS
RESULT: PHASE 5 REAL APPROVAL AND MESSAGE TOOL PASS
RESULT: PHASE 5.2 REAL IMAGEGEN AND ARTIFACT PASS
RESULT: PHASE 6.1 REAL CODEX, APPROVAL, FEDERATION, IMAGEGEN AND DASHBOARD PASS
```

Csak csomagteszthez:

```bash
./scripts/verify-phase7.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --mock-only
```

## Biztonságos előkészítő telepítés

Ez még nem indít szolgáltatást:

```bash
./scripts/install-phase6.sh \
  --node-bin "$HOME/.nvm/versions/node/v22.23.1/bin/node" \
  --codex-bin "$HOME/.local/bin/codex" \
  --prepare-only
```

Eredmény:

- saját release és privát konfiguráció;
- `candidate` pointer;
- privát `marveen-pairing.env`;
- systemd user unit, de nem engedélyezve és nem elindítva;
- Marveen forrás és üzemi adat érintetlen.

## A Phase 6.3 biztonsági határa

A csomag külön dokumentálja és teszteli:

- a legacy adapter karanténjának read-only és végrehajtási módját;
- a tiszta Marveen frissítés utáni, még letiltott API-párosítást.

Részletek: [`docs/phase6.2-clean-pairing.md`](docs/phase6.2-clean-pairing.md).

## Amit a verifikáció önmagában nem hajt végre

- Marveen memóriaelérés: nincs hozzá Federation v1 publikus szerződés;
- üzemi cutover az explicit `cutover-phase7.sh --execute` nélkül;
- Federation bekapcsolása az explicit cutover nélkül;
- a régi Bridge végleges törlése.

Ezeket nem szabad Marveen belső adatbázisának vagy privát API-jának
megkerülésével hozzáadni, mert az újra szoros csatolást hozna létre.

Részletek:

- [`docs/phase5-approval-and-tools.md`](docs/phase5-approval-and-tools.md)
- [`docs/phase5.2-imagegen-and-artifacts.md`](docs/phase5.2-imagegen-and-artifacts.md)
- [`docs/phase6.1-install-dashboard.md`](docs/phase6.1-install-dashboard.md)
- [`docs/phase6.2-clean-pairing.md`](docs/phase6.2-clean-pairing.md)
