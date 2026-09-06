# Notion ↔ GitHub Source Sync Audit

Audit date: **2026-09-06**

## Authoritative source

- Notion page: `ChangeGraph — Complete Implementation Plan for Cursor Composer`
- Notion page ID: `3d3144f9-056e-8188-816b-e7cfdcc2ae78`
- Notion URL: https://app.notion.com/p/3d3144f9056e8188816be7cfdcc2ae78?pvs=204
- Current Notion `page_last_edited_at`: `2026-09-06T14:12:30.317Z`
- Notion verification state at audit: `unverified`

## GitHub canonical copy

- Repository: `RealBhupesh/changegraph`
- Canonical path: `docs/implementation/CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`
- Audited canonical blob SHA: `3683a09ecdb5dde1b50cdd74c11de0141dd48a3a`

## Audit method

The current Notion page was fetched again after the initial GitHub sync. Its last-edited timestamp is unchanged from the source used for the sync. The GitHub canonical file was then read across its full range and checked section-by-section against the Notion source.

This is a **semantic/content synchronization audit**, not a claim of byte-for-byte equivalence: Notion-only presentation blocks such as the callout and table-of-contents block are represented as ordinary Markdown in GitHub, and the GitHub copy adds a canonical-source banner/link. Those formatting differences do not change implementation requirements.

## Section coverage

All current Notion sections are present in the GitHub canonical copy:

- [x] 1. Cursor Execution Instructions
- [x] 2. Required End-to-End Behavior
- [x] 3. Non-Negotiable Implementation Rules
- [x] 4. Repository Structure and Dependency Boundaries
- [x] 5. Canonical Types and Runtime Schemas
- [x] 6. Executable Semantic Contract
- [x] 7. Contract Scope Firewall and Approval
- [x] 8. Subject Resolution and Obligation Generation
- [x] 9. Observable Framework
- [x] 10. Isolated Counterfactual Twin Runner
- [x] 11. Independent Challenge Lab and Differential Fuzzing
- [x] 12. Counterexamples, Minimization, and Regression Tests
- [x] 13. TypeScript Verification IR and SMT Adapter
- [x] 14. Behavioral Memory and Proof Reuse
- [x] 15. Hybrid Planner, Budgets, and Result Aggregation
- [x] 16. Evidence Passport and Offline Verification
- [x] 17. Repair Lab
- [x] 18. Interaction Sentinel and Merge Composition
- [x] 19. Stateful Rehearsal
- [x] 20. Persistence, Queueing, and Artifact Storage
- [x] 21. API and CLI Contracts
- [x] 22. GitHub Integration
- [x] 23. Web UI — Required Screens and States
- [x] 24. Security, Configuration, and Observability
- [x] 25. Mandatory Fixture and Regression Matrix
- [x] 26. Engineering Benchmark Harness
- [x] 27. Dependency-Ordered Implementation Work Units
- [x] 28. Definition of Done and Final Handoff

## High-risk details explicitly checked

The audit specifically confirmed that the GitHub copy retains the details most likely to become dangerous if omitted:

- `supported` versus `proven` semantics;
- solver `UNKNOWN`/timeout/translation failures cannot become success;
- nonempty-domain/non-vacuity requirements;
- exact base/head/contract/policy/execution binding;
- strict typed predicate AST and no arbitrary `eval`/shell-expression execution;
- contract weakening/scope-firewall review rules;
- trusted policy source separate from code under test;
- explicit unresolved required subjects;
- independent base/head mutable state;
- no silent host-execution fallback;
- challenge-corpus provenance and holdout-disclosure rules;
- validity-preserving witness shrinking and replay;
- JS-semantics soundness boundaries for symbolic verification;
- SAT countermodel replay and translation-mismatch handling;
- case memory separated from formal proof memory;
- contradictory runtime/proof evidence blocks rather than choosing the favorable result;
- Evidence Passport integrity/replay/proof modes;
- signing integrity is not software correctness;
- Repair Lab cannot weaken contract/policy to win;
- actual merge-queue composition verification;
- stateful/PostgreSQL fixtures use disposable branch-local state;
- at-least-once queue semantics and immutable attempt identities;
- CLI exit-code semantics and stdout/stderr separation for `--json`;
- stale GitHub Check/revision handling;
- UI partial/unknown/unsupported/error states;
- cross-tenant, injection, archive, protocol, XSS, sandbox, and signing-key security tests;
- the full mandatory fixture matrix;
- raw-denominator benchmark reporting and separation of proof from empirical support;
- Units A–L and every Section 28 completion gate.

## Structural gaps found and corrected by this audit

The canonical Notion plan names three execution documents under `docs/implementation/`. They were referenced by the GitHub implementation index but did not yet physically exist. This audit adds honest scaffolds for:

- `supported-semantics.md`
- `execution-security.md`
- `local-verification.md`

They intentionally make **no implementation claims**. They exist so later agents have a fixed place to record actual supported semantics, threat-model/isolation evidence, and reproducible verification commands.

## Drift rule

Before any implementation session that depends on the Notion source:

1. fetch the Notion page;
2. compare its `page_last_edited_at` with the timestamp above;
3. if it changed, diff/re-audit the affected content before implementing;
4. update the canonical GitHub copy and this audit record;
5. do not silently mix requirements from different source revisions.

The canonical execution brief remains the implementation source of truth in GitHub after a verified sync.
