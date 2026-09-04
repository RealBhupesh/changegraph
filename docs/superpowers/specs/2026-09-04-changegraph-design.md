# ChangeGraph Design Specification

**Date:** 2026-09-04  
**Status:** Approved product direction, pre-implementation  
**Primary goal:** Build a trustworthy, GitHub-native change-intelligence system that can reduce CI work without hiding uncertainty.

## 1. Product thesis

AI coding agents have dramatically increased the speed and volume of code changes, but validation remains largely repository-wide and binary: run everything, or rely on coarse project-level affected logic. ChangeGraph should become the intelligence layer between a code change and the validation work that change requires.

For every pull request, ChangeGraph answers:

1. **What changed?** Files, symbols, exported APIs, configuration, tests, migrations, and infrastructure.
2. **What can be affected?** Direct callers, transitive dependents, routes, jobs, packages, services, and tests.
3. **What evidence do we have?** Static dependency paths, dynamic coverage, Git co-change history, test-failure history, and repository policy.
4. **How risky is the change?** A deterministic, decomposable score rather than an opaque LLM judgment.
5. **What validation is necessary?** A ranked test plan plus safety fallbacks.
6. **Can we remediate safely?** Later, a coding agent may create a candidate regression test or patch in an isolated environment.

The product is deliberately **not** an “LLM reviews your PR” wrapper. The core graph and safety decision must remain useful even if no model API is configured.

---

## 2. Target users

### Persona A — Individual developer

Needs fast feedback on pull requests and wants to know which tests actually matter. Values local reproducibility and clear explanations.

### Persona B — Platform / DevEx engineer

Owns CI cost, reliability, test duration, and developer velocity. Needs policy controls, auditability, metrics, and safe rollout.

### Persona C — Open-source maintainer

Receives changes from contributors and agents with uneven repository knowledge. Needs fast risk triage and evidence-backed validation.

### Persona D — AI coding-agent operator

Runs coding agents that can modify unfamiliar repositories. Needs a machine-readable impact report and isolated verification/remediation workflow.

---

## 3. Jobs to be done

- “When a PR opens, show me the blast radius before I review every file.”
- “Tell me which tests matter and why.”
- “Reduce CI time without increasing escaped regressions.”
- “Show me when your analysis is incomplete instead of pretending certainty.”
- “Give reviewers a compact GitHub-native risk summary.”
- “Let my coding agent use the same change intelligence that a human reviewer sees.”
- “If a regression gap is obvious, let an agent propose coverage without giving it unrestricted machine access.”

---

## 4. Product principles

### 4.1 Evidence before language models

The deterministic evidence pipeline is:

`diff -> changed symbols -> dependency graph -> affected entities -> test links -> history -> policy`

LLMs consume this evidence to summarize or propose fixes. They cannot replace the pipeline.

### 4.2 Fail open to safety, not optimization

If ChangeGraph is uncertain, it runs or recommends the full suite. Performance optimization is optional; correctness is not.

### 4.3 Every score must be explainable

A reviewer must be able to inspect why a test was selected or why risk increased. “The model thinks so” is not acceptable evidence.

### 4.4 Progressive trust

Repositories move through three trust levels:

1. **Observe** — analyze while existing CI remains authoritative.
2. **Recommend** — publish test selections and expected savings, still run full CI.
3. **Optimize** — allow ChangeGraph to execute only the selected set when policy permits.

### 4.5 Local and hosted workflows share the same core

The analysis engine should be usable by a CLI and the hosted GitHub App. This makes debugging, open-source adoption, and deterministic testing much easier.

### 4.6 Language adapters, not language conditionals everywhere

V1 supports TypeScript/JavaScript deeply. Parser, resolver, test-discovery, and runtime integrations live behind explicit adapters so Python/pytest and SCIP/Tree-sitter based ecosystems can be added later.

---

## 5. Scope

### V1 supported repositories

- TypeScript and JavaScript
- ESM-first projects
- npm, pnpm, or yarn lockfiles
- Vitest 5 and Jest
- GitHub repositories
- GitHub Actions-compatible execution

### V1 repository shapes

- single-package applications;
- workspaces/monorepos where package relationships can be resolved;
- Next.js, Node.js, library, and common React projects;
- repositories with static and dynamic imports that the TypeScript compiler can resolve.

### Deliberate V1 non-goals

- replacing the user's CI provider;
- automatically merging AI-generated changes;
- claiming sound whole-program call graphs for arbitrary dynamic JavaScript;
- supporting every language;
- using embeddings as the primary dependency model;
- building a custom container runtime;
- guaranteeing that a selected test subset is mathematically complete for unsupported dynamic behavior.

---

# 6. Complete feature set

## F1. GitHub App installation and onboarding

### Required capabilities

- Install ChangeGraph on selected repositories.
- Request minimal permissions:
  - repository contents: read;
  - pull requests: read;
  - checks: write;
  - metadata: read;
  - actions: read only when importing workflow/test evidence;
  - issues/pull-request comments: write only if comments are enabled.
- Subscribe to pull request, push/check-suite, installation, and installation-repository events required by enabled features.
- Verify webhook signatures before processing.
- Store installation IDs and repository configuration, never long-lived installation access tokens.
- Provide an onboarding wizard that detects:
  - package manager;
  - workspace structure;
  - TypeScript configs;
  - test framework;
  - existing GitHub Actions workflows;
  - approximate test count;
  - unsupported configuration.

### Onboarding output

```text
Repository readiness

Parser              Supported
Test framework       Vitest
Workspace graph      Supported
GitHub Checks        Ready
Historical data      0 runs
Selective CI         Locked: shadow calibration required
```

No new repository may enter Optimize mode immediately.

---

## F2. Pull-request ingestion

On `pull_request.opened`, `synchronize`, `reopened`, or relevant manual re-run:

1. Resolve installation credentials.
2. Record repository, PR number, base SHA, head SHA, and delivery ID.
3. Deduplicate webhook deliveries.
4. Fetch changed-file metadata and patches.
5. If patches are truncated, fetch blobs and compute the diff locally.
6. Classify file changes before deeper analysis.
7. Publish an in-progress GitHub check quickly so users know analysis started.

### File classes

- source;
- test;
- generated;
- dependency lockfile;
- package manifest;
- build configuration;
- test-runner configuration;
- CI configuration;
- database migration/schema;
- infrastructure;
- documentation;
- unknown.

File class influences safety policy.

---

## F3. Repository indexing

The indexer creates a normalized graph from the checked-out head revision.

### V1 entities

- Repository
- Package / workspace
- File
- Module
- Symbol
  - function;
  - class;
  - method;
  - variable with callable/object export relevance;
  - interface/type when it affects public API;
- Route / endpoint where detectable
- Test file
- Test case
- CI task

### V1 edges

- `CONTAINS`
- `IMPORTS`
- `EXPORTS`
- `REEXPORTS`
- `CALLS` where statically resolvable
- `REFERENCES`
- `IMPLEMENTS`
- `EXTENDS`
- `ROUTE_USES`
- `TESTS`
- `DEPENDS_ON_PACKAGE`

Each edge stores:

- source node;
- target node;
- edge type;
- resolver confidence;
- source location;
- indexer version.

### Index strategy

Use the TypeScript Compiler API for V1 because it gives module resolution and symbol/type information for the language we are optimizing first. Later adapters may consume SCIP or Tree-sitter indexes.

### Incrementality

Index by file content hash. Reuse unchanged file analysis between commits. Re-resolve only changed modules and dependents whose import/export surface changes.

---

## F4. Changed-symbol detection

A raw line diff is insufficient. ChangeGraph maps changed ranges to semantic entities.

For each changed source file:

1. Parse base and head versions.
2. Map changed line ranges to the smallest containing symbols.
3. Detect added, removed, renamed, signature-changed, and body-changed symbols.
4. Detect exported API changes separately from internal implementation changes.
5. Detect import/export changes.
6. Mark unknown/unmappable lines as file-level changes.

### Change classes

- implementation-only;
- signature/API;
- dependency/import;
- control-flow significant;
- configuration;
- schema/migration;
- test-only;
- deletion;
- broad/unknown.

A file-level unknown change increases uncertainty and may force fallback.

---

## F5. Impact graph

For each changed node, traverse reverse dependency edges to discover potentially affected nodes.

### Traversal rules

- Distance 0: changed symbol itself.
- Distance 1: direct callers/references/importers.
- Continue transitively until:
  - configured maximum depth;
  - package/application boundary policy;
  - no new nodes;
  - node budget safety limit.
- Public API/signature changes receive deeper traversal than private body changes.
- Unknown dynamic imports or resolver failures add confidence penalties.

### Impact evidence

Each affected node carries at least one evidence path:

```text
refreshSession
  <- AuthService.refresh
  <- authMiddleware
  <- /dashboard route
  <- dashboard-auth.test.ts
```

The UI must expose this path.

---

## F6. Test discovery and test graph

### Test discovery

V1 adapters support:

- Vitest;
- Jest.

Discover:

- test files;
- named tests where reliably extractable;
- setup files;
- global setup;
- shared fixtures;
- test projects/configs;
- commands needed to run a file subset.

### Linking tests to production code

A test can be linked by one or more of:

1. direct static import;
2. transitive static dependency path;
3. dynamic coverage observation;
4. historical co-failure/co-change signal;
5. framework convention / path affinity.

Every link stores its provenance.

---

## F7. Historical intelligence

ChangeGraph becomes more precise as it observes CI.

Store per run:

- commit SHA;
- changed files;
- selected/full test set;
- per-test result;
- test duration;
- flaky retry state;
- runtime environment fingerprint;
- failure signature;
- ChangeGraph version;
- whether the run was shadow/full/selective.

### Historical signals

For test `t` and changed file/symbol `c`:

- number of runs where `c` changed;
- number of those runs where `t` failed;
- recent weighting;
- co-change frequency;
- average test duration;
- flake rate.

Use Bayesian smoothing so tiny sample counts do not dominate:

`historyFailure(c,t) = (coFailures + 1) / (coChangeRuns + 4)`

This is a ranking signal, not a proof of independence.

---

## F8. Test-priority score

For each candidate test `t`:

- `S_static`: strongest normalized graph relation to any changed symbol;
- `S_history`: historical failure correlation;
- `S_coverage`: dynamic coverage linkage when available;
- `S_path`: file/package/path affinity.

Initial deterministic score:

`priority(t) = 0.45*S_static + 0.25*S_history + 0.20*S_coverage + 0.10*S_path`

### Static score

For shortest dependency distance `d`:

`S_static = 1 / (1 + d)`

A direct test import or explicit coverage edge may be promoted to `1.0`.

### Selection order

1. mandatory policy/sentinel tests;
2. direct static/coverage-linked tests;
3. remaining tests descending by priority;
4. exploration sample in calibration mode.

Weights are versioned and measured against benchmark data. They are not silently changed in production.

---

## F9. PR risk score

Risk measures **blast radius and validation need**, not code quality.

Normalized features:

- `R_criticality` — auth/payment/security/migration/configuration or repository-configured critical paths;
- `R_fanout` — normalized affected-node fan-out;
- `R_api` — public API/signature/schema surface change;
- `R_change` — normalized change magnitude and deletion ratio;
- `R_gap` — lack of strong tests for affected critical paths;
- `R_instability` — historical failure/flake signal around affected areas.

Initial score:

`risk = 100 * (0.25*R_criticality + 0.20*R_fanout + 0.15*R_api + 0.10*R_change + 0.20*R_gap + 0.10*R_instability)`

### Bands

- 0–29: Low
- 30–59: Medium
- 60–79: High
- 80–100: Critical

The GitHub Check shows both the total and factor breakdown.

---

## F10. Analysis-confidence score

Confidence answers: “How much of this repository and change do we actually understand?”

Features:

- `C_index` — percentage of relevant source files successfully parsed;
- `C_resolution` — percentage of relevant imports/references resolved;
- `C_tests` — test-discovery and mapping completeness;
- `C_history` — usable historical depth;
- `C_runner` — certainty that selected tests can be invoked correctly.

Initial score:

`confidence = 0.30*C_index + 0.25*C_resolution + 0.20*C_tests + 0.10*C_history + 0.15*C_runner`

History may be low for a new repository without preventing advisory analysis. Selective CI has stricter policy.

### Confidence bands

- `>= 0.85`: eligible for selective execution if no hard fallback trigger exists;
- `0.75–0.849`: recommend selection but execute full suite or selected + mandatory validation according to repository policy;
- `< 0.75`: full-suite fallback.

---

## F11. Hard fallback policy

Regardless of score, V1 defaults to full suite when any of the following change unless the repository explicitly defines a safe exception:

- package-manager lockfile;
- root package manifest dependency set;
- TypeScript compiler configuration affecting resolution;
- Vitest/Jest configuration;
- global test setup;
- GitHub Actions workflow that controls tests;
- database schema or migration;
- infrastructure/deployment configuration;
- authentication/security policy files marked critical;
- more than 20% of indexed source files;
- parser/indexer failure on more than 2% of relevant changed/dependent files;
- unresolved imports exceed 5% of affected graph edges;
- dynamic code generation/eval prevents useful static reasoning;
- repository adapter/version is unsupported.

A fallback is a successful safety behavior, not an analysis failure.

---

## F12. Shadow calibration mode

Every repository starts in shadow mode.

ChangeGraph predicts the subset it would run, but existing full CI still executes. After the run, it asks:

- Would every failing test have been selected?
- What percentage of tests would have been skipped?
- How much runtime would have been saved?
- Which failures were missed and why?

### Promotion gate to Optimize mode

Default recommendation requires:

- at least 50 comparable full-suite runs;
- >= 99% failing-test recall on supported changes;
- no unresolved systematic miss class;
- repository owner opt-in.

The number of calibration runs is configurable but never silently bypassed.

---

## F13. Exploration sampling

Historical systems can become overconfident if they never run tests they believe are irrelevant.

During shadow/recommend mode, ChangeGraph samples a small percentage of low-ranked tests. In Optimize mode, repositories may optionally enable a low-frequency audit run or random exploration budget.

Any discovered miss:

1. records a false-negative event;
2. links the missed test to the change;
3. reduces confidence for similar future changes;
4. can temporarily demote the repository back to Recommend mode.

---

## F14. Selective test execution

### Runner interface

Each test adapter must expose:

```ts
interface TestRunnerAdapter {
  discover(context: RepoContext): Promise<TestInventory>;
  commandFor(selection: TestSelection): Promise<RunnerCommand>;
  parseResults(result: ProcessResult): Promise<TestRunResult>;
}
```

### V1 execution

- Generate a concrete list of test files/cases.
- Execute in an isolated CI job/container.
- Record durations and results.
- Never shell-interpolate untrusted repository paths.
- Enforce time/memory/output limits.
- Publish full provenance of what was and was not executed.

---

## F15. Sentinel tests

Repositories may mark tests as always-run:

- smoke tests;
- security/authentication tests;
- contract tests;
- critical API tests;
- fast global health checks.

Sentinels are included before score-based selection.

Configuration example:

```yaml
version: 1
mode: recommend
sentinels:
  - tests/smoke/**
  - tests/auth/critical/**
critical_paths:
  - src/auth/**
  - src/payments/**
```

---

## F16. GitHub Check experience

Use a GitHub App check run as the primary surface.

### Summary

```text
ChangeGraph
Risk: High (72/100) · Confidence: 91%
Selected 41 of 387 tests · estimated 79% test reduction
```

### Sections

- Change summary
- Impacted systems
- Risk-factor breakdown
- Selected tests + reasons
- Tests skipped
- Safety/fallback decisions
- Expected/actual CI savings
- Missing coverage warnings

### Annotations

Where evidence maps to a changed line, annotate:

- public API break risk;
- changed critical path without strong test linkage;
- dependency fan-out hotspot;
- missing regression coverage.

### Requested actions

Later versions can expose actions such as:

- “Run full suite”
- “Re-analyze”
- “Generate regression test in sandbox”

---

## F17. ChangeGraph dashboard

### Repository overview

- current trust mode;
- index health;
- average confidence;
- median tests skipped;
- median CI time saved;
- false-negative audit history;
- fallback-rate trend;
- top flaky tests;
- high-fanout/high-risk code areas.

### Pull-request detail

- interactive impact graph;
- changed symbols;
- affected paths;
- risk factors;
- confidence factors;
- selected/skipped tests;
- full vs selective comparison;
- LLM explanation;
- audit trail.

### Graph UX

Users can:

- focus on one changed symbol;
- expand callers/dependents;
- show only test paths;
- color nodes by risk/coverage;
- inspect edge provenance;
- switch between static, history, and combined evidence.

---

## F18. AI explanation layer

The LLM receives a structured evidence packet, not the whole repository by default.

### Allowed tasks

- summarize blast radius;
- translate graph paths into reviewer-friendly prose;
- identify likely missing test scenarios from evidence;
- generate a suggested review checklist;
- propose candidate regression tests;
- later, propose code fixes in a sandbox.

### Prohibited authority

LLM output may not:

- lower deterministic risk;
- raise confidence;
- suppress hard fallback triggers;
- mark a PR safe to merge;
- directly merge changes.

### Structured output

Every explanation item carries evidence IDs so the UI can link prose back to graph/history facts.

---

## F19. Isolated agent remediation

This is post-MVP.

### Trigger

A user explicitly chooses “Generate regression test” or “Attempt fix.”

### Workflow

1. Create an isolated sandbox.
2. Clone exact repository/head SHA.
3. Provide the agent only the issue/evidence packet plus repository access inside the sandbox.
4. Restrict outbound network according to policy.
5. Let the agent modify files.
6. Run ChangeGraph-selected tests plus mandatory validation.
7. Show patch, test results, and sandbox logs.
8. User may choose to create a branch/PR.

### Invariants

- no host filesystem access;
- no automatic merge;
- no production secrets;
- explicit credential broker for any necessary Git access;
- network allowlist support;
- sandbox destroyed or archived according to policy after completion.

Docker Sandboxes are a natural optional backend because current Docker tooling supports microVM-isolated coding agents with separate filesystem, network, and Docker daemon.

---

## F20. Local CLI

The CLI makes the core engine testable without the hosted app.

Commands:

```text
changegraph index
changegraph analyze --base <sha> --head <sha>
changegraph tests --base <sha> --head <sha>
changegraph explain --report .changegraph/report.json
changegraph benchmark --base <sha> --head <sha>
```

Output formats:

- human terminal;
- JSON;
- SARIF-compatible future export where appropriate;
- GitHub check payload internal format.

---

## F21. Repository policy file

`.changegraph.yml` controls repository-specific safety behavior.

```yaml
version: 1
mode: observe

analysis:
  max_dependency_depth: 8
  max_affected_nodes: 25000

selective_ci:
  min_confidence: 0.85
  max_changed_source_ratio: 0.20
  exploration_rate: 0.05

sentinels:
  - tests/smoke/**

critical_paths:
  - src/auth/**
  - src/payments/**

fallback_on:
  - package-lock.json
  - pnpm-lock.yaml
  - .github/workflows/**
  - "**/vitest.config.*"
  - "**/jest.config.*"
```

Unknown keys fail validation rather than being silently ignored.

---

## F22. Benchmark and evaluation harness

ChangeGraph must prove it is safe and useful.

### Evaluation strategy

For historical commits/PRs with known full-suite results:

1. Reconstruct base/head diff.
2. Run ChangeGraph selection using only information available before the target run.
3. Compare selected set against actual failing tests.
4. Measure test-count and duration reduction.
5. Record misses, fallback decisions, and confidence calibration.

### Primary metrics

- failing-test recall;
- false-safe rate;
- test-count reduction;
- wall-clock reduction;
- fallback rate;
- precision of high-risk warnings;
- analysis latency;
- index latency;
- cache hit rate.

### Evaluation targets

- >= 99% failing-test recall for supported change classes;
- <= 0.5% false-safe rate in protected evaluation;
- >= 50% median test-count reduction on safe PRs;
- >= 40% median wall-clock reduction where tests dominate CI;
- 100% fallback for known hard-fallback classes.

These are targets for product validation, not pre-existing results.

---

## F23. Observability

Instrument with OpenTelemetry.

### Traces

- webhook processing;
- GitHub API fetches;
- checkout/indexing;
- diff-to-symbol mapping;
- graph traversal;
- test ranking;
- runner execution;
- GitHub check publication;
- model call;
- sandbox lifecycle.

### Metrics

- analysis duration;
- index duration;
- graph node/edge counts;
- parse failure ratio;
- resolver failure ratio;
- tests selected/full;
- predicted/actual duration saved;
- fallback reasons;
- webhook retries;
- GitHub API rate-limit consumption;
- model token/cost usage;
- false-negative audit events.

Logs contain IDs and structured metadata, never full source by default.

---

## F24. Security and privacy

### Source handling

- Do not persist full repository contents by default.
- Persist normalized graph facts and hashes needed for incremental analysis.
- Allow self-host/local-only indexing in future enterprise mode.
- Encrypt stored credentials and installation metadata at rest.
- Never log webhook secrets, installation tokens, repository secrets, or model API keys.

### Webhooks

- validate signature;
- enforce body-size limits;
- deduplicate delivery IDs;
- reject stale/replayed deliveries according to configured window;
- rate-limit per installation.

### Untrusted repository execution

Repository tests are arbitrary code. Hosted execution therefore requires isolation, resource limits, network policy, and no shared long-lived credentials.

---

## F25. Resilience and failure handling

Every analysis has a terminal state:

- `completed_selective`
- `completed_full_fallback`
- `completed_advisory`
- `failed_external`
- `failed_internal`
- `cancelled_superseded`

When a new commit lands on a PR, older in-flight analysis may be cancelled/superseded.

External failures such as GitHub rate limits, checkout failures, or model outages must not produce “safe” status. Deterministic analysis may still complete without the model layer.

---

# 7. Data model

Core relational tables:

### `github_installations`

- `id`
- `github_installation_id`
- `account_login`
- `created_at`

### `repositories`

- `id`
- `installation_id`
- `github_repository_id`
- `owner`
- `name`
- `default_branch`
- `mode`
- `config_hash`

### `repository_indexes`

- `id`
- `repository_id`
- `commit_sha`
- `indexer_version`
- `status`
- `parse_success_ratio`
- `resolution_success_ratio`
- `created_at`

### `graph_nodes`

- `id`
- `index_id`
- `stable_key`
- `kind`
- `file_path`
- `symbol_name`
- `start_line`
- `end_line`
- `content_hash`

### `graph_edges`

- `id`
- `index_id`
- `source_node_id`
- `target_node_id`
- `kind`
- `confidence`
- `source_line`

### `pull_request_analyses`

- `id`
- `repository_id`
- `pull_number`
- `base_sha`
- `head_sha`
- `status`
- `risk_score`
- `confidence_score`
- `fallback_reason`
- `created_at`
- `completed_at`

### `impact_paths`

- `analysis_id`
- `changed_node_id`
- `affected_node_id`
- `distance`
- `path_json`

### `test_cases`

- `id`
- `repository_id`
- `stable_key`
- `file_path`
- `name`
- `framework`

### `test_links`

- `analysis_id`
- `test_case_id`
- `node_id`
- `provenance`
- `score`

### `test_runs`

- `id`
- `analysis_id`
- `mode`
- `started_at`
- `completed_at`
- `duration_ms`

### `test_results`

- `test_run_id`
- `test_case_id`
- `status`
- `duration_ms`
- `failure_signature_hash`

### `audit_events`

- `repository_id`
- `analysis_id`
- `kind`
- `severity`
- `payload_json`
- `created_at`

---

# 8. Service boundaries

The initial codebase is a TypeScript monorepo with focused packages.

```text
apps/
  web/                 Next.js dashboard + hosted API surface
  worker/              background analysis jobs
  cli/                 local ChangeGraph CLI

packages/
  github/              GitHub auth/webhooks/check publishing
  repo/                checkout/worktree abstraction
  indexer-ts/          TypeScript/JavaScript indexer
  graph/               graph model + traversal
  diff/                changed-file/symbol detection
  test-vitest/         Vitest discovery/execution adapter
  test-jest/           Jest discovery/execution adapter
  scoring/             risk/confidence/test priority
  policy/              fallback + trust-mode rules
  history/             historical statistics
  report/              stable analysis report schema
  llm/                 optional explanation adapters
  telemetry/           OpenTelemetry setup
  db/                  schema/repositories
```

Packages expose explicit interfaces and do not import application UI code.

---

# 9. Canonical analysis report

All surfaces consume one versioned report schema.

```ts
interface ChangeGraphReportV1 {
  schemaVersion: 1;
  repository: { owner: string; name: string };
  pullRequest: { number: number; baseSha: string; headSha: string };
  risk: RiskAssessment;
  confidence: ConfidenceAssessment;
  changes: ChangedEntity[];
  impacts: ImpactEntity[];
  tests: TestPlan;
  policy: PolicyDecision;
  savings?: SavingsEstimate;
  evidence: EvidenceRecord[];
}
```

The GitHub Check, dashboard, CLI JSON, LLM prompt, and benchmark harness all read this same structure.

---

# 10. Rollout sequence

1. Deterministic local diff + symbol graph.
2. Local test selection with fixtures.
3. GitHub App advisory check.
4. Persistent history + benchmark harness.
5. Shadow mode on real repositories.
6. Confidence calibration and selective execution.
7. Dashboard + interactive impact graph.
8. LLM evidence explanations.
9. Isolated remediation agent.
10. Additional language/test adapters.

The roadmap document defines exit criteria for each stage.

---

# 11. Product differentiation

ChangeGraph intentionally combines ideas that currently exist separately:

- **Nx-style affected graphs:** deterministic graph-aware reduction, but ChangeGraph targets symbol/test-level evidence rather than only project/task scope.
- **Predictive test selection:** historical correlation and duration-aware ranking, but bounded by explicit deterministic safety policy.
- **GitHub Checks:** native reviewer surface with line-level annotations and re-run actions.
- **Code-intelligence indexes:** language-aware symbol/reference relationships that can later be generalized through SCIP or other adapters.
- **Agent sandboxes:** optional remediation after impact analysis, never the core source of truth.

The differentiator is the unified evidence model and progressive-trust safety system.

---

# 12. Definition of MVP

The MVP is complete only when a developer can:

1. install ChangeGraph on a TypeScript repository;
2. open/update a PR;
3. see changed symbols and an impact graph;
4. receive a ranked Vitest/Jest test recommendation;
5. see deterministic risk and confidence explanations;
6. receive a GitHub Check with reasons and fallback decision;
7. run benchmark mode comparing prediction to a full suite;
8. see measured test-count/runtime savings;
9. observe full-suite fallback on unsafe change classes;
10. use the same analysis locally through the CLI.

Agent remediation is explicitly post-MVP.

---

# 13. Research basis

This specification is informed by current first-party documentation for:

- GitHub Apps, webhooks, and Checks API;
- GitHub Copilot coding-agent workflows;
- Docker Sandboxes for isolated coding agents;
- Nx affected/project graph behavior;
- Launchable predictive test selection concepts;
- Sourcegraph SCIP/indexer architecture;
- OpenTelemetry instrumentation;
- current Node.js, Next.js, TypeScript, and Vitest release lines.

See `docs/RESEARCH.md` for links, observations, and design consequences.
