# ChangeGraph Implementation Documentation

This directory contains the current execution-facing documentation for implementing ChangeGraph.

## Canonical implementation brief

**Read first:** [`CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`](./CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md)

This is the September 6, 2026 implementation brief synced from the user-maintained Notion page after the plan was completely revised with Astra. It is the current execution source of truth for the semantic-delta verification system.

Earlier research, architecture, and `docs/superpowers` plans remain useful context, but implementation workers should map them through this current brief rather than blindly executing an older plan when the two differ.

## Source synchronization

[`SOURCE_SYNC_AUDIT.md`](./SOURCE_SYNC_AUDIT.md) records the audited Notion source revision, canonical GitHub blob, all 28 section checks, high-risk semantic details, and the drift rule for future Notion edits.

Do not assume Notion and GitHub are still synchronized after the Notion page changes. Re-audit before implementing a newer source revision.

## Execution status

[`changegraph-status.md`](./changegraph-status.md) is the required resumable implementation ledger. It must contain actual repository inspection results, commands executed, pass/fail results, blockers, and implementation decisions as Units A–L progress.

## Execution contracts maintained during implementation

The canonical brief requires these documents to evolve from verified implementation behavior:

- [`supported-semantics.md`](./supported-semantics.md) — exact supported TypeScript/IR/observable/verifier semantics and explicit unsupported cases.
- [`execution-security.md`](./execution-security.md) — sandbox boundary, threat model, credentials/network/filesystem/resource controls, and security verification results.
- [`local-verification.md`](./local-verification.md) — exact local setup, fixtures, solver/sandbox requirements, commands, and reproducible verification procedures.

Their current scaffolds intentionally make no production claims. Do not fill them with aspirational behavior; update them from real code and executed checks.

## Implementation order

The canonical dependency-ordered sequence is:

```text
A  Repository integration map
B  Contracts, scope, and obligations
C  Observables and isolated execution
D  Classification and counterexamples
E  Challenge Lab and stateful adapters
F  Persistence and application orchestration
G  Planner, policy, CLI, and web API
H  Behavioral UI and GitHub Checks
I  Symbolic subset and proof memory
J  Evidence Passport
K  Repair Lab and Interaction Sentinel
L  Full-system verification and cleanup
```

Passing an early unit is not completion of the feature set. Section 28 of the canonical brief is the authoritative Definition of Done.
