# Federation Bridge 0.3.2 üzemeltetés

## Állapotellenőrzés

```bash
systemctl --user is-active marveen-codex-bridge.service
curl --fail --silent http://127.0.0.1:3431/readyz | python3 -m json.tool
```

Elvárt verzió: `0.3.2`, `status: ready`, `database: true`, `runtime: true`.

## Konfiguráció

Alapértelmezett hely:

```text
~/.config/marveen-codex-bridge/config.json
```

A konfiguráció, tokenek és pairing fájlok privátak; ne kerüljenek Gitbe. A
modell és effort az `agents` bejegyzésben állítható:

```json
{
  "model": "gpt-5.6-terra",
  "reasoningEffort": "high"
}
```

A szerepkör és a négy támogatott effort a Bridge dashboardon szerkeszthető.
A mentés atomi, előtte privát backup készül, utána a Bridge kontrolláltan
újraindítja a Codex runtime-ot és érvényteleníti a korábbi threadet. Kézi
`systemctl restart` nem szükséges.

A backupok és a tartalommentes auditnapló helye:

```text
~/.config/marveen-codex-bridge/agent-settings-history/
```

Az API minden beállítási végpontja ugyanazt a szigorú admin bearer tokent
követeli, mint a dashboard. Mentéshez és visszaállításhoz `confirm: true`,
valamint egy nem üres módosítónév szükséges.

## Bridge-frissítés

1. Ellenőrizd az archívum SHA-256 értékét.
2. Csomagold ki külön könyvtárba.
3. Futtasd az új csomag `verify-phase7.sh --mock-only` ellenőrzését.
4. Telepítsd `install-phase7.sh --prepare-only` módban.
5. Ellenőrizd a candidate release-t.
6. Csak ezután aktiváld.

A Marveen forrását egyik lépés sem módosíthatja.

## Rollback

Az előző immutable release helye:

```bash
readlink -f "$HOME/.local/share/marveen-codex-bridge/previous"
```

Vészhelyzetben állítsd le az új service-t, állítsd a `current` pointert a
bizonyított előző release-re, majd indítsd újra a service-t. A pointer célját
mindig abszolút, ellenőrzött release-könyvtárként add meg; ismeretlen vagy
részleges könyvtárra ne válts.

Production cutover hibánál a `cutover-phase7.sh` először letiltja a
Federationt, majd automatikusan visszaállítja a korábbi Marveen- és
service-állapotot.

## Eltávolítás

1. Tiltsd le a Federationt a Marveen publikus API-ján.
2. Állítsd le és tiltsd le a `marveen-codex-bridge.service` unitot.
3. Ellenőrizd, hogy a Marveen helyi működése egészséges.
4. A konfigurációt, adatbázist és release-eket csak külön mentés után töröld.

A legacy adapter karanténját és a Phase 0 mentést ne töröld automatikusan.
