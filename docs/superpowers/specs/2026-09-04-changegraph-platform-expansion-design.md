# ChangeGraph Platform Expansion Design

## Status

Approved architectural expansion of the existing ChangeGraph product specification.

This document extends ChangeGraph beyond pull-request analysis into a GitHub-native change-intelligence platform that can be consumed by humans, CI systems, GitHub Copilot custom agents, MCP clients, and isolated remediation agents.

The original MVP remains valid and should still be implemented first. This expansion is layered on top of the deterministic impact engine rather than replacing it.

---

# 1. Product thesis

ChangeGraph should become the **change-intelligence layer for human-authored and agent-authored code**.

Coding agents are becoming increasingly capable of producing code, opening pull requests, and iterating on reviews. The hard problem shifts from generating code to establishing trustworthy evidence about the consequences of that code.

ChangeGraph answers five questions:

1. **What actually changed?**
2. **What can this change affect?**
3. **What is the minimum evidence required before we should trust it?**
4. **Does the implementation match the declared intent?**
5. **If there is a concrete gap, can an agent attempt remediation safely?**

This makes ChangeGraph complementary to coding agents rather than another coding-agent competitor.

---

# 2. Expansion tracks

The platform expansion has five first-class tracks.

## Track A — ChangeGraph MCP

Expose deterministic change intelligence to external agent hosts.

Supported clients should eventually include:

- GitHub Copilot cloud agent and code review;
- GitHub Copilot CLI;
- ChatGPT/Codex-compatible MCP clients;
- Claude Code;
- Cursor;
- VS Code agent mode;
- custom internal agents.

### V1 MCP tools

All V1 tools are read-only.

```text
changegraph.analyze_change
changegraph.get_changed_symbols
changegraph.get_impact_paths
changegraph.get_relevant_tests
changegraph.get_risk
changegraph.get_confidence
changegraph.explain_test_selection
changegraph.get_repository_trust
changegraph.get_hotspots
changegraph.compare_intent_to_impact
changegraph.minimum_evidence_plan
```

### Tool behavior

Every tool must:

- return a schema-versioned payload;
- expose evidence IDs;
- distinguish facts from predictions;
- never claim understanding of unsupported areas;
- include fallback/uncertainty information;
- be usable without any LLM configured in ChangeGraph itself.

### Write-capable tools

Write-capable tools are a later opt-in surface:

```text
changegraph.request_full_validation
changegraph.request_regression_test
changegraph.request_candidate_fix
```

These tools never directly modify the repository. They create a ChangeGraph request/job that still flows through policy, sandbox, validation, and human review.

---

## Track B — GitHub Copilot ChangeGraph Agent

Ship a custom GitHub Copilot agent profile that uses ChangeGraph MCP as a specialized change-analysis toolset.

### Agent identity

**Name:** ChangeGraph Reviewer

**Purpose:** Analyze repository changes, explain blast radius, identify missing evidence, and propose validation plans using ChangeGraph evidence.

### Required behavior

The custom agent must:

- call ChangeGraph before claiming a change is safe;
- treat ChangeGraph risk/confidence as authoritative platform data;
- never invent graph edges or test relationships;
- ask for full validation when ChangeGraph reports low confidence;
- cite evidence IDs in its conclusions;
- distinguish declared PR intent from detected impact;
- avoid editing code unless the user explicitly asks for remediation;
- when remediation is requested, create a structured remediation task rather than writing directly through an unrestricted shell path.

### GitHub-native user stories

A developer can ask:

```text
@copilot using ChangeGraph, what can this PR break?
```

```text
@copilot why did ChangeGraph select refresh-session.test.ts?
```

```text
@copilot what is the cheapest additional validation needed to reach high confidence?
```

```text
@copilot does this PR's implementation exceed its declared scope?
```

The agent should answer using ChangeGraph MCP outputs rather than re-deriving the graph itself.

---

## Track C — ChangeBench

Create an open benchmark for change-impact analysis and selective testing.

The benchmark is critical because the project should not be impressive merely because its UI looks intelligent. It must publish measurable evidence.

### Core benchmark question

Given a historical code change and only evidence available **before** its final validation result:

> Which tests should ChangeGraph have selected?

Then compare the predicted set with the actual full-suite results.

### Benchmark units

Each benchmark case contains:

```ts
interface ChangeBenchCase {
  repository: string;
  baseSha: string;
  headSha: string;
  changedFiles: string[];
  allTests: TestCaseRef[];
  actualFailingTests: TestCaseRef[];
  testDurationsMs: Record<string, number>;
  metadata: {
    language: string;
    framework: string;
    authorType?: 'human' | 'agent' | 'automation' | 'unknown';
  };
}
```

### Required metrics

#### Safety

```text
failing_test_recall
false_safe_rate
unsupported_fallback_recall
systematic_miss_rate
```

#### Efficiency

```text
selection_ratio
runtime_ratio
estimated_compute_saved
analysis_latency
```

#### Calibration

```text
confidence_bin_accuracy
risk_failure_correlation
minimum_evidence_efficiency
```

### Baselines

ChangeBench must compare ChangeGraph against transparent baselines:

1. full suite;
2. changed-file matching;
3. same-package tests;
4. static dependency graph only;
5. historical failure only;
6. ChangeGraph static + history;
7. later, learned ranking.

### Anti-leakage requirement

Historical case N may only use evidence available before case N. Future test outcomes or future graph state are forbidden.

### Public results

Published result tables must separate:

- controlled fixtures;
- replayed historical OSS PRs;
- live shadow-mode repositories.

No synthetic number may be presented as measured performance.

---

## Track D — Intent Drift

Compare the declared purpose of a change with its detected impact surface.

This is particularly important for agent-authored changes because an agent can satisfy a local task while expanding the real blast radius.

### Intent inputs

Intent may be derived from:

- PR title;
- PR description;
- linked issue title/body;
- commit summary;
- explicit ChangeGraph intent field;
- agent task description.

Intent text is untrusted context. It may inform comparison but never override deterministic impact evidence.

### Intent model

Normalize declared intent into structured concepts:

```ts
interface ChangeIntent {
  summary: string;
  declaredAreas: string[];
  declaredFiles?: string[];
  declaredCapabilities?: string[];
  source: 'explicit' | 'pr' | 'issue' | 'agent-task';
  extractionConfidence: number;
}
```

### Impact reality

Impact reality is derived from ChangeGraph's graph:

```ts
interface ImpactReality {
  affectedPackages: string[];
  affectedFiles: string[];
  affectedSymbols: string[];
  affectedRoutes: string[];
  affectedTests: string[];
  criticalPaths: string[];
}
```

### Drift signals

```text
scope_expansion_ratio
undeclared_critical_area_count
unmentioned_public_api_change
unmentioned_data_or_migration_change
unmentioned_security_boundary_change
```

### Drift output

```text
Intent Drift: HIGH

Declared:
- session refresh

Detected additional impact:
- auth middleware
- dashboard authorization
- user API
- refresh-token persistence

Reason:
2 undeclared critical areas and 1 public behavior boundary changed.
```

Intent drift is not automatically a defect. It is a review signal.

---

## Track E — Minimum Evidence Testing

Move beyond ranking tests toward solving an optimization problem:

> What is the minimum validation cost required to satisfy a repository's confidence target?

### Objective

For candidate validation actions `i`:

```text
minimize Σ cost_i * x_i
```

subject to:

```text
projected_confidence(selected evidence) >= repository_threshold
mandatory_evidence is included
hard fallback constraints are satisfied
```

Where evidence actions may include:

- unit test file;
- integration test suite;
- typecheck;
- lint/static analysis;
- build;
- schema validation;
- sentinel suite;
- full suite.

### Important design constraint

Confidence gain is not assumed additive.

The first implementation uses a conservative greedy marginal-gain algorithm with explicit overlap penalties. A later optimizer may use submodular optimization or integer programming only if benchmark results justify the added complexity.

### Output

```text
Current confidence: 0.76
Target: 0.92

Minimum evidence plan

1. refresh-session.test.ts   +0.08   12s
2. auth-middleware.test.ts   +0.05   18s
3. auth integration suite    +0.06   43s

Projected confidence: 0.93
Total expected runtime: 73s

Full suite expected runtime: 611s
```

This is more meaningful than simply saying "41 tests are relevant."

---

# 3. GitHub-native surfaces

ChangeGraph should appear where developers already work.

## 3.1 GitHub Check Run

The Check Run is the primary PR surface.

Required summary:

```text
Risk             HIGH 82/100
Confidence       93%
Intent Drift     MEDIUM
Repository Trust HIGH
Selected         41 / 387 tests
Decision         Selective validation
```

Required sections:

1. changed symbols;
2. highest-risk impact paths;
3. selected evidence plan;
4. omitted tests with rationale;
5. confidence gaps;
6. intent drift;
7. repository trust context;
8. full-fallback reason when applicable.

## 3.2 Check requested actions

GitHub Check requested actions provide native buttons.

Planned actions:

```text
Run full suite
Generate regression test
Investigate impact
Attempt candidate fix
```

Only actions allowed by policy are rendered.

`Run full suite` is always safe to expose.

Remediation actions require explicit user interaction and a configured sandbox backend.

## 3.3 Pull-request dashboard

The external dashboard provides richer graph exploration and historical context, but GitHub remains sufficient for the common path.

## 3.4 GitHub Action distribution

A separate Action provides self-hosted/local adoption:

```yaml
- uses: changegraph-ai/changegraph-action@v1
  with:
    base: ${{ github.event.pull_request.base.sha }}
    head: ${{ github.sha }}
```

The Action may publish a report artifact or expose selected test files as outputs.

The Action repository must remain separate from the monorepo when preparing Marketplace publication because GitHub Marketplace expects a single action metadata file at the repository root for a listed Action.

---

# 4. Repository Trust

ChangeGraph must earn the right to optimize CI.

## Trust states

```text
UNPROVEN
OBSERVED
CALIBRATING
TRUSTED
DEGRADED
SUSPENDED
```

### UNPROVEN

New repository. Advisory only.

### OBSERVED

Indexing and analysis work reliably, but insufficient full-suite comparisons exist.

### CALIBRATING

Enough comparable runs exist to estimate recall and selection efficiency.

### TRUSTED

Repository satisfies configured promotion thresholds and owner has explicitly enabled selective CI.

### DEGRADED

Recent evidence indicates a miss class, adapter change, dependency topology change, or calibration regression.

Selective behavior becomes stricter or disabled.

### SUSPENDED

Serious false-safe event or unsupported environment change. Full validation only until manual review/recalibration.

## Trust scorecard

Trust is not a vanity score. It is a versioned state derived from:

- comparable shadow runs;
- failing-test recall;
- systematic miss count;
- parse/index health;
- adapter stability;
- fallback correctness;
- false-safe audit findings;
- time since major repository configuration change.

A numeric presentation may be shown in UI, but policy consumes the underlying state and evidence, not a decorative score.

---

# 5. Agent provenance

ChangeGraph should record how a change was authored when reliable metadata exists.

```ts
type AuthorProvenance =
  | { kind: 'human'; actor: string }
  | { kind: 'github-copilot'; agentProfile?: string }
  | { kind: 'dependabot' }
  | { kind: 'renovate' }
  | { kind: 'external-agent'; provider?: string }
  | { kind: 'automation'; actor?: string }
  | { kind: 'unknown' };
```

Author provenance must never be used as a discriminatory shortcut such as "agent code is unsafe."

It is a feature for measuring empirical differences in change shape, failure behavior, and validation needs.

Potential benchmark dimensions:

```text
median changed-symbol count by provenance
median risk by provenance
failure rate by provenance
intent-drift rate by provenance
selected-validation cost by provenance
```

---

# 6. ChangeGraph nervous system

The long-term graph evolves from code dependencies into a multi-evidence repository model.

## Node families

- repository;
- package;
- file;
- symbol;
- route/API;
- database object;
- workflow/job;
- test;
- incident/failure signature;
- pull request;
- validation run.

## Edge families

- imports;
- calls;
- references;
- exposes;
- reads/writes;
- tests/covers;
- historically-fails-with;
- changed-together;
- deploys;
- depends-on;
- validated-by.

The graph engine must preserve provenance and confidence per edge.

The graph must not become a graph database project prematurely. Storage remains PostgreSQL + compact serialized indexes until benchmarked query patterns justify another system.

---

# 7. Hotspots and danger zones

ChangeGraph should identify areas that deserve more review attention.

Example metrics:

```text
change_frequency
failure_frequency
fanout
critical_path_membership
historical_test_gap
intent_drift_frequency
```

A hotspot card might show:

```text
paymentWebhook()

Changed in          31 PRs
Failure-linked      7 PRs
Direct tests        4
Reverse fanout      82 symbols
Instability         HIGH
```

These metrics are descriptive evidence. They must not become unexplained ML scores.

---

# 8. Public playground

A public playground should eventually allow a user to submit a public GitHub PR URL and receive a read-only impact report without installing the GitHub App.

Constraints:

- public repositories only;
- strict rate limits;
- no test execution by default;
- no secret access;
- analysis cached by repository/head SHA;
- visible disclaimer for unsupported patterns;
- no persistence of full source beyond analysis/cache policy.

The playground is both a product acquisition surface and a recruiter/demo surface.

---

# 9. Marketplace product strategy

The first GitHub Marketplace release should be **free**.

Reasons:

- lower adoption friction;
- no need to solve billing before product correctness;
- paid Marketplace requirements are stricter;
- benchmark data and installations are more strategically valuable than early revenue.

The first Marketplace product is the GitHub App, with the GitHub Action published separately.

A future paid tier may be considered only after:

- the app is organization-owned;
- publisher verification is complete;
- installation requirements are met;
- support/privacy/terms/status surfaces are operational;
- the hosted service has proven reliability.

Detailed requirements live in `docs/MARKETPLACE.md`.

---

# 10. Security model for agent surfaces

MCP and custom agents materially increase blast radius if designed carelessly.

## Read-only first

The default MCP deployment exposes only read-only tools.

## Tool allowlisting

Custom GitHub agents explicitly allowlist ChangeGraph tools instead of enabling every MCP tool.

## No direct repository mutation

Write intents create jobs. Jobs pass through:

```text
user action
  -> authenticated request
  -> policy check
  -> isolated sandbox
  -> candidate patch
  -> validation
  -> human review
  -> optional PR creation
```

## Prompt injection boundary

Repository text, PR descriptions, code comments, issue bodies, test output, and dependency metadata are all untrusted data.

They never become trusted system instructions.

## Authorization

Every tool call is scoped to installation/repository permissions.

A client must not be able to reference an arbitrary repository ID and retrieve data from another installation.

---

# 11. Success criteria for expansion

The platform expansion is successful when all of these are demonstrable:

### MCP

- at least one external MCP host can query a real ChangeGraph analysis;
- tool outputs are schema-validated and evidence-linked;
- unauthorized repository access is rejected;
- read-only tools are usable without LLM access in ChangeGraph.

### GitHub Copilot agent

- custom agent can answer blast-radius/test-selection questions using ChangeGraph MCP;
- every technical claim is grounded in returned ChangeGraph evidence;
- low-confidence cases cause the agent to recommend broader validation.

### ChangeBench

- benchmark harness replays historical cases without future leakage;
- at least three transparent baselines are published;
- metrics separate safety and efficiency;
- all published performance numbers are reproducible.

### Intent Drift

- structured intent and impact models exist;
- benchmark fixtures include expected drift classifications;
- drift never overrides deterministic safety policy.

### Minimum Evidence

- optimizer can produce a validation plan with explicit expected cost and confidence effect;
- mandatory and fallback constraints are impossible to optimize away;
- the optimizer never returns a narrower plan than policy permits.

### Marketplace

- public GitHub App is installable;
- privacy/support/pricing/listing assets exist;
- Marketplace compliance checklist is green;
- GitHub App and Action distribution paths are independently releaseable.

---

# 12. Non-goals

This expansion still does not justify:

- automatic merging;
- unrestricted agent shell access;
- embeddings over the entire source tree by default;
- a multi-agent orchestration framework;
- a custom graph database;
- a custom CI scheduler;
- paid billing before product/installation traction;
- opaque learned risk decisions;
- replacing existing CI completely.

The product becomes more impressive by becoming **more trustworthy, measurable, composable, and native to developer workflows**, not by accumulating gimmicks.
