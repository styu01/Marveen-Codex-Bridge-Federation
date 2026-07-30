# Phase 7.3 — controlled production cutover

Phase 7.3 activates the Federation Edition without applying a Codex adapter to
the Marveen source tree.

## Safety order

1. Verify the Phase 0 recovery set, candidate commit, private Git bundle,
   fixed Node 22 runtime, Codex login, dashboard health and disabled Federation.
2. Verify the standalone Bridge candidate and absence of legacy approvals.
3. Create a private cutover record and stash the complete Marveen working tree.
4. Switch production Marveen to the already tested 1.25.1 candidate commit.
5. Preserve the old `node_modules` directory by atomic rename, install clean
   Node 22 dependencies, typecheck, syntax-check and build.
6. Restart and health-check Marveen while Federation is still disabled.
7. Pair the standalone Bridge using only the public Federation API.
8. Stop the legacy Bridge, activate the standalone service, and verify readiness.
9. Enable Federation in `advisory` mode and apply the generated main-agent
   instructions.
10. Require one exact Marveen → Codex → Marveen canary response with no
    duplicate.

## Automatic rollback

Every failure after the first mutation runs the rollback trap. The first action
is always the public Federation master switch to `disabled`. The new service is
then stopped. If the Marveen source was switched, the original branch and
commit, the exact pre-cutover stash, and the old `node_modules` directory are
restored before the Claude dashboard is restarted.

The quarantined 0.2.1 adapter is deliberately not re-applied. Therefore the
rollback target is a safe Claude-only Marveen, not the old coupled architecture.
The Phase 0 archives and legacy quarantine stash remain untouched.

## Soak period

After a successful cutover, retain:

- the Phase 0 freeze;
- the private candidate bundle and checksum;
- the Phase 7 recovery record and pre-cutover stash;
- the old `node_modules` directory;
- the legacy adapter quarantine.

Do not remove these until a separate live acceptance suite and an agreed soak
period have passed.
