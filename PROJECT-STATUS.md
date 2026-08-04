# Marveen Codex Bridge Federation – projektállapot és átadási dokumentum

**Utolsó frissítés:** 2026-08-04

**Aktuális stabil kiadás:** `0.3.2`

**Projektállapot:** lezárt; a 0.3.2 éles production kapuja PASS

**Elsődleges, bizonyított célplatform:** Linux / WSL2, systemd user service

**Projekt:** Marveen/Béla ↔ OpenAI Codex Federation Bridge

## 1. A dokumentum célja

Ez a fájl az új fejlesztési beszélgetések és másik fejlesztő AI-k kötelező
kiindulópontja. A célja, hogy a Bridge aktuális állapota, a már bizonyított
működés, a nyitott hibák, a meghozott döntések és a következő fejlesztési
sorrend ne csak egy hosszú chatelőzményben legyen meg.

Ez nem teljes felhasználói kézikönyv és nem helyettesíti a részletes technikai
dokumentációt. Az alábbi forrásokat ebben a sorrendben kell mérvadónak tekinteni:

1. a GitHub `main` ágának aktuális forráskódja;
2. ez a `PROJECT-STATUS.md` fájl;
3. `TEST-RESULTS.md` és a kiadáshoz tartozó tesztnaplók;
4. `README.md`, majd a `docs/` könyvtár részletes szerződései;
5. a chatelőzmény csak kiegészítő információ.

Ha a chat és a repository tartalma eltér, nem szabad találgatni. Először a
Git-állapotot, a konfigurációt és a tényleges teszteredményt kell ellenőrizni.

## 2. Repository és kiadási azonosítók

| Elem | Érték |
|---|---|
| GitHub repository | `styu01/Marveen-Codex-Bridge-Federation` |
| Stabil verzió | `0.3.2` |
| GitHub kiadási ág | `main` |
| GitHub tag | `v0.3.2` |
| Release archívum | `Marveen-Codex-Bridge-v0.3.2.tar.gz` |
| Release checksum | `Marveen-Codex-Bridge-v0.3.2.tar.gz.sha256` |

### Korábbi 0.3.1 helyi/GitHub eltérés

A fejlesztés végén a helyi release-branch és a GitHubon létrehozott release
commit azonos forrásfát, de eltérő commitazonosítót kapott:

- helyi release dokumentációs commit: `63281b5`;
- GitHub `main` és `v0.3.1`: `1ab8263`;
- mindkettő Git-fa SHA-ja: `46fa1534e5...`.

Ez nem forráseltérés. Viszont új fejlesztési ág létrehozásakor mindig az
aktuális `origin/main` ágból kell indulni, nem egy régi helyi `main` vagy
release-branch alapján.

Ajánlott ellenőrzés:

```bash
git fetch origin --tags
git status --short --branch
git rev-parse origin/main
git rev-parse origin/main^{tree}
git ls-remote origin refs/heads/main refs/tags/v0.3.2
```

Új fejlesztési ág csak tiszta munkafából és `origin/main` alapról készülhet.
Meglévő felhasználói módosítást nem szabad resetelni vagy felülírni.

### Repository-higiénia

A korábbi `agent/phase7.7-systemd-gate` → `main` draft PR #1
2026-08-02-án lezárásra került, merge nélkül. A PR a `0.3.0-phase7.7` és 113
tesztes történeti állapotot írta le, ezért nem volt érvényes 0.3.2 alap. A
megmaradt távoli branch történeti branch; új munka kizárólag az aktuális
`origin/main` commitból indulhat.

## 3. Vezetői összefoglaló

A `0.3.2` kiadás a vállalt Linux/WSL2 környezetben kész, telepített és valós
Marveen–Codex forgalommal ellenőrzött. Nem prototípus és nem csak mock teszten
működik.

A kiadásban:

- Béla/Marveen egy föderált `programozo` Codex-agentet ér el;
- a Bridge külön szolgáltatás, nem Marveen-fork és nem módosítja a Marveen
  forráskódját;
- a szerepkör és a reasoning effort a Bridge saját admin dashboardján
  módosítható és visszaállítható;
- a valódi Codex App Server, a thread-kezelés, a jóváhagyási folyamat, a
  pontosan-egyszeri Federation kézbesítés és a GPT-képgenerálás működik;
- a telepítés, aktiválás és rollback fail-closed védelemmel rendelkezik;
- a régi Bridge le van állítva, az új Federation Bridge volt aktív a kiadás
  lezárásakor;
- a `gpt-5.6-terra` és `gpt-5.6-sol` modellek közötti biztonságos váltás,
  readiness, backup, audit és tiltott modell fail-closed elutasítása élesben
  is bizonyított;
- a meglévő, HOME-on belüli agent-workspace megmarad, a systemd service pedig
  csak a konkrét konfigurált workspace-hez kap írási jogot.

A projekt ezzel a vállalt funkciókörrel lezárt. Az alábbi témák nem részei a
0.3.2-nek, és csak külön, új projektként indíthatók:

1. legfeljebb három, egymástól elkülönített Codex-agent;
2. macOS-port.

Ezeket nem szabad egyetlen nagy módosításba összekeverni.

## 4. Bizonyított production állapot

### 4.1 Ellenőrzött környezet

| Komponens | Ellenőrzött érték |
|---|---|
| Operációs környezet | WSL2 / Linux, systemd user service |
| Marveen baseline | `1.28.2`, Federation v1 |
| Bridge | `0.3.2` |
| Node.js | pontosan `22.23.1` |
| Codex CLI | `0.145.0` |
| Bizonyított szöveges modell | `gpt-5.6-terra`, `gpt-5.6-sol` |
| Képmodell | `gpt-image-2` |
| Reasoning effort | `low`, `medium`, `high`, `xhigh` |
| Federation production mód | `advisory` |

A Marveen saját Node-verziója eltérhet a Bridge Node-verziójától. A Bridge
systemd unitja a telepítéskor megadott Node 22 binárisra van rögzítve. A natív
`better-sqlite3` modulnak ugyanahhoz a Node 22 ABI-hoz kell készülnie.

### 4.2 Végleges 0.3.2 kiadási kapu

A lezárt `0.3.2` kapu eredménye:

- automatizált teszt: `130/130 PASS`;
- skip/fail/cancel: `0`;
- valódi Codex App Server handshake és modellfuttatás: PASS;
- thread-folytatás és idempotencia: PASS;
- approve/decline approval broker: PASS;
- dinamikus Marveen tool-válasz: PASS;
- valódi GPT-image és immutable artifact pipeline: PASS;
- élő szerepkör- és effort-módosítás: PASS;
- kontrollált runtime-újraindítás: PASS;
- előző beállítás pontos visszaállítása: PASS;
- auditnapló: PASS;
- read-only production preflight: PASS;
- Terra → Sol → Terra production modellváltás: PASS;
- modellenkénti Béla → Codex → Béla exactly-once canary: PASS;
- tiltott `gpt-5.5` modell mutációmentes elutasítása: PASS;
- telepítési cutover automatikus rollback-védelemmel: PASS.

A végső canary azonosítói:

```text
Sol:   messageId=400, replyId=401, marker=FEDERATION_V032_SOL_20260804073959_OK
Terra: messageId=402, replyId=403, marker=FEDERATION_V032_TERRA_20260804073959_OK
```

A kiadás lezárásakor mért szolgáltatásállapot:

```text
bela-dashboard.service: active
bela-codex-bridge.service: inactive
marveen-codex-bridge.service: active
```

Readiness:

```json
{
  "status": "ready",
  "bridgeVersion": "0.3.2",
  "database": true,
  "runtime": true
}
```

Readiness végpont az ellenőrzött telepítésen:

```text
http://127.0.0.1:3431/readyz
```

Az aktív release:

```text
/home/kisss/.local/share/marveen-codex-bridge/releases/0.3.2
```

## 5. A 0.3.2-ben lezárt fő képességek

### 5.1 Marveen Federation integráció

- Federation v1 manifest és inbox végpont;
- külön inbound/outbound peer-tokenek;
- `system/agent` címzés és hitelesített peer-identitás;
- feladó-megszemélyesítés tiltása;
- tartós inbox és outbox;
- lease, retry, dead-letter és deduplikáció;
- egy feladatból pontosan egy elfogadott válasz;
- publikus Federation API használata Marveen belső adatbázisa helyett;
- peer-reconciliation és hibás pairing esetén rollback.

### 5.2 Valódi Codex runtime

- külön Codex App Server folyamat;
- modell- és capability-ellenőrzés induláskor;
- tartós runtime-generation;
- thread indítás és biztonságos thread-folytatás;
- konfigurációváltás után a régi thread érvénytelenítése;
- aktív turnhöz kötött dinamikus toolok;
- maszkolt, méretkorlátos diagnosztikai stderr;
- váratlan App Server-kilépés kezelése;
- runtime restart és readiness ellenőrzés.

### 5.3 Szerepkör és reasoning effort

Az egyetlen jelenlegi `programozo` agentnél a dashboardon módosítható:

- `developerInstructions`;
- `reasoningEffort`: `low`, `medium`, `high`, `xhigh`.

A mentés védelmei:

- admin bearer token;
- kötelező megerősítés;
- üres vagy túlméretes szerepkör elutasítása;
- érvénytelen effort elutasítása;
- aktív run vagy pending approval alatt módosítási tilalom;
- atomi konfigurációcsere;
- privát backup;
- audit rekord;
- kontrollált runtime restart;
- sikertelen restart esetén automatikus rollback;
- kézi visszaállítás az előző beállításra.

A `0.3.2` beállításkezelője szándékosan csak egy agentet fogad el. A
`src/agent-settings-manager.mjs` több helyen `agents.length === 1` feltételt
követel. Emiatt a konfiguráció tömbszerkezete önmagában nem jelent kész
többagentes támogatást.

### 5.4 Approval broker

- tartós `pending`, `approved`, `declined`, `expired` állapot;
- azonos döntés ismétlése idempotens;
- ellentétes második döntés konfliktus;
- aktív waiter nélkül régi kérés nem hagyható jóvá;
- shutdown esetén kontrollált lejáratás;
- generation- és provider-request-azonosítóhoz kötés;
- külön admin-tokenes kezelés.

### 5.5 Képgenerálás és artifact háttérfolyamat

A `gpt-image-2` képgenerálás valóban működik. A kiadási kapu nem csak egy
képernyőt vagy mock választ, hanem a teljes valós folyamatot ellenőrizte:

1. Codex képesség-felderítés;
2. valódi PNG létrehozása;
3. regisztráció az aktív runból;
4. workspace-, traversal- és symlink-védelem;
5. PNG signature-, chunk-, CRC-, dimenzió-, pixelszám- és méretellenőrzés;
6. SHA-256 integritásellenőrzés;
7. immutable, `0400` jogosultságú Bridge-másolat;
8. tartós artifact-metaadat;
9. Federation result receipt;
10. hitelesített artifact API.

Következmény: a dashboard képelőnézeti hibája nem jogosít fel az artifact
háttérrendszer törlésére. A háttérfolyamat a képgenerálás biztonsági és
integritási része.

## 6. Lezárt probléma: Képartifactok dashboard

### 6.1 Megfigyelés

A production használatban a „Képartifactok” részben a generált képek
előnézete nem jelenik meg megfelelően. A felhasználónak ez a dashboard-kártya
nem szükséges.

### 6.2 Forrásból azonosított gyökérok

- a valódi imagegen → regisztráció → validáció → tárolás folyamat PASS volt;
- az artifact API és a bináris tartalom tesztje PASS volt;
- a frontend `URL.createObjectURL(await response.blob())` hívással `blob:`
  URL-t hoz létre;
- a dashboard CSP-je csak `img-src 'self' data:` forrást enged, a `blob:`
  protokollt nem;
- ezért a böngésző a sikeresen letöltött kép `blob:` előnézetét blokkolja.

A 0.3.1 dashboardteszt csak a statikus HTML/JavaScript és a CSP-fejléc
jelenlétét ellenőrizte. Valódi böngészőben nem próbálta betölteni a létrehozott
`blob:` URL-t, ezért ezt az integrációs hibát nem fogta meg.

### 6.3 Megvalósított termékdöntés

A `0.3.2` kiadásban:

- a „Képartifactok” dashboard-szekció eltávolításra került;
- az artifact darabszám kikerült a dashboard összegző UI-ból;
- a frontend nem kéri le feleslegesen az artifact-listát és bináris képeket;
- az artifact manager, adatbázis-migráció, regisztráló tool, validáció,
  immutable tárolás, result receipt és admin API megmaradt;
- a meglévő artifactfájlok nem kerültek törlésre;
- a képgenerálás kiadási kapuja változatlanul kötelező.

Ez tisztítás, nem az imagegen funkció eltávolítása.

### 6.4 A 0.3.2 végleges állapota

Elkészült a dashboard artifact-részének forrásoldali eltávolítása:

- nincs „Képartifactok” szekció;
- nincs artifact összegző kártya;
- a frontend nem hívja a `/v1/artifacts` listát vagy a bináris content
  végpontot, és nem készít `blob:` URL-t;
- a dashboard summary nem számolja le feleslegesen az artifactokat;
- az artifact manager, migráció, regisztráló tool, validáció, immutable
  tárolás, result receipt és minden `/v1/artifacts` admin API változatlanul
  megmaradt.

A teljes Node 22.23.1 regressziós kapu `130/130 PASS`. A Sol valós runtime-
kapu, az éles systemd aktiválás és a Terra → Sol → Terra production canary is
PASS. A dashboard-hiba lezárt; az artifact backend változatlanul aktív.

## 7. `gpt-5.6-sol` validálás és biztonságos modellválasztás

### 7.1 Végleges tény

A stabil `0.3.1` production kapu `gpt-5.6-terra` modellel futott le. A
`0.3.2` pre-Sol jelölt (`15bd74c1eb1a4d938cf38551636359051dac4c65`)
izolált, bejelentkezett WSL-környezetben 2026-08-02-án sikeresen teljesítette a
valós `gpt-5.6-sol` Phase 7 kaput, beleértve a szöveges runtime-, approval-,
Federation- és `gpt-image-2` artifact-folyamatot. A záró eredmény:

```text
RESULT: PHASE 6.1 REAL CODEX, APPROVAL, FEDERATION AND IMAGEGEN PASS
```

Ezt követően az éles systemd service és a Marveen 1.28.2 elleni végső
production canary is PASS lett 2026-08-04-én.

A modellválasztót tartalmazó
`e0beee33d2078f03567e985f248e2476ec0da9e1` commiton ugyanez a teljes valós
kapu 2026-08-02-án megismételve is PASS lett Node `22.23.1` és Codex CLI
`0.145.0` alatt. Az eredmény `127/127` automatizált teszt, valamint valós Sol,
approval, Federation és `gpt-image-2` artifact PASS volt, skip/fail/cancel
nélkül. A providerfüggő modellválasztás és a telepített production service
egyaránt bizonyított.

### 7.2 Sol-tesztkapu és production ellenőrzés

A valós preflight a következő providerfüggő útvonalakat ellenőrizte; a
modellváltási tranzakciót a 0.3.2 jelölt regressziós kapuja külön bizonyítja:

1. a Codex App Server `model/list` valóban visszaadja a `gpt-5.6-sol` modellt;
2. a Bridge induláskori modellvalidációja elfogadja;
3. új thread indítható a modellel;
4. egyszerű szöveges feladat sikeresen befejeződik;
5. thread-folytatás ugyanazzal a modellel működik;
6. Marveenből indított feladat visszaér Bélához;
7. dinamikus `marveen_agent_message_send` tool működik;
8. approvalt igénylő művelet approve és decline ága működik;
9. reasoning effort kompatibilitás külön ellenőrzött;
10. runtime restart után a konfiguráció és a routing helyes;
11. sikertelen modellváltás automatikusan visszaállítja a régi működő modellt
    és nem érvényteleníti a régi threadet;
12. teljes regressziós teszt PASS.

A végső telepített kapuhoz elkészült a
`scripts/production-canary-0.3.2.mjs` eszköz. Alapértelmezésben read-only
preflight; csak `--execute` mellett végez Terra → Sol → Terra váltást. Két
backupot, két sikeres auditrekordot, minden váltás után readiness állapotot,
mindkét modellel pontosan-egyszeri Marveen canaryt, végül tiltott modell teljes
állapotváltozás nélküli elutasítását követeli. A production fault injection
szándékosan kimarad; a post-write automatikus rollbacket a determinisztikus
regressziós teszt bizonyítja.

A repository jelenlegi valós preflightja paraméterezhető modellel. A támogatott
belépési pont a `scripts/verify-phase7.sh --model ...`. A
`verify-phase2.sh`, `verify-phase3.sh`, `verify-phase4.sh` és
`verify-phase5.sh` történeti kapuk, ezért a jelenlegi ágon deprecation hibával
leállnak. Az éles service-en a Terra → Sol → Terra modellváltás, a readiness,
a backup, az audit, a tiltott modell mutációmentes elutasítása és a Marveen
1.28.2 Federation canaryja PASS. A post-write automatikus rollback
regressziós kapuja szintén PASS.

### 7.3 Implementált modellválasztási szerződés

- A konfiguráció explicit allowlistája: `gpt-5.6-terra`, `gpt-5.6-sol`.
- A dashboard kizárólag az allowlista és az aktuális App Server `model/list`
  metszetét jeleníti meg.
- A szerver mentés előtt ismét ellenőrzi a modell nevét, az allowlistát és az
  aktuális fiókbeli elérhetőséget.
- Ismeretlen vagy nem elérhető modell még backup, konfigurációírás,
  runtime-leállítás és thread-érvénytelenítés előtt fail-closed hibát ad.
- A restart újra lekéri a `model/list` választ; ez a második validációs kapu.
- Modellváltáskor atomi backup, privát konfigurációírás, audit, runtime restart,
  readiness és automatikus rollback fut.
- A régi thread csak sikeres restart után érvénytelenedik. Sikertelen váltásnál
  az előző modell és thread megmarad.
- Az audit a modell és effort előtte/utána értékét, valamint a szerepkör hashét
  tárolja; a teljes szerepkörszöveget nem duplikálja.

## 8. Következő nagy fejlesztés: maximum három külön Codex-agent

### 8.1 Termékcél

A Marveen rendszerhez legfeljebb három külön Codex-agent legyen kapcsolható.
Mindegyik agent önállóan kapjon:

- stabil `id`-t;
- megjelenített nevet;
- engedélyezett/letiltott állapotot;
- modellt;
- reasoning effortot;
- teljes `developerInstructions` szerepkört;
- saját workspace-et;
- saját Codex-threadet és runtime-állapotot;
- elkülönített runokat;
- elkülönített approvalokat;
- agentazonosítót tartalmazó auditnaplót;
- külön Federation-címezhetőséget.

Példa címzések:

```text
codex/programozo
codex/marketinges
codex/kutato
```

A nevek csak példák. A végleges neveket és szerepköröket a dashboardon kell
beállítani, nem a kódba égetni.

### 8.2 Miért nincs ez még kész?

A jelenlegi kódban több elem már tömböt vagy agent-ID szerinti mapet használ,
de a teljes termék továbbra is egy agentre van lezárva:

- `src/config.mjs` több agentet technikailag be tud olvasni, jelenleg akár
  100-at is; ez nincs összhangban a kívánt maximum hárommal;
- `src/agent-settings-manager.mjs` kifejezetten pontosan egy agentet követel;
- a beállítási API implicit módon az első agentet módosítja;
- a dashboard egyetlen szerepkör/effort szerkesztőt jelenít meg;
- a modell jelenleg nem szerkeszthető ugyanebben az atomi folyamatban;
- az audit és restore logika nincs teljesen agentenkéntivé téve;
- több telepítési, canary és cutover alapérték a `programozo` agentre épül;
- nincs teljes háromagentes konkurencia-, restart-, isolation- és routing-kapu.

Ezért tilos egyszerűen három objektumot írni a konfiguráció `agents` tömbjébe
és késznek tekinteni a fejlesztést.

### 8.3 Kötelező architekturális követelmények

1. **Maximum három:** szerveroldali validációval, nem csak UI-korláttal.
2. **Stabil azonosító:** létrehozás után az `id` ne változzon névátírástól.
3. **Egyedi workspace:** két agent nem mutathat ugyanarra a könyvtárra.
4. **Egyedi Federation-címzés:** nincs ütköző `system/agent` cím.
5. **Thread-isolation:** egyik agent threadje sem folytatható másik agentként.
6. **Run-isolation:** agent-ID minden futási rekord kötelező része.
7. **Approval-isolation:** a döntés agenthez, generationhöz, runhoz és provider
   requesthez kötött.
8. **Artifact-isolation:** minden artifact tulajdonos agentje ellenőrzött.
9. **Agentenkénti beállítászár:** aktív run/pending approval csak az érintett
   agent módosítását tiltsa, ha a runtime architektúra ezt biztonságosan tudja;
   ellenkező esetben dokumentált globális zár szükséges.
10. **Atomi módosítás:** role/model/effort változtatás backup + restart +
    readiness + audit + rollback folyamatban történjen.
11. **Célzott újraindítás:** lehetőleg csak az érintett agent generationje és
    threadje változzon. Ha az App Server közös processz, a globális restart
    hatását egyértelműen kezelni és tesztelni kell.
12. **Fail-closed modellvalidáció:** minden engedélyezett agent modellje elérhető
    legyen induláskor.
13. **Törlésvédelem:** aktív runnal, pending approvallal vagy ki nem kézbesített
    outboxszal rendelkező agent nem törölhető.
14. **Letiltás:** ne fogadjon új inbox feladatot, de a már tartósan eltárolt
    állapot kezelését ne rontsa el.
15. **Titokvédelem:** agentkonfiguráció és audit ne szivárogtasson tokent vagy
    teljes érzékeny prompttartalmat.

### 8.4 Javasolt konfigurációs irány

```json
{
  "agents": [
    {
      "id": "programozo",
      "displayName": "Codex programozó",
      "enabled": true,
      "model": "gpt-5.6-sol",
      "reasoningEffort": "high",
      "developerInstructions": "...",
      "workspacePath": "/home/USER/.local/share/marveen-codex-bridge/agents/programozo",
      "federationPeer": "bela"
    }
  ]
}
```

Ez csak irány, nem kész specifikáció. Implementáció előtt külön, részletes
többagentes fejlesztési specifikációt kell készíteni a tényleges 0.3.2
forrásállapot alapján.

### 8.5 Kötelező többagentes tesztkapu

Legalább az alábbi esetek szükségesek:

- 1, 2 és 3 agent konfiguráció PASS;
- 0 vagy 4 agent fail-closed;
- duplikált agent-ID, Federation-cím vagy workspace fail-closed;
- három külön manifest-bejegyzés;
- mindhárom agent külön modell/role/effort beállítása;
- párhuzamos feladat három agentnek, keresztbeszennyezés nélkül;
- thread-, run-, approval-, artifact- és audit-isolation;
- egyik agent restartja után a másik kettő állapota helyes;
- agentenkénti restore;
- hibás modellváltás csak az érintett konfigurációt állítja vissza;
- letiltott agent nem címezhető új feladattal;
- aktív/pending állapotú agent törlése tiltott;
- service restart és gép/WSL restart után mindhárom agent helyreáll;
- Marveen → kiválasztott Codex-agent → Marveen canary mindhárom agenttel;
- teljes korábbi egyagentes regresszió PASS.

## 9. Platformtámogatás

### 9.1 Támogatott

Jelenleg vállalt és bizonyított:

- Linux;
- WSL2;
- systemd user service;
- Node 22 és a hozzá illeszkedő natív `better-sqlite3`.

### 9.2 Nem támogatott jelenleg

macOS jelenleg nem támogatott production platform. A JavaScript-mag jelentős
része hordozható, de a telepítés, service-életciklus, sandbox, rollback és több
shell-parancs Linux/systemd-specifikus.

Elkészült egy későbbi macOS-portolási specifikáció:

```text
Marveen-Codex-Bridge-v0.4.0-macOS-fejlesztesi-specifikacio.md
```

A felhasználói döntés szerint a macOS-fejlesztés most nem indul el.

### 9.3 Verziószám-ütközés

A macOS-dokumentum munkacíme `0.4.0`, miközben a háromagentes fejlesztés is
minor kiadást igényel. Két külön fejlesztést nem szabad ugyanazzal a
verziószámmal kiadni.

Jelenlegi javaslat:

- `0.3.2`: artifact UI tisztítás + Sol-validáció;
- `0.4.0`: maximum három agent, ha ez készül el előbb;
- macOS: későbbi minor verzió, például `0.5.0`, de csak a fejlesztés tényleges
  megkezdésekor kell véglegesíteni.

A macOS-specifikáció technikai tartalma ettől használható marad, de a benne
szereplő verziószám jelenleg előzetes, nem kiadási ígéret.

## 10. Biztonsági invariánsok – ezeket tilos feláldozni

Minden további fejlesztésnél meg kell maradnia:

- localhost-only listen;
- külön Federation és admin token;
- timing-safe token-ellenőrzés;
- peer- és sender-identitás egyezése;
- sender impersonation tiltása;
- input- és méretkorlátok;
- admin auth minden érzékeny API-n;
- privát konfigurációk/tokentartalom kizárása Gitből és logból;
- Codex sandbox és approval broker együttes használata;
- tartós inbox/outbox/run/approval/artifact állapot;
- idempotencia és pontosan-egyszeri üzleti feldolgozás;
- systemd sandbox és célzott írható útvonalak;
- atomi aktiválás és ellenőrzött rollback;
- Marveen forráskódjának és belső adatbázisának érintetlensége;
- fail-closed indulás ismeretlen modell, capability, peer vagy
  konfigurációütközés esetén;
- titkok maszkolása a diagnosztikában.

Egy új funkció nem tekinthető késznek, ha csak ezen védelmek kikapcsolásával
működik.

## 11. Fejlesztési és kiadási szabályok

### 11.1 Munkakezdés

1. `origin/main` frissítése és commit/tree ellenőrzése.
2. Tiszta, külön feature branch.
3. `package.json`, `README.md`, `TEST-RESULTS.md` és ez a fájl elolvasása.
4. Releváns `docs/` szerződések elolvasása.
5. A production konfiguráció és titkok kizárása a munkafából.
6. A változás határának rögzítése; 0.3.2-be ne kerüljön a teljes többagentes
   átépítés vagy macOS-port.

### 11.2 Implementáció

- Először reprodukálható teszt vagy bizonyíték, utána javítás.
- A kliensoldali validáció nem helyettesíti a szerveroldalit.
- Nem szabad kizárólag mockkal bizonyítani a modell- vagy providerfüggő
  működést.
- Natív Node-modul tesztje ugyanazzal a Node 22 ABI-val fusson, mint a service.
- Konfigurációváltás mindig backup + audit + restart/readiness + rollback.
- A Marveen integráció csak verziózott, publikus Federation szerződésen át
  történhet.
- Új migráció előre kompatibilis és ismételten biztonságosan futtatható legyen.
- Régi adatot és artifactot nem szabad automatikusan törölni.

### 11.3 Kötelező ellenőrzés kiadás előtt

- szintaktikai ellenőrzés;
- teljes automatizált tesztcsomag;
- célzott negatív biztonsági tesztek;
- installer prepare-only;
- aktiválás;
- readiness;
- valós Codex modellfuttatás;
- approval approve/decline;
- Federation canary;
- imagegen/artifact regresszió;
- konfigurációmódosítás és restore;
- hibás aktiválás és rollback;
- service restart;
- felhasználói környezetben végzett végső ellenőrzés;
- README, TEST-RESULTS és PROJECT-STATUS frissítése;
- release checksum ellenőrzése.

Nem szabad PASS-ként dokumentálni olyan kaput, amely csak „várhatóan működik”
vagy amelyet más platformon/modellen futtattak.

## 12. Lezárás és külön jövőbeli projektek

### Elvégzett Fázis A – `0.3.2` pontos specifikáció

1. A production artifact UI-hiba rövid diagnosztikája.
2. Döntés rögzítése: UI eltávolítás, backend megtartás.
3. Sol modell valós preflight- és rollback-terve.
4. Modellválasztás API/UI szerződésének meghatározása.
5. Elfogadási kritériumok és regressziós lista.

### Elvégzett Fázis B – `0.3.2` implementáció

1. Artifact frontend és összegző UI eltávolítása.
2. Felesleges frontend artifact-kérések megszüntetése.
3. Sol valós tesztkapu futtatása.
4. Siker esetén biztonságos modellválasztó.
5. Settings backup/restart/rollback/audit kiterjesztése modellre.
6. Teljes regresszió, WSL production canary és release.

Aktuális állapot: mind a hat pont elkészült. A teljes regresszió, az éles WSL
systemd production canary és a Marveen 1.28.2 kompatibilitási canary PASS. A
0.3.2 kiadás lezárt.

### Fázis C – többagentes specifikáció

Csak a stabil `0.3.2` után készüljön el. A specifikáció a tényleges akkori
kódot vegye alapul, és döntse el a közös vagy agentenkénti App Server
folyamatot, a részleges restart jelentését, az agent lifecycle API-t és az
adatbázis-migrációt.

### Fázis D – maximum három agent implementációja

Külön minor kiadás, teljes isolation- és recovery-kapuval.

### Fázis E – macOS

Elhalasztva. Nem része a következő fejlesztési beszélgetésnek.

## 13. Újranyitási szabály

Új fejlesztés csak külön céllal és új scope-pal indulhat. Kötelező kiindulópont
a GitHub `main` ágán lévő stabil `0.3.2`, valamint a `PROJECT-STATUS.md`,
`README.md`, `TEST-RESULTS.md` és `CHANGELOG.md`. A többagentes támogatást és a
macOS-portot nem szabad karbantartási javításnak álcázva ebbe a lezárt kiadásba
visszakeverni.

## 14. Rövid ellenőrzőlista a következő AI számára

Mielőtt bármit módosítasz, válaszold meg forrásból:

- valóban `origin/main`/`0.3.2` az alapod?
- tiszta a munkafa?
- a Bridge Node 22 környezete külön van a Marveen Node környezetétől?
- megértetted, hogy a képgenerálás működik, az artifact backend megmaradt, a
  dashboard UI pedig szándékosan nem jelenít meg artifactokat?
- megértetted, hogy az artifact backendet nem szabad törölni?
- megőrzöd a Terra/Sol production kaput és a rollback-regressziót?
- megértetted, hogy a jelenlegi settings manager pontosan egy agentre épül?
- nem kevered a 0.3.2 javítást a háromagentes vagy macOS-fejlesztéssel?
- minden új állításhoz van futtatott teszt vagy konkrét forrásbizonyíték?

Ha bármelyik válasz nem egyértelmű, a fejlesztés előtt tisztázni kell. A
feltételezés nem helyettesíti a production kaput.
