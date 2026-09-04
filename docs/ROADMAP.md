# ChangeGraph Product Roadmap

This roadmap is ordered by **risk reduction and proof**, not by visual appeal. Each milestone must produce independently testable software and measurable evidence before the next trust level is unlocked.

No milestone has a calendar estimate here. Progress is determined by exit criteria.

---

# Milestone 0 — Foundation and benchmark fixtures

## Goal

Create a deterministic development environment and a set of small repositories where ChangeGraph's analysis can be proven exactly.

## Deliverables

- pnpm TypeScript monorepo;
- Node 24 LTS runtime baseline;
- TypeScript 6 strict configuration;
- Vitest 5 test suite;
- fixture repositories covering:
  - direct import;
  - transitive dependency;
  - public API/signature change;
  - monorepo package dependency;
  - unresolved dynamic import;
  - test-only change;
  - lockfile/config fallback;
  - deliberately missed relationship;
- canonical versioned report schema;
- CLI skeleton that can read a base/head pair from a local Git repository.

## Exit criteria

- CI passes from a clean clone.
- Fixture expectations are committed as explicit JSON snapshots.
- Report schema validates invalid/valid fixtures deterministically.
- No GitHub or LLM dependency is required to run the core test suite.

---

# Milestone 1 — Semantic diff and TypeScript repository graph

## Goal

Turn a TypeScript/JavaScript repository into an explainable semantic graph and map a Git diff onto changed symbols.

## Features

- tsconfig discovery;
- TypeScript Compiler API program construction;
- file/module/symbol nodes;
- import/export/re-export edges;
- resolvable references/calls;
- stable symbol keys;
- parse/resolution health metrics;
- base/head changed-symbol detection;
- exported API/signature change detection;
- file-level uncertainty fallback;
- incremental file hash cache.

## Exit criteria

- Every fixture change maps to the expected changed entity.
- Direct/transitive dependency paths are reproducible.
- Unresolvable dynamic behavior is surfaced as uncertainty rather than ignored.
- Index reports parse and resolution success ratios.

---

# Milestone 2 — Impact engine and explainable blast radius

## Goal

Produce useful answers to “what can this change affect?” before any test-selection logic exists.

## Features

- reverse dependency traversal;
- weighted edge costs;
- max depth/node budgets;
- multiple evidence paths per impacted node;
- package/route/file impact summaries;
- fan-out metrics;
- Graph JSON export;
- local CLI output;
- deterministic risk factors that do not require history.

## Exit criteria

- Fixture PRs return the expected affected nodes.
- Every impacted entity has at least one inspectable evidence path.
- Budget overflow explicitly lowers confidence and forces the appropriate policy result.
- No LLM is needed to explain graph provenance.

---

# Milestone 3 — Test discovery and ranking

## Goal

Map impacted code to the tests most relevant to the change.

## Features

- shared test-adapter interface;
- Vitest discovery;
- Jest discovery;
- setup/config discovery;
- static test dependency mapping;
- test cases/file inventory;
- path affinity;
- sentinel tests;
- initial priority formula;
- selection reasons;
- safe runner command construction.

## Exit criteria

- Directly linked tests rank above unrelated tests.
- Transitive affected tests are selected in fixtures.
- Sentinel tests are always selected.
- Runner commands never rely on unescaped shell string composition.
- Test runner config changes trigger full-suite fallback.

---

# Milestone 4 — Risk, confidence, and policy engine

## Goal

Make uncertainty explicit and create the trust/safety system that prevents optimization from outrunning understanding.

## Features

- normalized risk factors;
- normalized confidence factors;
- versioned scoring models;
- hard fallback rules;
- `.changegraph.yml` schema;
- Observe/Recommend/Optimize modes;
- explainable execution decision;
- protected non-overridable fallbacks;
- deterministic policy unit-test matrix.

## Exit criteria

- Every hard-fallback fixture returns `full-fallback`.
- Low-confidence analysis cannot return selective execution.
- Configuration may make policy stricter but cannot disable protected safety rules.
- Risk and confidence reports expose factor breakdowns.

---

# Milestone 5 — GitHub-native advisory product

## Goal

Turn the local analysis engine into something a real maintainer can install and see on a pull request.

## Features

- GitHub App registration guide/config;
- installation persistence;
- webhook signature verification;
- delivery deduplication;
- pull-request event handling;
- installation-token exchange;
- changed-file/patch retrieval;
- background job queue;
- in-progress/completed Check runs;
- GitHub Check summary;
- line-level annotations where evidence maps cleanly;
- re-analysis support;
- superseded head cancellation.

## Product mode

**Observe/Advisory only.** Existing CI remains authoritative.

## Exit criteria

- Installing the app on a test repository creates an advisory check on PR open/update.
- Duplicate webhook delivery does not create duplicate analysis.
- New PR commits supersede older in-flight analyses.
- GitHub API/model outage can never produce a false green safety result.

---

# Milestone 6 — Historical intelligence and shadow calibration

## Goal

Measure whether ChangeGraph would have selected every failing test while existing full CI continues to run.

## Features

- test result ingestion;
- per-test duration history;
- weighted co-change/co-failure statistics;
- Bayesian smoothing;
- failure signature hashes;
- flake tracking;
- historical test-priority signal;
- shadow counterfactual report;
- false-negative event taxonomy;
- exploration sampling;
- calibration dashboard.

## Exit criteria

On benchmark repositories and supported change classes:

- failing-test recall is measurable;
- test-count/runtime reduction is measurable;
- every miss is categorized;
- the repository cannot promote itself automatically to Optimize mode;
- history updates do not make past reports irreproducible because model versions are persisted.

---

# Milestone 7 — Selective CI execution

## Goal

Execute reduced validation only after ChangeGraph has earned enough repository-specific trust.

## Features

- isolated test-execution job;
- resource/time/output limits;
- concrete Vitest/Jest subset execution;
- execution provenance;
- actual vs estimated savings;
- fallback to full suite;
- user-requested full-suite override;
- audit run support;
- repository promotion gate;
- automatic demotion after serious false-negative audit findings.

## Exit criteria

Before any repository is considered proven for Optimize mode, the default recommendation requires:

- at least 50 comparable calibration runs;
- >= 99% failing-test recall on supported change classes;
- no unresolved systematic miss class;
- explicit repository-owner opt-in.

Project-wide benchmark target:

- >= 50% median test-count reduction on safe PRs;
- >= 40% median wall-clock reduction where test execution dominates CI;
- <= 0.5% protected false-safe rate;
- 100% fallback on known hard-fallback classes.

These remain evaluation targets until measured.

---

# Milestone 8 — ChangeGraph dashboard and interactive graph

## Goal

Make the evidence model visually impressive and genuinely useful for debugging trust decisions.

## Features

### Repository page

- trust mode;
- index health;
- confidence trend;
- fallback reasons;
- test-count savings;
- runtime savings;
- false-negative audit events;
- flaky test ranking;
- high fan-out code hotspots.

### Pull-request page

- changed symbols;
- risk/confidence cards;
- interactive impact graph;
- test paths;
- selected/skipped tests;
- evidence drawer;
- full-vs-selective comparison;
- analysis timeline.

### Graph interaction

- focus one changed symbol;
- expand callers/dependents;
- show only paths to tests;
- filter evidence by static/history/coverage;
- inspect edge provenance;
- cap initial rendered nodes and lazy-expand large graphs.

## Exit criteria

A reviewer can answer “why did ChangeGraph select this test?” without reading raw JSON or server logs.

---

# Milestone 9 — Evidence-linked AI explanations

## Goal

Use LLMs to make deterministic evidence easier to consume without granting them safety authority.

## Features

- provider-neutral explanation interface;
- structured evidence packet;
- evidence-ID constrained response schema;
- reviewer summary;
- suggested missing test scenarios;
- review checklist generation;
- prompt injection defenses through data/command separation;
- cost/token telemetry;
- no-model fallback.

## Exit criteria

- ChangeGraph remains fully functional with model access disabled.
- Every AI finding references valid evidence IDs.
- Invalid/fabricated evidence references are rejected.
- LLM output cannot alter policy/risk/confidence values.

---

# Milestone 10 — Isolated remediation agent

## Goal

Let users turn a concrete risk finding into a reviewable candidate test/fix without granting unrestricted access.

## Features

- “Generate regression test” action;
- “Attempt fix” action;
- sandbox backend abstraction;
- Docker Sandboxes backend where supported;
- exact SHA checkout;
- network policy;
- credential isolation;
- agent task generated from evidence packet;
- selected + mandatory test validation;
- patch viewer;
- user-controlled branch/PR creation;
- sandbox audit log;
- guaranteed cleanup.

## Exit criteria

- sandbox has no host filesystem access;
- no automatic merge exists;
- test/fix patch is always inspectable before publication;
- validation output is attached to the candidate patch;
- destroying the sandbox is reliable even after agent failure.

---

# Milestone 11 — Python/pytest adapter

## Goal

Prove the architecture generalizes without changing core scoring/report/policy packages.

## Features

- Python semantic/index adapter;
- Python import/reference edges;
- pytest discovery/runner;
- Python-specific dynamic uncertainty rules;
- cross-language report compatibility.

## Exit criteria

No TypeScript-specific type is required by `graph`, `scoring`, `policy`, `history`, `report`, or GitHub integration packages.

---

# Milestone 12 — SCIP and broader language support

## Goal

Ingest semantic indexes produced outside ChangeGraph.

## Features

- SCIP index ingestion;
- normalized symbol/reference mapping;
- index capability flags;
- language-specific confidence calibration;
- adapters tested against representative repositories.

---

# Milestone 13 — Advanced intelligence foundation

Only build these after benchmark evidence shows the core is trustworthy.

Potential capabilities:

- dynamic per-test coverage ingestion;
- graph centrality/criticality learned from incidents;
- learned test ranking replacing fixed weights while retaining deterministic policy;
- cross-repository/service dependency graph;
- flaky-test root-cause clustering;
- CI cost forecasting;
- agent-authored change detection/metadata;
- test mutation experiments to measure selection strength;
- self-hosted enterprise index/runner;
- policy-as-code integrations.

---

# Milestone 14 — Repository Trust and Intent Drift

## Goal

Make repository-specific earned trust and declared-vs-actual scope visible and testable.

## Features

- trust state machine: Unproven, Observed, Calibrating, Trusted, Degraded, Suspended;
- explicit promotion and immediate demotion rules;
- persisted trust evidence/reasons;
- conservative author provenance;
- structured change intent;
- impact-reality normalization;
- intent-drift factors;
- critical-boundary drift signals;
- dashboard trust timeline;
- PR intent-drift card.

## Exit criteria

- trusted state cannot be reached without sufficient calibration evidence and explicit owner opt-in;
- serious false-safe event can demote trust immediately;
- ambiguous author provenance resolves to `unknown`;
- misleading PR text cannot reduce deterministic risk;
- intent drift is fully evidence-linked.

---

# Milestone 15 — Minimum Evidence Testing

## Goal

Select the cheapest sufficient validation plan rather than merely ranking relevant tests.

## Features

- heterogeneous evidence actions: tests, suites, typecheck, lint, build, schema checks, sentinels, full suite;
- expected action cost;
- evidence coverage/overlap;
- projected confidence gain;
- conservative greedy optimizer;
- mandatory evidence constraints;
- hard fallback constraints;
- planner explanation;
- full-suite comparison.

## Exit criteria

- mandatory evidence cannot be removed by optimization;
- hard fallback always results in full validation;
- evidence overlap is not double-counted naively;
- planner emits explicit cost/confidence assumptions;
- ChangeBench can compare test-only vs heterogeneous evidence planning.

---

# Milestone 16 — ChangeBench public benchmark

## Goal

Turn ChangeGraph's claims into reproducible evidence.

## Features

- versioned benchmark case format;
- historical replay engine;
- future-data leakage guard;
- full-suite baseline;
- changed-file baseline;
- same-package/static graph baselines;
- ChangeGraph ablations;
- safety metrics;
- efficiency metrics;
- calibration metrics;
- miss taxonomy;
- dataset provenance;
- public benchmark page.

## Exit criteria

- replay rejects history newer than the benchmark case cutoff;
- at least three transparent baselines run through the same interface;
- safety metrics appear before efficiency metrics in public reports;
- every failing-test miss is inspectable;
- result page includes tool SHA, configuration versions, and dataset version;
- synthetic and real-world cohorts are never silently combined.

---

# Milestone 17 — ChangeGraph MCP and GitHub Copilot Agent

## Goal

Make deterministic ChangeGraph intelligence available to coding agents without duplicating the analyzer.

## Features

### MCP

- MCP 2026-07-28 compatible TypeScript server;
- stateless remote HTTP transport;
- local/stdio development transport;
- per-tool schema validation;
- repository-scoped authorization;
- explicit read-only tool allowlist;
- risk/confidence/trust/impact/test/intent/evidence-plan tools;
- OpenTelemetry.

### Copilot custom agent

- repository custom-agent profile;
- explicit ChangeGraph MCP tool allowlist;
- evidence-ID grounding requirements;
- low-confidence behavior contract;
- test-selection explanation flow;
- intent-drift explanation flow.

## Exit criteria

- unauthorized repository access through MCP is rejected;
- V1 MCP exposes no mutation/general-shell tools;
- external MCP host can analyze a real PR;
- Copilot custom agent can answer blast-radius/test/evidence questions through ChangeGraph tools;
- agent cannot convert a low-confidence ChangeGraph result into a claim of safety.

---

# Milestone 18 — Native Check actions and evidence-bound remediation

## Goal

Turn ChangeGraph findings into controlled user actions inside GitHub.

## Features

- `Run full suite` requested action;
- exact report/head binding;
- stale-action rejection;
- `Generate regression test` request;
- `Attempt candidate fix` request;
- evidence packet generation;
- remediation policy;
- sandbox-only execution;
- candidate patch validation;
- reviewable patch/PR handoff;
- audit log.

## Exit criteria

- Check action webhook is authenticated/idempotent;
- full-suite action only broadens validation;
- stale remediation requests are rejected;
- remediation never edits host worker checkout;
- no automatic merge path exists;
- candidate patch includes validation evidence.

---

# Milestone 19 — Public Playground and GitHub Marketplace launch

## Goal

Make ChangeGraph easy to try, install, and distribute through GitHub-native channels.

## Features

### Playground

- public PR URL analysis;
- public repositories only;
- static/read-only mode;
- resource limits/rate limits;
- cache by base/head/analyzer version;
- sanitized report.

### Marketplace App

- public installability;
- free pricing plan;
- privacy policy;
- support route;
- terms/status/docs links;
- Marketplace lifecycle event handling;
- logo/feature card/screenshots;
- install/uninstall flow;
- security/support runbooks.

### Marketplace Action

- separate public repository;
- root `action.yml`;
- released ChangeGraph core/CLI integration;
- clean-room workflow test;
- immutable versioned releases.

## Exit criteria

- external repository can install app and receive a Check without developer assistance;
- playground analyzes a public PR without repository installation;
- uninstall stops privileged access/jobs and follows documented data lifecycle;
- all Marketplace links/assets are valid;
- free GitHub App meets current Marketplace submission checklist;
- separate Action meets current Action Marketplace requirements;
- benchmark page is public before Marketplace submission so performance claims are verifiable.

---

# Milestone 20 — Research-grade repository intelligence

Only after the public platform is demonstrably trustworthy.

Potential work:

- dynamic per-test coverage;
- mutation-based validation-strength estimation;
- submodular/integer optimization for evidence planning;
- learned ranking with deterministic safety envelope;
- multi-repository service graph;
- incident-linked change risk;
- graph-based code ownership suggestions;
- agent/human change-shape studies;
- public ChangeGraph research reports;
- self-hosted enterprise deployment.

---

# What not to build early

These ideas are attractive but would reduce the quality of the project if built before the core proves itself:

- a generic chat interface;
- multi-agent orchestration;
- a graph database without measured need;
- embeddings for every source file;
- automatic code merges;
- billing/subscriptions;
- Slack/Discord notifications;
- ten programming languages with shallow support;
- a custom CI scheduler;
- a custom sandbox runtime;
- speculative enterprise SSO/admin features.

The project becomes impressive through **depth, measurable correctness, earned trust, composability, and engineering judgment**, not feature count alone.
