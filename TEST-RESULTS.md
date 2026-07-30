# Phase 6.3 verifikáció

Dátum: 2026-07-29

Lokális eredmény:

- Phase 1–6.3 tesztek: 98/98 PASS Node 22.23.1 alatt;
- npm lifecycle Node 22 PATH/ABI regresszió: PASS;
- önálló dashboard és admin API auth/CSP: PASS;
- prepare-only release installer és Marveen-sentinel: PASS;
- legacy/new service kettős aktiválási kapu: statikus és installer teszt PASS;
- automatikus worker E2E regresszió: 30/30 egymást követő futás PASS;
- skip/cancel: 0;
- approval approve/decline: PASS;
- ismételt azonos döntés: idempotens PASS;
- ellentétes második döntés: `409` PASS;
- shutdown közbeni pending approval: `expired` + decline PASS;
- tartós, monoton App Server generation: PASS;
- dinamikus Marveen-üzenet: pontosan egy outbox rekord PASS;
- dinamikus tool identitás- és aktív-turn kapu: PASS;
- korábbi Federation, runtime, restart és driver regresszió: PASS.
- GPT-image capability fail-closed kapu: PASS;
- dinamikus image artifact regisztráció: PASS;
- workspace/traversal/symlink védelem: PASS;
- PNG signature/chunk/CRC/dimenzió ellenőrzés: PASS;
- méret- és SHA-256 kapu: PASS;
- immutable artifact másolat és restart utáni metaadat: PASS;
- admin artifact API auth, metaadat és bináris tartalom: PASS;
- Federation inbox result artifact receipt: PASS;
- imagegen artifact nélküli siker tiltása: PASS.
- legacy adapter git-karantén read-only/execute mód: PASS;
- ignorált Marveen runtime-adat megőrzése: PASS;
- publikus API-s pairing preflight/execute: PASS;
- peer-exists és enabled Federation fail-closed kapu: PASS;
- hibás Marveen tokenválasznál automatikus peer rollback: PASS.

## Nyitott kiadási kapu

A valódi Codex approve/decline, dinamikus üzenet és GPT-image preflightot a
felhasználó bejelentkezett WSL-környezetében kell futtatni. A csomag lokális
ellenőrzése nem állíthatja, hogy a felhasználó ChatGPT-jogosultsága működik.

Végső Phase 6.3 runtime PASS csak akkor mondható ki, ha megjelenik:

```text
RESULT: PHASE 5 REAL APPROVAL AND MESSAGE TOOL PASS
RESULT: PHASE 5.2 REAL IMAGEGEN AND ARTIFACT PASS
RESULT: PHASE 6.1 REAL CODEX, APPROVAL, FEDERATION, IMAGEGEN AND DASHBOARD PASS
```

## Phase 7.11 dependency, systemd és Federation peer-identitás kapu

Dátum: 2026-07-30

- immutable release-path systemd unit regresszió: PASS;
- `current` symlink kizárása a runtime-modul és `better-sqlite3` útvonalából:
  PASS;
- megszakadt párosítás privát állapot- és token-ujjlenyomat alapú folytatása:
  PASS;
- a folytatott pairing kompakt eredményében a Marveen `systemId` megőrzése és
  a peer-reconciliation általi feldolgozása: PASS;
- föderált canary regresszió: az eredeti sor `delivered` marad, a válasz külön
  sorban érkezik, és ez pontosan egyszer sikeresnek minősül: PASS;
- ismeretlen vagy eltérő peer fail-closed: PASS;
- aktuális kísérletben létrehozott peer ellenőrzött rollbackje: PASS;
- régi és candidate `dist` atomikus megőrzési szerződése: PASS;
- legacy Bridge automatikus visszaindítási és readiness-szerződése: PASS;
- Phase 7.5 hybrid-dist célzott helyreállító preflight/execute szerződése:
  PASS;
- `ProtectHome=read-only` mellett kizárólag a nem symlink `CODEX_HOME`
  írhatósági kivétele: PASS;
- hitelesítőadat-mintákat maszkoló és méretkorlátos Codex stderr: PASS;
- váratlan App Server-kilépés diagnosztikai stderr-tailje: PASS;
- runtime `onEvent` naplózási lánc: PASS;
- valódi systemd readiness próba a Marveen stash/switch előtt: PASS;
- Marveen-módosítás előtti hiba esetén Federation API hívása nélküli legacy
  Bridge-visszaállítási szerződés: PASS;
- a Marveen publikus API-ból származó `systemId` és a hitelesített Bridge-peer
  atomikus egyeztetése: PASS;
- új immutable release production függőségeinek kötelező, Node 22-es staging
  telepítése a systemd-próba előtt: PASS;
- a `bela/bela` canary a régi `marveen` peerrel reprodukálhatóan 403, az
  egyeztetett `bela` peerrel 202: PASS;
- peer-konfiguráció visszaállítása sikertelen cutover esetén: PASS;
- célzott új és módosított tesztek: 14/14 PASS.

A teljes 117/117 tesztet a kiadási csomagból, Node 22.23.1 és az ahhoz
fordított production `better-sqlite3` modul alatt kell lefuttatni. Új éles
`--execute` cutover addig nem engedélyezett.
