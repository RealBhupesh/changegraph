# ChangeGraph Implementation Documentation

This directory contains the current execution-facing documentation for implementing ChangeGraph.

## Canonical implementation brief

**Read first:** [`CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`](./CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md)

This is the September 6, 2026 implementation brief synced from the user-maintained Notion page after the plan was completely revised with Astra. It is the current execution source of truth for the semantic-delta verification system.

Earlier research, architecture, and `docs/superpowers` plans remain useful context, but implementation workers should map them through this current brief rather than blindly executing an older plan when the two differ.

## Execution status

[`changegraph-status.md`](./changegraph-status.md) is the required resumable implementation ledger. It must contain actual repository inspection results, commands executed, pass/fail results, blockers, and implementation decisions as Units A–L progress.

## Documents required during implementation

The canonical brief requires the implementation to produce and maintain these additional documents as the relevant capabilities become real:

- `supported-semantics.md` — exact supported TypeScript/IR/observable/verifier semantics and explicit unsupported cases.
- `execution-security.md` — sandbox boundary, threat model, credentials/network/filesystem/resource controls, and security verification results.
- `local-verification.md` — exact local setup, fixtures, solver/sandbox requirements, commands, and reproducible verification procedures.

Do not fill these with aspirational claims. They should be written from the implemented behavior and actual verification results.

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
