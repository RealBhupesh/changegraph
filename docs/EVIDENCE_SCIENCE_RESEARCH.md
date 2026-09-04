# ChangeGraph Evidence Science Research Program

This document captures the external research basis, falsifiable hypotheses, benchmark rules, and publication-grade experiments for the ChangeGraph Evidence Science program.

## 1. Core research problem

Modern CI usually treats validation as a fixed checklist or a static subset-selection problem. ChangeGraph instead asks whether validation can be modeled as **adaptive evidence acquisition**: choose the next cheapest experiment that most reduces uncertainty about a specific change, update the evidence state, and stop only when a calibrated policy permits it.

The research program must preserve two principles:

1. safety claims are empirical and scoped to measured regimes;
2. every learned component must be compared against strong deterministic baselines.

---

## 2. Research landscape

### 2.1 Causality in software testing

A 2026 rapid review of 27 studies reports that causal inference in software testing is promising but fragmented. It highlights underexplored work in causal representation and structure discovery, plus persistent challenges around model misspecification, assumptions, and limited empirical evaluation.

Source:
- https://arxiv.org/abs/2606.15683

ChangeGraph consequence:
- co-change and co-failure are never labeled causal by themselves;
- causal channels expose assumption/confounder metadata;
- intervention-like evidence from mutation/replay is tracked separately.

### 2.2 Change propagation channels

Research on software-evolution mining demonstrates that recurring graph paths can reveal frequent change-propagation channels across code entities and historical commits.

Sources:
- https://doi.org/10.1016/j.jss.2023.111912
- https://doi.org/10.1016/j.infsof.2023.107368

ChangeGraph consequence:
- maintain temporal edges rather than only snapshot graphs;
- evaluate whether temporal channels improve held-out blast-radius prediction.

### 2.3 Mutation-aware regression testing

A 2026 MethodsX study combines static dependency graphs, execution traces, mutation coverage, and GNN models for regression-test ordering. The paper reports improved APFD and shows through ablation that removing trace/mutation features degrades performance.

Source:
- https://doi.org/10.1016/j.mex.2025.103782

ChangeGraph consequence:
- mutation and runtime traces are independent evidence modalities;
- build deterministic/static baselines before evaluating GNN challengers;
- prioritize change-local mutation to control cost.

### 2.4 Dynamic invariant detection

Daikon dynamically observes executions and reports likely invariants. Its current repository/documentation demonstrates a mature model for mining operational properties while acknowledging they are likely invariants rather than formal proofs.

Sources:
- https://github.com/codespecs/daikon
- https://plse.cs.washington.edu/daikon/download/doc/

ChangeGraph consequence:
- mine invariants only in impacted regions;
- record support/observation windows and false-positive history;
- distinguish mined invariants from user-declared invariants.

### 2.5 Metamorphic testing

Metamorphic testing addresses oracle-poor systems by asserting relations between executions rather than exact outputs. 2026 work explores LLM-assisted metamorphic-relation inference and follow-up test generation.

Sources:
- https://doi.org/10.1016/j.infsof.2026.108150
- https://arxiv.org/abs/2605.13898

ChangeGraph consequence:
- LLMs may propose metamorphic relations;
- proposed relations must execute in shadow mode and demonstrate validity before becoming trusted evidence;
- counterexamples are retained permanently.

### 2.6 Conformal calibration under distribution shift

Conformal prediction can provide principled coverage under assumptions, but current research emphasizes that coverage may degrade under distribution shift. 2026 work explores diagnostics, covariate-shift correction, online conformal methods, and adaptive approaches.

Sources:
- https://proceedings.mlr.press/v337/lee26g.html
- https://proceedings.mlr.press/v337/laghuvarapu26a.html
- https://proceedings.iclr.cc/paper_files/paper/2026/hash/5f8241131e6fd428aa49914da76b8ad0-Abstract-Conference.html

ChangeGraph consequence:
- do not market an arbitrary confidence number as probability of safety;
- tie Optimize decisions to repository/regime calibration artifacts;
- detect support mismatch and abstain/broaden validation;
- test online recalibration as a separate experimental model.

### 2.7 Verifiable attestations

GitHub artifact attestations use Sigstore to create cryptographically signed provenance claims; in-toto defines a general attestation framework and SLSA defines build-provenance predicates.

Sources:
- https://docs.github.com/en/actions/concepts/security/artifact-attestations
- https://in-toto.io/docs/specs/
- https://slsa.dev/provenance/v1

ChangeGraph consequence:
- an Evidence Certificate should be an auditable claim about collected validation evidence, not a security guarantee;
- use a distinct predicate namespace;
- evidence records should be canonicalized and content-addressed.

---

## 3. Falsifiable hypotheses

### H1 — Adaptive evidence beats static selection

For supported change regimes and equal protected failing-test recall, a sequential evidence planner reduces median validation cost relative to a static precomputed test subset.

Null hypothesis:
- adaptive acquisition provides no meaningful cost improvement after accounting for planner overhead.

### H2 — Evidence diversity improves robustness

At equal validation cost, evidence sets spanning independent modalities have lower false-safe rate than evidence sets dominated by one correlated modality.

Null:
- diversity score adds no predictive/robustness value beyond total evidence strength.

### H3 — Mutation witnesses expose weak selection

Change-local surviving mutants predict future validation misses or under-tested affected regions better than static graph distance alone.

Null:
- mutation-witness features add no useful signal after static/history features.

### H4 — Temporal channels improve impact prediction

Temporal propagation-channel features improve precision/recall for affected entities/tests on held-out future PRs over static graph + path-affinity + simple co-change baselines.

Null:
- temporal channels provide no incremental predictive value.

### H5 — Calibrated abstention reduces false-safe outcomes under shift

A support-aware calibration gate reduces false-safe decisions for out-of-distribution changes versus an uncalibrated fixed confidence threshold, with acceptable additional fallback cost.

Null:
- shift-aware abstention only increases fallback rate without improving protected safety.

### H6 — Intent drift predicts review risk

High graph-derived intent drift correlates with increased validation failures, review corrections, or subsequent fixes after controlling for change size/fanout.

Null:
- intent drift is redundant with simple change-size features.

### H7 — Independent evidence policy matters for agent-authored changes

When one agent authors both implementation and validating tests, requiring independent evidence reduces false-safe outcomes compared with counting same-agent tests as independent confirmation.

Null:
- provenance-aware independence provides no measurable safety benefit.

---

## 4. ChangeBench experimental protocol

### 4.1 Dataset requirements

Each benchmark repository must provide:

- full commit graph/time order;
- pull-request or merge boundaries when available;
- test inventory and historical results where available;
- language/framework versions;
- reproducible build/test commands;
- repository license permitting benchmark use.

### 4.2 No future leakage

For evaluation at PR/commit N, the model may access only evidence available before N plus the current change itself.

Forbidden leakage includes:

- future failures;
- future coverage;
- future invariant observations;
- future temporal edges;
- future calibration labels;
- mutations generated using post-N fixes.

### 4.3 Splits

Use time-ordered splits:

- warm-up/calibration history;
- validation/tuning window;
- frozen held-out future window.

Never random-shuffle commits for the primary benchmark.

### 4.4 Baselines

B0 full suite.

B1 path/basename heuristics.

B2 project/file static affected graph.

B3 symbol-level static graph.

B4 static + historical co-change/co-failure.

B5 static + traces.

B6 static + traces + mutation features.

B7 adaptive evidence planner.

B8 optional learned/GNN challenger after deterministic baselines are stable.

### 4.5 Protected metrics

Primary:

- failing-test recall;
- false-safe rate;
- hard-fallback recall.

Efficiency:

- validation wall-clock ratio;
- test-count ratio;
- compute-cost ratio;
- planner overhead;
- number of evidence steps.

Calibration:

- observed miscoverage vs target within declared support region;
- coverage gap under shift;
- abstention/fallback rate;
- support-overlap diagnostics.

Mutation/invariant:

- mutation kill retention;
- surviving mutation witness rate;
- invariant drift true/false positive rate on labeled cases.

### 4.6 Statistical reporting

For every headline result:

- report per-repository distributions, not only pooled means;
- include bootstrap confidence intervals or appropriate paired tests;
- publish ablations;
- report failure cases;
- report analysis overhead;
- separate training/tuning results from frozen held-out results.

No claim should rely on one repository.

---

## 5. Adaptive Evidence Planner experiments

### Experiment A — static vs sequential tests

Candidate experiments are tests only.

Compare:
- static top-K selection;
- static threshold selection;
- adaptive selection that updates after each result.

Goal:
- prove or reject value of sequencing before introducing other evidence modalities.

### Experiment B — multi-modal evidence

Add:
- typecheck;
- build;
- mutation witnesses;
- invariants.

Measure whether heterogeneous evidence reduces cost at equal protected safety.

### Experiment C — cost model robustness

Deliberately perturb runtime estimates and measure planner degradation.

The planner must not rely on perfectly estimated costs.

### Experiment D — correlated evidence

Construct cases with many redundant tests and compare diversity-aware vs diversity-blind planning.

---

## 6. Causal-channel research methodology

### 6.1 Representation

Build candidate graph from:

- static dependencies;
- temporal co-change;
- historical failures;
- runtime traces;
- mutation interventions.

### 6.2 Evidence levels

`association` — correlation only.

`mechanistic` — static/runtime path exists.

`interventional` — controlled mutation/replay changes downstream outcome.

`replicated-interventional` — repeated intervention support across contexts.

UI and APIs must preserve the level.

### 6.3 Evaluation

Compare downstream impact prediction using:

- static only;
- temporal association;
- static + temporal;
- static + temporal + intervention features.

Never claim causal discovery solely from predictive uplift.

---

## 7. Mutation research methodology

Use bounded operators and apply only to impacted regions.

For each change:

1. generate deterministic mutants;
2. run selected evidence set;
3. record killed/survived;
4. optionally run full suite to discover whether skipped tests kill surviving mutants;
5. classify witness reason.

Important confounder:
- equivalent mutants. Maintain an explicit `possibly-equivalent` category rather than counting all survivors as weak testing.

---

## 8. Invariant research methodology

### Mining window

Use successful historical executions before the evaluated change.

### Candidate pruning

Require minimum observation support and stability.

### Evaluation

For held-out changes:

- measure invariant violations associated with genuine regressions;
- measure intentional benign drift;
- compare user-declared vs mined invariants;
- quantify false alarms.

The UI must say "likely invariant" for mined properties.

---

## 9. Metamorphic research methodology

MR lifecycle:

1. proposal;
2. executable transform/relation;
3. sandbox execution;
4. shadow-history validation where possible;
5. human acceptance or automated policy acceptance only after pre-defined evidence thresholds;
6. continuous counterexample monitoring.

Evaluate:

- MR validity;
- defect detection;
- false-positive rate;
- LLM proposal acceptance rate;
- human editing effort.

---

## 10. Evidence Certificate research

### Goal

Allow an independent verifier to confirm:

- exact commit range;
- analyzer/policy versions;
- evidence record digests;
- experiment outcomes;
- calibration artifact identity;
- decision;
- signature/provenance.

### Cryptographic structure

Canonicalize each EvidenceItem to deterministic JSON and hash with SHA-256.

Construct a Merkle tree over sorted evidence IDs. Store root in the certificate.

A verifier can request an evidence record plus Merkle proof and verify inclusion without downloading all evidence.

### Non-goal

The certificate does not prove absence of bugs or security vulnerabilities.

---

## 11. Potential publication artifacts

### Paper A — Adaptive Evidence Validation for CI

Core contribution:
- sequential evidence planning under safety constraints.

### Paper B — Change-Conditioned Mutation Witnesses

Core contribution:
- mutation adequacy focused on predicted blast radius and evidence gaps.

### Paper C — Calibrated Abstention for Selective CI

Core contribution:
- repository-specific safety envelopes and distribution-shift fallback.

### Paper D — Verifiable Evidence for Agent-Authored Pull Requests

Core contribution:
- provenance-aware independence + signed validation certificates.

These are research targets, not claims that the work is novel enough for publication until literature review and experiments confirm it.

---

## 12. Research ethics and integrity

- Publish negative results.
- Do not hide benchmark repositories where ChangeGraph performs poorly.
- Do not tune on the held-out future window.
- Do not report mutation results without discussing equivalent-mutant limitations.
- Do not call mined invariants formal specifications.
- Do not call correlation causal.
- Do not phrase conformal coverage beyond the actual assumptions/observed support region.
- Do not treat agent provenance as a proxy for inferior code without empirical evidence.
- Keep benchmark scripts, configs, model versions, and raw aggregate outputs reproducible.
