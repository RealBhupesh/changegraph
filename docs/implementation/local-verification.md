# Local Verification

> **Status:** execution-facing scaffold required by the canonical implementation brief. Keep this file reproducible and command-oriented. Record only commands and dependencies that have actually been verified in the repository.

Canonical source: [`CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`](./CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md)

## Current implementation state

Unit A has not been completed. The repository currently contains planning and architecture documentation, but no verified application workspace/build/test command set from the September 6 canonical implementation brief is recorded here yet.

## Prerequisites

Populate from actual repository inspection. Expected categories from the existing architecture documents include Node.js, pnpm, PostgreSQL, optional solver runtime, sandbox provider, and GitHub test credentials, but none should be treated as locally verified until Unit A records the concrete versions and setup.

## Baseline commands

To be filled during Unit A with exact commands that were executed successfully or failed with captured results:

```text
install:
test:
typecheck:
lint:
build:
fixture-e2e:
benchmark:
```

Do not infer commands from old planning documents if the implementation repository chooses different conventions.

## Local semantic-delta fixture verification

As Units B–E are implemented, document reproducible commands for at least:

- contract validation;
- scope diff;
- pricing allowed-change fixture;
- unexpected standard-pricing witness;
- no-op intended-change failure;
- independent property failure;
- witness replay/minimization;
- independent challenge generation;
- state-transition and PostgreSQL fixtures.

## Symbolic verification

When Unit I is implemented, document:

- exact solver installation/version;
- supported verifier configuration;
- symbolic equivalent fixture;
- SAT countermodel + JavaScript replay fixture;
- unsupported-syntax behavior;
- timeout/`UNKNOWN` behavior;
- proof-memory invalidation checks.

If the solver is absent, the command/result must show the capability as unavailable/blocked rather than silently skipping verification.

## Evidence Passport verification

When Unit J is implemented, document integrity, tamper, wrong-binding, unsigned, configured-signing, replay, and optional proof-check procedures.

## GitHub integration verification

Local/provider fixture tests should be reproducible without live credentials. Record any live GitHub App/Check test separately and mark it blocked if credentials/test installation are unavailable.

## Full handoff verification

Unit L must list exact commands for the complete fixture suite, API/DB integration tests, CLI snapshots, UI end-to-end tests, security tests, typecheck, lint, build, and benchmark harness.

Every result must also be recorded in [`changegraph-status.md`](./changegraph-status.md).
