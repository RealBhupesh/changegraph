# ChangeGraph Evidence Science Roadmap

This roadmap begins only after the core MVP has a reliable semantic graph, test mapping, deterministic policy, and ChangeBench baseline harness.

Each milestone must produce measurable evidence before the next one can become authoritative.

---

# ES0 — Research harness and canonical evidence

## Goal

Create a reproducible substrate for every later experiment.

## Deliverables

- canonical `EvidenceItem` schema;
- provenance model;
- deterministic evidence hashing;
- ChangeBench time-ordered replay rules;
- B0-B4 deterministic baselines;
- frozen dataset manifests.

## Gate

No future-event leakage in synthetic sentinel tests.

---

# ES1 — Temporal repository intelligence

## Goal

Turn the snapshot graph into a time-aware model of software evolution.

## Deliverables

- temporal edge observations;
- change/failure/trace association history;
- candidate propagation channels;
- hotspot timelines;
- causal evidence-level labels.

## Gate

Temporal features must improve at least one held-out impact metric or remain visualization/research-only.

---

# ES2 — Change-local mutation witnesses

## Goal

Measure whether selected evidence can detect plausible faults in the predicted blast radius.

## Deliverables

- bounded deterministic TypeScript mutation operators;
- isolated mutant runner;
- witness classification;
- possibly-equivalent category;
- mutation evidence in ChangeBench.

## Gate

Mutation overhead and witness yield measured on multiple repositories; no product claim before this data exists.

---

# ES3 — Evidence diversity and contradiction model

## Goal

Stop treating correlated validations as independent confirmation.

## Deliverables

- independence groups;
- diversity/concentration score;
- contradiction graph;
- same-origin provenance grouping.

## Gate

H2 evaluated against diversity-blind baseline.

---

# ES4 — Adaptive Evidence Planner

## Goal

Choose the next most valuable validation experiment after each observed result.

## Deliverables

- experiment registry;
- robust runtime cost estimates;
- deterministic gain/cost utility;
- sequential planner;
- stop/defer/fallback logic;
- decision traces.

## Gate

H1 evaluated against static top-K/threshold selection with planner overhead included.

---

# ES5 — Minimum Evidence Frontier

## Goal

Expose the validation cost/evidence trade-off to users and policy.

## Deliverables

- greedy minimum-evidence plan;
- evidence frontier;
- estimate-vs-measured labeling;
- mandatory evidence constraints.

## Gate

No protected validation requirement can be optimized away in adversarial policy tests.

---

# ES6 — Calibrated Safety Envelope

## Goal

Replace vague confidence-as-probability language with scoped calibration and abstention.

## Deliverables

- empirical calibration artifact;
- change-regime features;
- support-overlap diagnostics;
- outside-support abstention;
- online/conformal model interface for later challengers.

## Gate

H5 evaluated on intentional distribution-shift benchmarks.

---

# ES7 — Runtime invariant evidence

## Goal

Detect suspicious changes to stable runtime properties in impacted regions.

## Deliverables

- bounded runtime probes;
- likely-invariant mining;
- support/stability metadata;
- drift classification;
- false-positive audit.

## Gate

Invariant evidence remains Observe-only until false-positive/intentional-drift rates are characterized.

---

# ES8 — Metamorphic evidence

## Goal

Add validation for oracle-poor and AI-heavy components.

## Deliverables

- MR registry;
- executable transform/relation definitions;
- proposal -> shadow -> accepted lifecycle;
- immutable counterexamples;
- sandbox execution.

## Gate

LLM-proposed relations contribute zero trusted evidence until promotion criteria are satisfied.

---

# ES9 — Provenance-aware independent evidence

## Goal

Prevent one autonomous process from being the sole source of both a change and its validation.

## Deliverables

- actor/evidence provenance;
- same-origin grouping;
- independent-evidence policy for high-risk changes;
- controlled agent/human comparative experiments.

## Gate

H7 tested empirically; no blanket risk penalty for agent-authored changes.

---

# ES10 — Proof-carrying pull requests

## Goal

Make validation decisions independently verifiable.

## Deliverables

- canonical evidence graph;
- Merkle evidence root;
- ChangeGraph attestation predicate;
- local verifier;
- optional Sigstore/GitHub integration for release workflows.

## Gate

Independent verifier can detect any modified evidence record and reconstruct exact analyzer/policy/calibration versions.

---

# ES11 — Publication-grade ChangeBench

## Goal

Evaluate R1-R4 across multiple repositories with frozen future windows.

## Deliverables

- H1-H7 experiment suites;
- per-repository results;
- ablations;
- statistical intervals/tests;
- negative-result reporting;
- dataset/tool/config provenance.

## Gate

Only frozen held-out results may drive README/portfolio/research claims.

---

# ES12 — Learned challengers

## Goal

Evaluate whether learned/GNN models add value over the deterministic evidence planner.

## Deliverables

- time-safe training pipeline;
- GNN or other ranker behind `EvidenceRanker` interface;
- ablations;
- inference overhead analysis;
- rollback to deterministic baseline.

## Gate

A learned challenger must outperform the strongest deterministic baseline on a predeclared objective without worsening protected false-safe/fallback constraints.

If it does not, ChangeGraph keeps the deterministic planner.

---

# Priority order

If engineering capacity is limited, prioritize:

1. ES0 canonical evidence/replay;
2. ES1 temporal graph;
3. ES2 mutation witnesses;
4. ES4 adaptive planner;
5. ES6 calibration/abstention;
6. ES10 evidence certificates.

Invariants, metamorphic relations, and learned models are powerful but should not delay proving the central Adaptive Evidence Validation thesis.
