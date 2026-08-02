# Aktuális verifikációs kapu

A jelenlegi kiadás egyetlen támogatott, összesített kapuja:

```bash
./scripts/verify-phase7.sh [opciók]
```

A `verify-phase2.sh`, `verify-phase3.sh`, `verify-phase4.sh` és
`verify-phase5.sh` korábbi fejlesztési checkpointokhoz tartoztak. Verzió- és
tesztszám-feltételeik a későbbi release-ekre nem érvényesek, ezért a jelenlegi
ágon szándékosan hibával leálló deprecation stubok.

## Mock és valós kapu

A kizárólag lokális, mock szolgáltatásokat használó regresszió:

```bash
./scripts/verify-phase7.sh --mock-only \
  --node-bin /abszolut/ut/node \
  --better-sqlite3-path /abszolut/ut/node_modules/better-sqlite3
```

A valós Codex App Server-, approval-, Federation tool- és imagegen-kapu:

```bash
./scripts/verify-phase7.sh \
  --node-bin /abszolut/ut/node \
  --better-sqlite3-path /abszolut/ut/node_modules/better-sqlite3 \
  --codex-bin /abszolut/ut/codex \
  --expected-codex-version VERSION \
  --model MODELL \
  --real-output-root /privat/kimeneti/konyvtar
```

A valós kapu disposable adatbázisokat és loopback teszt-peert használ. Nem
helyettesíti a telepített systemd service readiness-, restart-, rollback- és
Marveen → Codex → Marveen production canary ellenőrzését.
