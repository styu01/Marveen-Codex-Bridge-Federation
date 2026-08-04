# Változásnapló

## 0.3.2 – 2026-08-04

Stabil production kiadás Marveen `1.28.2`, Node.js `22.23.1` és Codex CLI
`0.145.0` környezethez.

### Új és módosított funkciók

- szerveroldalon validált modellválasztás `gpt-5.6-terra` és
  `gpt-5.6-sol` között;
- az allowlista és az élő Codex App Server modelllista metszetére épülő
  dashboard-választó;
- modell-, effort- és szerepkörváltás atomi backup, audit, runtime restart,
  readiness és automatikus rollback védelemmel;
- reprodukálható read-only és módosító Terra → Sol → Terra production canary;
- a felesleges Képartifactok dashboard UI és frontend lekérések eltávolítása,
  az ellenőrzött artifact backend változatlan megtartásával;
- a történeti Phase 2–5 ellenőrzők egyértelmű deprecation kapura cserélése.

### Javítások és biztonság

- sikertelen runtime-átállás nem érvényteleníti a még működő régi threadet;
- a meglévő agent-workspace a felhasználó HOME könyvtárán belül megmaradhat;
- a systemd service csak a konkrét konfigurált workspace-ekhez kap írási
  jogot, nem a teljes HOME könyvtárhoz;
- HOME-on kívüli, HOME-mal azonos vagy symlinkkel átirányított workspace
  továbbra is fail-closed módon elutasított;
- az első, túl szigorú workspace-kaput tartalmazó jelölt hibájánál a 0.3.1
  automatikus rollbackje sikeresen működött.

### Ellenőrzés

- `130/130` automatizált teszt PASS, fail/skip/cancel: `0`;
- valós Codex, approval, Federation és `gpt-image-2` kapu PASS;
- Marveen `1.28.2` read-only production preflight PASS;
- Terra → Sol → Terra systemd production canary PASS;
- modellenkénti Béla → Codex → Béla exactly-once Federation válasz PASS;
- tiltott modell állapotváltozás nélküli elutasítása PASS;
- végleges production cutover PASS.

## 0.3.1 – 2026-08-01

- első stabil Federation Bridge kiadás;
- önálló systemd service, tartós inbox/outbox és exactly-once feldolgozás;
- valódi Codex App Server, approval broker és dinamikus Marveen tool;
- `gpt-image-2` validáció, immutable artifact tárolás és receipt;
- szerepkör- és reasoning-effort kezelés backup, audit és rollback védelemmel.
