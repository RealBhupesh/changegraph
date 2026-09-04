# AGENTS.md — ChangeGraph Engineering Rules

This repository is designed to be implemented with human and agentic contributors. Before changing code, read these files in order:

1. `README.md`
2. `docs/superpowers/specs/2026-09-04-changegraph-design.md`
3. `docs/ARCHITECTURE.md`
4. `docs/superpowers/plans/2026-09-04-changegraph-mvp.md`
5. `docs/ROADMAP.md`
6. `docs/RESEARCH.md`

## Product invariant

ChangeGraph is **change intelligence and safe selective CI**, not a generic AI code-review wrapper.

The evidence pipeline is:

```text
diff
-> semantic changed symbols
-> dependency/impact graph
-> test links
-> historical evidence
-> risk + confidence
-> deterministic policy
-> validation
-> optional AI explanation/remediation
```

Do not invert this architecture by asking an LLM which tests to run and then treating its answer as authoritative.

## Safety rules

- Low confidence broadens validation.
- Protected hard fallbacks cannot be disabled by repository configuration.
- LLM output cannot lower risk, raise confidence, suppress fallback, or mark a PR safe to merge.
- New repositories start in Observe mode.
- Selective CI requires calibration and explicit owner opt-in.
- Untrusted repository code/tests never execute inside the web/API process.
- Agent-generated patches never merge automatically.
- Unknown/dynamic code relationships are recorded as uncertainty, not ignored.

## Engineering rules

- Node.js 24 LTS.
- TypeScript 6 strict mode.
- pnpm 10 workspace.
- Vitest 5 with `test.projects`, not deprecated workspace configuration.
- Next.js stays on a supported security-patched release line specified in the implementation plan.
- Core packages do not import from `apps/web`.
- Git commands and test runner commands use argument arrays, never shell string interpolation.
- Every externally supplied filename/path/ref is untrusted input.
- Every score factor must be inspectable.
- Every selected test must expose one or more evidence reasons.
- Every fallback must expose a reason.

## TDD workflow

For each implementation-plan task:

1. write the smallest failing test for the behavior;
2. run the exact test and confirm failure for the intended reason;
3. implement the minimum behavior;
4. run the focused test;
5. run the package test suite;
6. run typecheck;
7. commit one reviewable unit.

Do not batch unrelated plan tasks into one giant commit.

## Architecture restraint

Do not add these during MVP unless benchmark evidence and a reviewed design change justify them:

- graph database;
- vector database;
- embeddings for all source files;
- generic chat UI;
- multi-agent orchestration framework;
- custom sandbox runtime;
- custom CI scheduler;
- billing/subscriptions;
- broad multi-language support.

PostgreSQL plus in-memory per-index traversal is the current graph architecture.

## Measured claims only

Values such as 99% failing-test recall, 50% test-count reduction, and 40% wall-clock reduction are **evaluation targets** in the design, not product claims.

Do not put a metric in the README, portfolio, release notes, or outreach material unless it comes from a reproducible benchmark run checked into or linked from the project.

## Change procedure for architecture decisions

If implementation reveals that the design is wrong:

1. document the observed evidence;
2. update the design/spec first;
3. update the implementation plan;
4. add/modify tests that express the new invariant;
5. then change implementation.

Do not silently drift away from the documented architecture.

## Definition of a strong ChangeGraph contribution

A strong contribution improves at least one of:

- semantic accuracy;
- failing-test recall;
- test reduction at unchanged safety;
- analysis latency;
- confidence calibration;
- explainability;
- security/isolation;
- developer experience;
- benchmark quality.

More AI-generated code or more features alone is not a success metric.
