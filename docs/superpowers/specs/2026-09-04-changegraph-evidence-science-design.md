# ChangeGraph Evidence Science Design

## Status

Approved research direction for post-MVP development.

This document extends the core ChangeGraph and platform-expansion specifications. It does not replace the safety invariants already defined there. The core analysis remains deterministic; low confidence broadens validation; agent output cannot override policy; and claims must be backed by reproducible evidence.

## 1. Thesis

ChangeGraph evolves from selective CI into an **evidence-science system for software changes**.

The central question is:

> What is the minimum amount of trustworthy, sufficiently diverse evidence required to justify accepting a code change?

A test is one evidence modality among several. Other modalities include static dependency paths, execution traces, mutation outcomes, runtime invariants, metamorphic relations, historical failure patterns, build/typecheck results, security checks, and signed provenance.

The product should acquire evidence adaptively until one of three outcomes is reached:

1. **validated** — policy evidence threshold satisfied;
2. **defer/review** — insufficient or contradictory evidence remains;
3. **block/fallback** — a failure or hard safety condition requires broader validation.

The system must explicitly support abstention. "Unknown" is a valid result.

---

## 2. Research tracks

### R1 — Causal Software Evolution

Research question:

> Can causal change channels improve blast-radius prediction beyond static dependency graphs and simple co-change history?

ChangeGraph maintains a temporal repository graph and learns candidate change-propagation channels from historical commits, pull requests, traces, and failures.

Important constraint: **correlation is not causation**. Historical co-change produces a hypothesis edge, not a causal claim. Causal confidence may increase only when supported by interventions or quasi-interventional evidence, such as mutation outcomes, controlled replay, or repeated natural experiments.

### R2 — Adaptive Evidence Validation

Research question:

> Can CI validation be formulated as sequential evidence acquisition while maintaining calibrated failure-detection behavior?

Instead of choosing one static test subset, ChangeGraph repeatedly chooses the next validation experiment with the best expected uncertainty reduction per unit cost.

This is the central research thesis.

### R3 — Mutation and Invariant Evidence

Research question:

> Can change-local mutation testing and invariant drift identify weak validation before regressions escape?

ChangeGraph generates bounded mutants only in the predicted blast radius, evaluates whether current evidence kills them, and mines/validates runtime invariants tied to affected regions.

### R4 — Verifiable Agentic Development

Research question:

> How should validation change when code, tests, explanations, and fixes may all originate from autonomous agents?

ChangeGraph tracks provenance, detects intent drift, demands independent evidence where appropriate, uses metamorphic checks for oracle-poor software, and emits signed evidence attestations.

---

## 3. Canonical evidence model

Every validation input is represented as an evidence item.

```ts
export type EvidenceModality =
  | 'static-path'
  | 'runtime-trace'
  | 'test-result'
  | 'mutation'
  | 'invariant'
  | 'metamorphic'
  | 'history'
  | 'coverage'
  | 'typecheck'
  | 'build'
  | 'security'
  | 'policy'
  | 'provenance';

export interface EvidenceItem {
  id: string;
  modality: EvidenceModality;
  subjectIds: string[];
  outcome: 'supports-safe' | 'supports-risk' | 'neutral' | 'unknown';
  strength: number;          // [0,1], model-versioned
  independenceGroup: string; // correlated items share a group
  costMs?: number;
  provenance: EvidenceProvenance;
  payloadDigest: string;
  createdAt: string;
}
```

No evidence item may be created without provenance. LLM prose is not evidence; it can only explain evidence IDs.

### Evidence provenance

```ts
export interface EvidenceProvenance {
  producer: string;
  producerVersion: string;
  repositoryId: number;
  baseSha: string;
  headSha: string;
  actorType?: 'human' | 'copilot' | 'agent' | 'automation' | 'unknown';
  independentOfChangeAuthor: boolean;
}
```

---

## 4. Temporal Repository Digital Twin

ChangeGraph stores a versioned graph over time rather than treating each commit as an isolated snapshot.

```ts
export interface TemporalEdgeObservation {
  edgeKey: string;
  firstSeenCommit: string;
  lastSeenCommit: string;
  observationCount: number;
  failureAssociations: number;
  mutationAssociations: number;
  traceAssociations: number;
}
```

### Required temporal facts

For each stable symbol/package/route/test relation, retain:

- first and last observation;
- frequency of change;
- co-change counts;
- failure associations;
- test associations;
- mutation outcomes;
- runtime trace relationships;
- incident/hotspot metadata when available.

### Candidate propagation channels

A channel is a repeatable path such as:

`session -> refresh -> middleware -> login-test`

The channel has separate fields for:

- static support;
- temporal support;
- runtime support;
- intervention support;
- unresolved confounder flags.

Never collapse these into one unqualified "causal probability".

---

## 5. Adaptive Evidence Planner

The planner treats validation actions as experiments.

```ts
export interface ValidationExperiment {
  id: string;
  kind:
    | 'run-test'
    | 'run-suite'
    | 'typecheck'
    | 'build'
    | 'run-mutation-set'
    | 'check-invariants'
    | 'run-metamorphic-relation';
  estimatedCostMs: number;
  affectedSubjects: string[];
  evidenceModalities: EvidenceModality[];
}
```

### Objective

For candidate experiment `e`:

`utility(e) = expectedUncertaintyReduction(e) * diversityGain(e) / normalizedCost(e)`

The planner selects:

`e* = argmax_e utility(e)`

After each result, ChangeGraph recomputes its evidence state and may choose a different next experiment.

### Stopping conditions

Stop and mark **validated** only when all are true:

1. no hard fallback or observed failure exists;
2. required mandatory evidence is present;
3. calibrated safety envelope allows acceptance;
4. evidence diversity floor is satisfied;
5. no unresolved high-severity contradiction remains;
6. repository policy threshold is met.

Stop and **defer/fallback** when:

- distribution shift invalidates the current calibration region;
- planner budget is exhausted before sufficient evidence exists;
- evidence remains highly correlated;
- mutation witnesses survive above policy threshold;
- critical invariant drift is unresolved;
- a mandatory experiment fails or cannot execute.

---

## 6. Evidence Diversity

Ten correlated unit tests must not count as ten independent confirmations.

Each evidence item belongs to an independence group. The planner applies diminishing returns within a group.

Initial diversity score:

`D = 1 - sum_g (w_g^2)`

where `w_g` is the normalized evidence strength share contributed by independence group `g`.

This is equivalent to a concentration penalty: evidence spread across independent modalities/groups scores higher than evidence dominated by one group.

Policy may require minimum diversity for high-risk changes.

Example:

- 10 nearly identical unit tests -> low D;
- unit + integration + invariant + mutation + runtime trace -> higher D.

---

## 7. Minimum Evidence Testing

ChangeGraph generalizes test selection into constrained validation planning.

Given experiments `E`, cost `c(e)`, and calibrated evidence threshold `T`:

Minimize:

`sum_e x_e * c(e)`

Subject to:

- requiredEvidence(x) >= T;
- mandatory experiments selected;
- hard policy constraints satisfied;
- diversity(x) >= D_min;
- x_e in {0,1}.

V1 uses deterministic greedy approximation with auditable marginal utility. Exact/advanced optimization may be explored later.

The dashboard exposes an **Evidence Frontier**: validation cost versus achieved calibrated evidence state. Values are observational/estimated unless backed by measured runs.

---

## 8. Mutation Witness Engine

Mutation testing is change-local, not repository-wide by default.

### Scope

Generate mutants only for:

- changed symbols;
- directly affected symbols;
- high-risk propagation nodes within bounded graph distance;
- policy-selected critical paths.

### Mutant classes for TypeScript V1

- boolean negation;
- relational boundary changes (`>` to `>=`, etc.);
- arithmetic operator substitutions;
- constant perturbation;
- return-value replacement for primitive values;
- conditional branch removal;
- optional guard removal where type-safe.

Avoid mutants requiring semantic guesses that cannot be reproduced deterministically.

### Mutation witness

A surviving mutant becomes explicit negative evidence:

```ts
export interface MutationWitness {
  mutantId: string;
  symbolId: string;
  operator: string;
  killedBy: string[];
  survived: boolean;
  selectedEvidenceIds: string[];
}
```

The planner may then add a test or another modality targeting the witness.

Mutation results are not treated as direct proof of production faults; they measure validation adequacy against injected faults.

---

## 9. Catching Tests and Hardening Tests

ChangeGraph labels generated/recommended tests by purpose:

- **catching test** — targets a plausible fault introduced by this change;
- **hardening test** — strengthens a fragile behavior/invariant for future changes.

An agent may propose either, but generated tests enter normal validation and provenance rules. Agent-generated tests do not automatically count as independent evidence when the same agent authored the code change.

---

## 10. Dynamic Invariant Drift

ChangeGraph learns likely invariants for impacted runtime regions using observed successful executions.

Examples:

- ordering relations;
- nullability/state relations;
- numeric bounds;
- collection-size relations;
- cross-field equality/inequality;
- monotonic properties.

Every invariant stores:

- support count;
- observation window;
- affected symbol/path;
- false-positive history;
- confidence/calibration metadata;
- whether it was user-declared or mined.

A new change can produce:

- maintained invariant;
- intentional drift;
- suspicious drift;
- insufficient observations.

Mined invariants are hypotheses, not formal proofs. User-declared invariants may have stronger policy status.

---

## 11. Metamorphic Evidence

For oracle-poor components, ChangeGraph supports metamorphic relations (MRs).

Examples:

- idempotence;
- order invariance where domain permits;
- monotonicity;
- semantic equivalence under normalized input;
- irrelevant-input invariance;
- round-trip relations.

LLMs may **propose** MRs but cannot promote them directly to trusted evidence.

Lifecycle:

`proposed -> executable -> shadow validated -> accepted/rejected`

An accepted MR records domain scope, assumptions, historical validity, and counterexamples.

---

## 12. Calibrated Safety Envelope

Replace vague product-level "confidence" claims with a calibrated acceptance envelope.

The system may still expose component confidence factors for debugging, but Optimize decisions use calibration artifacts tied to repository/change regimes.

### Calibration artifact

```ts
export interface CalibrationEnvelope {
  version: string;
  repositoryId: number;
  changeRegime: string;
  alpha: number;
  sampleCount: number;
  validFromCommit: string;
  supportRegion: Record<string, unknown>;
  miscoverageEstimate: number;
  shiftDiagnostics: ShiftDiagnostic[];
}
```

### Rules

- standard conformal claims require assumptions to be explicitly recorded;
- repository evolution may violate exchangeability;
- detected support mismatch/distribution shift causes abstention or broader validation;
- online/adaptive calibration is treated as a separate model version;
- no UI copy may imply unconditional probability-of-safety guarantees.

The product language should be:

> "within the current calibrated safety envelope"

not:

> "this PR is 99% safe."

---

## 13. Distribution Shift Detection

Track change-distribution features such as:

- changed-file count/ratio;
- graph fanout;
- change types;
- dependency/config changes;
- author/provenance type;
- package/domain touched;
- test topology;
- language/framework version changes;
- graph-resolution health.

When the current PR has poor overlap with calibration history, ChangeGraph marks `outside-calibration-support` and broadens validation.

Shift detection is diagnostic; it does not by itself prove conformal validity.

---

## 14. Agent Provenance and Independent Evidence Policy

Track change author and evidence producer separately.

Policy may require independent evidence when:

- an autonomous agent authored most of the production code;
- the same agent authored the test that validates its change;
- the agent changed both implementation and assertions/oracles;
- tests were weakened or deleted;
- intent drift is high.

Independent evidence can come from:

- pre-existing tests;
- deterministic mutation witnesses;
- runtime invariants;
- static checks;
- separately generated/reviewed evidence;
- full-suite validation.

The system does not assume agent-authored code is inherently riskier; provenance is an empirical feature to be evaluated in ChangeBench.

---

## 15. Intent Drift

Compare declared intent with observed blast radius.

Sources of declared intent:

- PR title/body;
- linked issue;
- agent task prompt when available;
- structured developer-supplied scope.

Observed scope comes from deterministic impact analysis.

Output:

- intended entities/domains;
- observed impacted entities/domains;
- overlap;
- unexpected-impact set;
- unfulfilled-intent set;
- drift severity;
- evidence paths.

LLMs may normalize natural-language intent to candidate entities, but final observed scope is graph-derived.

---

## 16. Proof-Carrying Pull Requests

A validated change can emit a **ChangeGraph Evidence Certificate**.

This is not a proof that software is bug-free. It is a signed, reproducible statement of what evidence was collected and which policy accepted it.

```json
{
  "predicateType": "https://changegraph.dev/attestations/evidence/v1",
  "subject": {
    "repository": "owner/repo",
    "baseSha": "...",
    "headSha": "..."
  },
  "predicate": {
    "analysisVersion": "...",
    "policyVersion": "...",
    "evidenceRoot": "sha256:...",
    "decision": "validated",
    "calibrationEnvelope": "...",
    "experiments": [],
    "fallbacks": []
  }
}
```

The evidence root is a Merkle-style digest over canonical evidence records so individual evidence can be verified against the certificate.

Where useful, package this as an in-toto-compatible attestation predicate and use GitHub/Sigstore mechanisms for signing released artifacts. Do not claim that a ChangeGraph certificate is equivalent to SLSA provenance or that it guarantees security.

---

## 17. Evidence Graph

In addition to the program impact graph, ChangeGraph maintains an evidence graph.

Nodes:

- change claims;
- affected entities;
- validation experiments;
- evidence items;
- policy requirements;
- decision.

Edges:

- supports;
- contradicts;
- depends-on;
- validates;
- generated-by;
- independent-of;
- supersedes.

This graph powers explainability and signed evidence roots.

---

## 18. Research benchmark extensions

ChangeBench must add the following benchmark dimensions.

### Baselines

- full suite;
- path/file heuristics;
- static affected graph;
- historical prioritization;
- static + history;
- mutation-aware ranking;
- adaptive evidence planner.

### Metrics

Primary safety metrics:

- failing-test recall;
- false-safe rate;
- hard-fallback recall;
- mutation kill retention;
- invariant violation detection;
- calibration coverage gap.

Efficiency metrics:

- executed-test ratio;
- wall-clock ratio;
- validation compute cost;
- evidence acquisition steps;
- analysis overhead.

Research metrics:

- expected calibration error where applicable;
- evidence diversity;
- intent-drift detection precision/recall on labeled sets;
- causal-channel uplift over correlation baselines;
- mutation witness yield;
- abstention rate under distribution shift.

### Anti-leakage rules

For historical PR N, no data from PR N or later may be used in ranking, calibration, invariant mining, temporal features, or learned models used to evaluate N.

All benchmark datasets must record commit-time ordering explicitly.

---

## 19. Experimental progression

### Stage E0 — deterministic evidence core

Static graph, test mapping, policy. Existing MVP.

### Stage E1 — temporal evidence

Historical graph, trace ingestion, co-failure/co-change, hotspot model.

### Stage E2 — mutation witnesses

Change-local mutation generation and adequacy feedback.

### Stage E3 — adaptive planner

Sequential test/evidence acquisition with measured costs.

### Stage E4 — calibrated safety envelope

Repository-regime calibration plus distribution-shift abstention.

### Stage E5 — invariant and metamorphic evidence

Runtime invariant drift and shadow-validated MRs.

### Stage E6 — proof-carrying changes

Canonical evidence graph, Merkle digest, attestation predicate, signatures.

### Stage E7 — learned models

Only after strong deterministic baselines exist, evaluate GNN/learned ranking as a challenger model. Learned models may propose/rank evidence but deterministic policy remains authoritative.

---

## 20. Product surfaces

### GitHub Check

Add an evidence summary:

```text
Validation state     WITHIN SAFETY ENVELOPE
Evidence steps       4
Evidence diversity   HIGH
Mutations killed     12 / 12 scoped
Invariant drift      none critical
Calibration support  in-distribution
Decision             validated
```

All values must link to inspectable evidence.

### Evidence Frontier

Dashboard charts measured/estimated validation cost against current evidence state. Estimates are visibly labeled.

### Change Certificate

Download/view signed evidence certificate for validated change.

### Agent/Copilot/MCP

Expose read-only tools first:

- `evidence_summary`
- `why_validated`
- `next_best_experiment`
- `mutation_witnesses`
- `invariant_drift`
- `calibration_status`
- `intent_drift`

Write/remediation tools remain separately authorized.

---

## 21. Non-goals and anti-hype rules

Do not claim:

- formal verification;
- proof of bug freedom;
- unconditional causal relationships;
- unconditional conformal guarantees under arbitrary repository shift;
- security guarantees from attestations alone;
- that mutation score equals real defect detection;
- that an LLM-proposed invariant/MR is trustworthy before validation.

Do not add a GNN because it is fashionable. A learned model must beat auditable deterministic baselines on held-out, leak-free ChangeBench evaluation.

---

## 22. Research-source rationale

This design is informed by, but not a direct implementation of, several research directions:

- causal inference in software testing remains fragmented and underexplored in causal representation/discovery;
- software-evolution work shows repeated change-propagation channels can be mined from historical graphs;
- mutation-aware test prioritization research combines dependency graphs, runtime traces, and mutation coverage;
- dynamic invariant detection demonstrates that likely invariants can be mined from executions;
- current metamorphic-testing work uses LLMs to assist relation inference and follow-up generation while addressing oracle problems;
- conformal prediction offers principled calibration but must be handled carefully under distribution shift;
- in-toto/SLSA/GitHub attestations provide established patterns for verifiable provenance claims.

See `docs/EVIDENCE_SCIENCE_RESEARCH.md` for citations and research hypotheses.

---

## 23. Success criteria

The evidence-science program is successful if it demonstrates, on leak-free benchmark histories, at least one of these outcomes without degrading protected safety metrics:

1. adaptive validation reaches equal/higher failing-test recall at lower measured validation cost than static selection;
2. mutation witnesses identify weak evidence sets before full-suite misses;
3. calibrated abstention reduces false-safe decisions on out-of-distribution changes;
4. temporal/causal-channel features improve impact prediction over static + correlation baselines;
5. evidence diversity improves robustness compared with equal-cost homogeneous evidence;
6. evidence certificates allow an independent verifier to reconstruct the decision inputs and validate their digests.

Every result must include negative findings and ablations, not only wins.
