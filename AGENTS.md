# AGENTS.md — ChangeGraph Engineering Rules

This repository is designed to be implemented with human and agentic contributors.

Before changing **MVP/core code**, read these files in order:

1. `README.md`
2. `docs/superpowers/specs/2026-09-04-changegraph-design.md`
3. `docs/ARCHITECTURE.md`
4. `docs/superpowers/plans/2026-09-04-changegraph-mvp.md`
5. `docs/ROADMAP.md`
6. `docs/RESEARCH.md`

Before changing **platform expansion code** such as MCP, Copilot agents, ChangeBench, Intent Drift, Minimum Evidence, Marketplace, or remediation, also read:

7. `docs/superpowers/specs/2026-09-04-changegraph-platform-expansion-design.md`
8. `docs/PLATFORM_ARCHITECTURE.md`
9. `docs/PLATFORM_RESEARCH.md`
10. `docs/MARKETPLACE.md`
11. `docs/superpowers/plans/2026-09-04-changegraph-platform-expansion.md`

## Product invariant

ChangeGraph is **change intelligence and safe selective validation**, not a generic AI code-review wrapper.

The evidence pipeline is:

```text
diff
-> semantic changed symbols
-> dependency/impact graph
-> test/validation links
-> historical evidence
-> risk + confidence
-> repository trust
-> intent drift review signal
-> minimum-evidence planner
-> deterministic policy
-> validation
-> optional AI explanation/remediation
-> MCP / GitHub / dashboard projections
```

Do not invert this architecture by asking an LLM which tests to run and then treating its answer as authoritative.

## Safety rules

- Low confidence broadens validation.
- Protected hard fallbacks cannot be disabled by repository configuration.
- LLM output cannot lower risk, raise confidence, raise Trust, suppress fallback, or mark a PR safe to merge.
- Intent text may add review concern but can never lower deterministic risk.
- Minimum Evidence optimization cannot remove mandatory evidence or protected full-suite fallbacks.
- New repositories start in Observe mode.
- Selective CI requires calibration and explicit owner opt-in.
- A serious false-safe event may degrade/suspend repository Trust immediately.
- Untrusted repository code/tests never execute inside the web/API process.
- Agent-generated patches never merge automatically.
- Unknown/dynamic code relationships are recorded as uncertainty, not ignored.
- MCP V1 is read-only by default.
- Repository authorization is verified on every MCP tool call; client-supplied repository IDs are not authorization evidence.
- GitHub Check requested actions are bound to the exact report/head SHA that rendered them.
- Stale remediation requests are rejected rather than replayed against a newer head.

## Engineering rules

- Node.js 24 LTS.
- TypeScript 6 strict mode.
- pnpm 10 workspace.
- Vitest 5 with `test.projects`, not deprecated workspace configuration.
- Next.js stays on a supported security-patched release line specified in the implementation plan.
- Core packages do not import from `apps/web`, `apps/mcp`, or other transport/UI apps.
- Git commands and test runner commands use argument arrays, never shell string interpolation.
- Every externally supplied filename/path/ref/PR URL is untrusted input.
- Every score factor must be inspectable.
- Every selected evidence action must expose one or more evidence reasons.
- Every fallback must expose a reason.
- Every MCP tool has explicit input/output schemas and an access class.
- ChangeBench historical replay always uses an `asOf` cutoff and rejects future evidence.
- Marketplace/privacy/support copy must reflect actual implemented behavior, never boilerplate claims that the code does not satisfy.

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

Do not add these during MVP or early platform expansion unless benchmark evidence and a reviewed design change justify them:

- graph database;
- vector database;
- embeddings for all source files;
- generic chat UI;
- multi-agent orchestration framework;
- custom sandbox runtime;
- custom CI scheduler;
- paid billing/subscriptions;
- broad multi-language support;
- opaque ML risk decisions;
- automatic merge flows.

PostgreSQL plus in-memory per-index traversal is the current graph architecture.

The first Minimum Evidence optimizer is overlap-aware greedy planning. Do not replace it with integer programming, learned optimization, or a black-box solver until ChangeBench demonstrates a measurable limitation.

## MCP / agent tool design

Prefer narrow tools such as:

```text
get_impact_paths
get_relevant_tests
get_risk
get_confidence
minimum_evidence_plan
```

over generic dangerous tools such as:

```text
execute_command
run_sql
run_shell
modify_repository
```

A tool should expose a domain capability, not unrestricted infrastructure.

## ChangeBench rules

ChangeBench exists to falsify ChangeGraph claims, not market them.

- Full-suite failures are ground truth for relevant replay cases.
- Future history is forbidden.
- Synthetic fixtures and real OSS cases are separate cohorts.
- Safety metrics are shown before efficiency metrics.
- Every miss remains inspectable.
- Tool commit/config/dataset versions are recorded.
- Do not omit cases because ChangeGraph performs badly on them unless the exclusion criterion was defined before evaluation and is documented.

## Measured claims only

Values such as 99% failing-test recall, 50% test-count reduction, and 40% wall-clock reduction are **evaluation targets** in the design, not product claims.

Do not put a metric in the README, portfolio, release notes, Marketplace listing, or outreach material unless it comes from a reproducible benchmark run checked into or linked from the project.

## Change procedure for architecture decisions

If implementation reveals that the design is wrong:

1. document the observed evidence;
2. update the relevant design/spec first;
3. update the implementation plan;
4. add/modify tests that express the new invariant;
5. then change implementation.

Do not silently drift away from the documented architecture.

## Definition of a strong ChangeGraph contribution

A strong contribution improves at least one of:

- semantic accuracy;
- failing-test recall;
- test reduction at unchanged safety;
- minimum-evidence cost at unchanged safety;
- analysis latency;
- confidence calibration;
- repository Trust calibration;
- intent-drift usefulness;
- MCP interoperability;
- explainability;
- security/isolation;
- developer experience;
- benchmark quality;
- Marketplace installability/support quality.

More AI-generated code or more features alone is not a success metric.
