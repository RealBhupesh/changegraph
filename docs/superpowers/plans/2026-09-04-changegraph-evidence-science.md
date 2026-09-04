# ChangeGraph Evidence Science Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the proven ChangeGraph MVP into a research-grade adaptive evidence-validation system with temporal repository intelligence, mutation witnesses, sequential evidence planning, calibrated abstention, invariant/metamorphic evidence, provenance-aware policy, and verifiable evidence certificates.

**Architecture:** The evidence-science layer consumes immutable core ChangeGraph reports and adds independent packages for temporal history, experiments, evidence aggregation, mutation, calibration, invariants, metamorphic relations, provenance, and attestations. No research component may bypass the existing deterministic safety-policy boundary. New learned models are challengers behind benchmark gates, never authoritative policy inputs by default.

**Tech Stack:** Existing ChangeGraph stack plus PostgreSQL/Drizzle, TypeScript Compiler API, Vitest/Jest adapters, optional Stryker-style mutation concepts implemented through a bounded ChangeGraph mutation adapter, OpenTelemetry, canonical JSON/SHA-256, and later optional statistical-model services only after deterministic baselines exist.

**Spec:** `docs/superpowers/specs/2026-09-04-changegraph-evidence-science-design.md`

## Global Constraints

- The existing MVP and platform-expansion safety invariants remain authoritative.
- LLM output is never evidence unless converted into an executable hypothesis that is independently evaluated.
- Historical evaluation for PR N may use only information available before N plus the current change.
- Co-change/co-failure produces association evidence, not causal claims.
- Conformal/calibration language must state assumptions/support region and may trigger abstention under shift.
- Mutation survivors may be marked `possibly-equivalent`; they are not automatically treated as evidence of weak tests.
- Mined invariants are labeled likely invariants, not formal specifications.
- Agent provenance is an empirical feature, not a risk penalty by itself.
- Evidence Certificates attest to observed evidence and policy decisions; they do not prove bug freedom or security.
- All new headline metrics require frozen held-out ChangeBench results.

---

## File Structure Added by This Plan

```text
packages/
  temporal/
  evidence/
  experiments/
  mutation/
  calibration/
  invariants/
  metamorphic/
  provenance/
  attestation/
benchmarks/
  evidence-science/
```

---

### Task 1: Canonical Evidence Schema

**Files:**
- Create: `packages/evidence/src/types.ts`
- Create: `packages/evidence/src/schema.ts`
- Create: `packages/evidence/src/canonicalize.ts`
- Create: `packages/evidence/src/index.ts`
- Test: `packages/evidence/src/schema.test.ts`
- Test: `packages/evidence/src/canonicalize.test.ts`

**Interfaces:**
- Produces `EvidenceItem`, `EvidenceProvenance`, `EvidenceModality`, `canonicalEvidenceJson(item)`, and `hashEvidence(item)`.

- [ ] **Step 1: Write schema tests**

Test that strength accepts `[0,1]`, rejects values outside the range, requires `independenceGroup`, and requires exact base/head SHAs.

```ts
expect(() => parseEvidence({ ...validEvidence, strength: 1.1 })).toThrow();
expect(parseEvidence(validEvidence).modality).toBe('test-result');
```

- [ ] **Step 2: Define exact types from the evidence-science spec**

Use the modalities and provenance fields verbatim from the spec. Add `schemaVersion: 1` and `modelVersion: string`.

- [ ] **Step 3: Implement deterministic canonicalization**

Canonical JSON rules:

1. UTF-8;
2. object keys lexicographically sorted recursively;
3. arrays preserve semantic order unless field schema explicitly declares order-insensitive;
4. no `undefined` values;
5. timestamps normalized to RFC3339 UTC;
6. finite JSON numbers only.

- [ ] **Step 4: Hash evidence**

```ts
export function hashEvidence(item: EvidenceItem): string {
  return `sha256:${createHash('sha256').update(canonicalEvidenceJson(item)).digest('hex')}`;
}
```

- [ ] **Step 5: Verify deterministic hash and commit**

```bash
pnpm --filter @changegraph/evidence test
git add packages/evidence
git commit -m "feat: define canonical evidence records"
```

---

### Task 2: Temporal Repository Graph

**Files:**
- Create: `packages/temporal/src/types.ts`
- Create: `packages/temporal/src/store.ts`
- Create: `packages/temporal/src/aggregate.ts`
- Create: `packages/temporal/src/channels.ts`
- Test: `packages/temporal/src/aggregate.test.ts`
- Test: `packages/temporal/src/channels.test.ts`
- Modify: `packages/db/src/schema.ts`

**Interfaces:**
- Produces `TemporalEdgeObservation`, `PropagationChannel`, `recordGraphObservation`, `rankCandidateChannels`.

- [ ] **Step 1: Add temporal persistence tables**

Store stable node/edge keys, first/last seen commits, counts, failure/mutation/trace associations, and event timestamps.

- [ ] **Step 2: Write time-order aggregation test**

Given observations at commits A/B/C, evaluate state as of B and assert C is absent.

- [ ] **Step 3: Implement association channel extraction**

A candidate channel requires at least two historical observations before it is emitted. Channel output keeps separate `staticSupport`, `temporalSupport`, `traceSupport`, and `interventionSupport` fields.

- [ ] **Step 4: Add evidence-level enum**

```ts
export type CausalEvidenceLevel =
  | 'association'
  | 'mechanistic'
  | 'interventional'
  | 'replicated-interventional';
```

No code may upgrade a channel level without the corresponding evidence type.

- [ ] **Step 5: Test no-future-leakage and commit**

```bash
pnpm --filter @changegraph/temporal test
git add packages/temporal packages/db
git commit -m "feat: add temporal repository graph and propagation channels"
```

---

### Task 3: Validation Experiment Registry

**Files:**
- Create: `packages/experiments/src/types.ts`
- Create: `packages/experiments/src/registry.ts`
- Create: `packages/experiments/src/cost.ts`
- Test: `packages/experiments/src/registry.test.ts`

**Interfaces:**
- Produces `ValidationExperiment`, `ExperimentResult`, `ExperimentRegistry`, `estimateExperimentCost`.

- [ ] **Step 1: Define experiment kinds**

Exactly support:

```ts
'run-test' | 'run-suite' | 'typecheck' | 'build' |
'run-mutation-set' | 'check-invariants' | 'run-metamorphic-relation'
```

- [ ] **Step 2: Add deterministic experiment identity**

`id = sha256(kind + normalized subject IDs + adapter/version + config digest)`.

- [ ] **Step 3: Implement robust cost estimate**

Use median of last 7 comparable successful runs when >=3 exist; otherwise adapter/default estimate. Record estimate source and sample count.

- [ ] **Step 4: Test outlier robustness**

For historical durations `[100, 102, 98, 101, 5000]`, median estimate must remain `101`.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/experiments test
git add packages/experiments
git commit -m "feat: define validation experiments and cost model"
```

---

### Task 4: Evidence Aggregation and Diversity

**Files:**
- Create: `packages/evidence/src/aggregate.ts`
- Create: `packages/evidence/src/diversity.ts`
- Create: `packages/evidence/src/state.ts`
- Test: `packages/evidence/src/diversity.test.ts`
- Test: `packages/evidence/src/state.test.ts`

**Interfaces:**
- Produces `EvidenceState`, `aggregateEvidence(items)`, `evidenceDiversity(items)`.

- [ ] **Step 1: Write concentration tests**

For four equal-strength items in one independence group, diversity is `0`.

For four equal-strength items in four groups:

`D = 1 - 4*(0.25^2) = 0.75`.

- [ ] **Step 2: Implement group-strength aggregation**

Sum evidence strengths by `independenceGroup`, normalize group shares, compute `1 - sum(w_g^2)`.

- [ ] **Step 3: Track contradictions**

Evidence supporting safe and risk for the same subject cannot cancel silently. Store explicit conflict records with source evidence IDs.

- [ ] **Step 4: Add modality coverage summary**

Expose counts/strength by modality and independence group.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/evidence test
git add packages/evidence
git commit -m "feat: aggregate evidence with diversity and contradiction tracking"
```

---

### Task 5: Change-Local Mutation Witness Engine

**Files:**
- Create: `packages/mutation/src/types.ts`
- Create: `packages/mutation/src/operators.ts`
- Create: `packages/mutation/src/generate.ts`
- Create: `packages/mutation/src/run.ts`
- Create: `packages/mutation/src/witness.ts`
- Test: `packages/mutation/src/generate.test.ts`
- Test: `packages/mutation/src/witness.test.ts`
- Create: `fixtures/mutation-basic/`

**Interfaces:**
- Produces `Mutant`, `MutationWitness`, `generateMutants(changedEntities, graph, policy)`, `evaluateMutants`.

- [ ] **Step 1: Implement bounded operator set**

Operators:

- boolean negation;
- relational boundary;
- arithmetic substitution;
- primitive constant perturbation;
- primitive return replacement;
- conditional branch removal;
- optional guard removal when compiler confirms type-valid output.

- [ ] **Step 2: Restrict mutation scope**

Only changed entities, direct affected entities, graph-distance <=2 high-risk nodes, and configured critical paths may be mutated in the first implementation.

- [ ] **Step 3: Write deterministic mutation ID test**

Mutant ID hashes head SHA + symbol stable key + operator + source range + replacement.

- [ ] **Step 4: Implement witness classification**

Statuses:

```ts
'killed' | 'survived' | 'compile-invalid' | 'timeout' | 'possibly-equivalent'
```

Never count `compile-invalid` as killed.

- [ ] **Step 5: Test and commit**

```bash
pnpm --filter @changegraph/mutation test
git add packages/mutation fixtures/mutation-basic
git commit -m "feat: add change-local mutation witnesses"
```

---

### Task 6: Sequential Adaptive Evidence Planner

**Files:**
- Create: `packages/experiments/src/planner.ts`
- Create: `packages/experiments/src/utility.ts`
- Create: `packages/experiments/src/stop.ts`
- Test: `packages/experiments/src/planner.test.ts`
- Test: `packages/experiments/src/stop.test.ts`

**Interfaces:**
- Produces `chooseNextExperiment(state, candidates, policy)` and `shouldStopValidation(state, policy)`.

- [ ] **Step 1: Implement transparent baseline utility**

```ts
utility = expectedUncertaintyReduction
        * (1 + diversityGain)
        / Math.max(normalizedCost, 0.01);
```

Every component must be returned in the decision trace.

- [ ] **Step 2: Use deterministic expected-reduction model first**

Initial expected reduction is a weighted combination of:

- affected-subject coverage;
- evidence gap on subject;
- historical failure/mutation association;
- modality novelty;
- experiment reliability.

Weights are versioned and fixed in configuration for the baseline.

- [ ] **Step 3: Write sequential adaptation test**

Candidate tests A/B/C where A and B overlap heavily and C is independent. After A passes, assert planner can choose C over B due to reduced marginal/diversity utility.

- [ ] **Step 4: Implement stopping matrix**

Stop `validated` only if mandatory evidence, threshold, diversity floor, no critical contradiction, and calibration gate all pass. Otherwise return `continue`, `defer`, or `fallback` with reasons.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/experiments test
git add packages/experiments
git commit -m "feat: add sequential evidence acquisition planner"
```

---

### Task 7: Evidence Frontier and Minimum-Cost Plan

**Files:**
- Create: `packages/experiments/src/frontier.ts`
- Create: `packages/experiments/src/minimum-plan.ts`
- Test: `packages/experiments/src/frontier.test.ts`

**Interfaces:**
- Produces `EvidenceFrontierPoint[]` and `minimumEvidencePlan`.

- [ ] **Step 1: Implement greedy constrained plan**

Select mandatory experiments first, then repeatedly add highest marginal utility/cost experiment until policy threshold/diversity is reached or candidates exhaust.

- [ ] **Step 2: Emit frontier after every selection**

Each point includes cumulative measured/estimated cost, evidence state, diversity, and selected experiment IDs.

- [ ] **Step 3: Label estimates**

`costSource` and `evidenceEstimateVersion` are required so UI cannot present predictions as measured results.

- [ ] **Step 4: Test mandatory constraint**

A cheap plan that omits a sentinel/full-fallback requirement must never be returned.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/experiments test
git add packages/experiments
git commit -m "feat: compute minimum evidence plans and validation frontier"
```

---

### Task 8: Calibration Envelope and Shift Abstention

**Files:**
- Create: `packages/calibration/src/types.ts`
- Create: `packages/calibration/src/features.ts`
- Create: `packages/calibration/src/envelope.ts`
- Create: `packages/calibration/src/shift.ts`
- Create: `packages/calibration/src/decision.ts`
- Test: `packages/calibration/src/envelope.test.ts`
- Test: `packages/calibration/src/shift.test.ts`

**Interfaces:**
- Produces `CalibrationEnvelope`, `CalibrationDecision`, `fitBaselineEnvelope`, `assessSupport`.

- [ ] **Step 1: Implement baseline empirical calibration artifact**

Before advanced conformal methods, store empirical error/miscoverage for declared change regimes with exact sample count/window and alpha target.

- [ ] **Step 2: Define regime features**

Use change size, graph fanout, change type, config/dependency flags, domain/package, test topology, analyzer health, and provenance type.

- [ ] **Step 3: Implement conservative support-overlap gate**

Baseline uses standardized feature ranges/quantiles from calibration data. If multiple critical dimensions fall outside configured support, return `outside-support` and require broader validation.

- [ ] **Step 4: Keep conformal challenger isolated**

Define `CalibrationModel` interface so online/conformal models can be evaluated later without changing policy consumers.

- [ ] **Step 5: Test abstention and commit**

```bash
pnpm --filter @changegraph/calibration test
git add packages/calibration
git commit -m "feat: add calibrated safety envelope and shift abstention"
```

---

### Task 9: Runtime Invariant Evidence

**Files:**
- Create: `packages/invariants/src/types.ts`
- Create: `packages/invariants/src/miner.ts`
- Create: `packages/invariants/src/evaluate.ts`
- Create: `packages/invariants/src/store.ts`
- Test: `packages/invariants/src/miner.test.ts`
- Test: `packages/invariants/src/evaluate.test.ts`
- Create: `fixtures/invariants-basic/`

**Interfaces:**
- Produces `LikelyInvariant`, `InvariantObservation`, `InvariantDrift`.

- [ ] **Step 1: Support conservative invariant families**

Initial families:

- null/non-null;
- numeric min/max bound;
- equality/inequality between observed scalar fields;
- monotonic non-decrease/non-increase;
- collection size bounds.

- [ ] **Step 2: Require support threshold**

Default mined invariant requires >=30 successful observations across >=5 runs and zero contradictions in the mining window. Store these thresholds in model version.

- [ ] **Step 3: Scope mining to affected runtime probes**

Do not instrument the entire application by default. Use impacted-symbol/route scope.

- [ ] **Step 4: Distinguish drift classes**

```ts
'maintained' | 'suspicious-drift' | 'declared-intentional' | 'insufficient-data'
```

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/invariants test
git add packages/invariants fixtures/invariants-basic
git commit -m "feat: add change-local runtime invariant evidence"
```

---

### Task 10: Metamorphic Relation Lifecycle

**Files:**
- Create: `packages/metamorphic/src/types.ts`
- Create: `packages/metamorphic/src/registry.ts`
- Create: `packages/metamorphic/src/execute.ts`
- Create: `packages/metamorphic/src/promote.ts`
- Test: `packages/metamorphic/src/registry.test.ts`
- Test: `packages/metamorphic/src/promote.test.ts`

**Interfaces:**
- Produces `MetamorphicRelation`, `MetamorphicRun`, lifecycle transitions.

- [ ] **Step 1: Define lifecycle**

```ts
'proposed' | 'executable' | 'shadow-validating' | 'accepted' | 'rejected'
```

- [ ] **Step 2: Require executable transform and oracle relation**

An LLM text suggestion alone remains `proposed` and contributes zero evidence strength.

- [ ] **Step 3: Implement promotion gate**

Default automatic recommendation requires >=20 shadow runs, zero known counterexamples, and explicit domain scope. Final acceptance remains repository-owner controlled in V1.

- [ ] **Step 4: Persist counterexamples**

A counterexample is immutable audit data and automatically suspends accepted relation pending review.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/metamorphic test
git add packages/metamorphic
git commit -m "feat: add shadow-validated metamorphic evidence"
```

---

### Task 11: Provenance and Independent Evidence Policy

**Files:**
- Create: `packages/provenance/src/types.ts`
- Create: `packages/provenance/src/classify.ts`
- Create: `packages/provenance/src/independence.ts`
- Test: `packages/provenance/src/independence.test.ts`
- Modify: `packages/policy/src/decide.ts`

**Interfaces:**
- Produces actor/evidence provenance classification and independence requirements.

- [ ] **Step 1: Implement neutral actor classification**

Actor type is metadata only. No default risk points are added merely because actor is an agent.

- [ ] **Step 2: Detect same-origin validation**

If implementation and newly added validating test share the same autonomous run/agent provenance, place them in the same independence group.

- [ ] **Step 3: Add policy condition for high-risk same-origin validation**

For high-risk changes, if all positive evidence originates from the same autonomous run as the change, require an independent modality or broader validation.

- [ ] **Step 4: Test no discrimination by label alone**

Human and agent changes with identical evidence/provenance independence must receive identical policy results unless repository policy explicitly declares otherwise.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/provenance test
pnpm --filter @changegraph/policy test
git add packages/provenance packages/policy
git commit -m "feat: add provenance-aware independent evidence policy"
```

---

### Task 12: Intent Drift Evidence

**Files:**
- Create: `packages/evidence/src/intent.ts`
- Create: `packages/evidence/src/intent-drift.ts`
- Test: `packages/evidence/src/intent-drift.test.ts`

**Interfaces:**
- Produces `IntentScope`, `ObservedScope`, `IntentDriftResult`.

- [ ] **Step 1: Keep declared-intent extraction separate**

Natural-language normalization may use an LLM adapter, but the result must be a candidate set with evidence/provenance and must never alter observed blast radius.

- [ ] **Step 2: Implement deterministic drift metrics**

Compute Jaccard overlap over normalized domains/entities plus counts of unexpected and unfulfilled scope.

- [ ] **Step 3: Add size-controlled feature export**

Export drift features to ChangeBench so H6 can be tested controlling for changed lines/files/fanout.

- [ ] **Step 4: Test missing intent**

No PR description yields `status: 'unavailable'`, not high drift.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/evidence test
git add packages/evidence
git commit -m "feat: measure declared versus observed change intent"
```

---

### Task 13: Evidence Graph, Merkle Root, and Certificate

**Files:**
- Create: `packages/attestation/src/types.ts`
- Create: `packages/attestation/src/merkle.ts`
- Create: `packages/attestation/src/predicate.ts`
- Create: `packages/attestation/src/verify.ts`
- Test: `packages/attestation/src/merkle.test.ts`
- Test: `packages/attestation/src/verify.test.ts`

**Interfaces:**
- Produces `ChangeGraphEvidencePredicateV1`, `buildEvidenceRoot`, `createCertificate`, `verifyEvidenceInclusion`.

- [ ] **Step 1: Implement deterministic leaf ordering**

Sort leaves by evidence ID before Merkle construction. Leaf hash is the evidence canonical SHA-256 digest.

- [ ] **Step 2: Write inclusion-proof test**

For four evidence leaves, build root, generate proof for leaf 2, verify success, mutate leaf payload, verify failure.

- [ ] **Step 3: Create distinct predicate namespace**

Use `https://changegraph.dev/attestations/evidence/v1`; do not reuse SLSA predicate types.

- [ ] **Step 4: Add decision/policy/calibration identities**

Certificate references exact analyzer, policy, calibration, and experiment versions plus evidence root.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @changegraph/attestation test
git add packages/attestation
git commit -m "feat: add verifiable ChangeGraph evidence certificates"
```

---

### Task 14: ChangeBench Evidence-Science Harness

**Files:**
- Create: `benchmarks/evidence-science/src/dataset.ts`
- Create: `benchmarks/evidence-science/src/splits.ts`
- Create: `benchmarks/evidence-science/src/baselines.ts`
- Create: `benchmarks/evidence-science/src/metrics.ts`
- Create: `benchmarks/evidence-science/src/run.ts`
- Create: `benchmarks/evidence-science/src/report.ts`
- Test: `benchmarks/evidence-science/src/splits.test.ts`
- Test: `benchmarks/evidence-science/src/metrics.test.ts`

**Interfaces:**
- Produces frozen time-ordered evaluations for hypotheses H1-H7.

- [ ] **Step 1: Enforce time-ordered split API**

Random split helper does not exist in the primary benchmark package.

- [ ] **Step 2: Implement baseline registry B0-B7**

Each baseline declares exactly which modalities/history it is allowed to use.

- [ ] **Step 3: Add protected metrics**

Implement failing-test recall, false-safe rate, hard-fallback recall, runtime/test/compute ratios, mutation retention, calibration gap, abstention rate, evidence diversity, and planner overhead.

- [ ] **Step 4: Add leakage sentinel test**

Inject a future-only failure signal and assert evaluator for earlier PR cannot observe it.

- [ ] **Step 5: Emit machine + human report**

Produce JSON with per-repository raw aggregates and Markdown summary with CIs/negative results slots generated from actual data only.

- [ ] **Step 6: Commit**

```bash
pnpm --filter @changegraph/changebench-evidence test
git add benchmarks/evidence-science
git commit -m "feat: benchmark adaptive evidence validation without future leakage"
```

---

## Evidence Science Verification Gate

Before claiming this research layer is implemented:

### 1. Full test/typecheck

```bash
pnpm typecheck
pnpm test
```

Expected: all existing MVP/platform tests plus evidence-science tests pass.

### 2. Deterministic fixture replay

Run a fixture where one changed symbol affects two correlated unit tests and one independent integration test. Verify:

- evidence records are canonical/hash-stable;
- sequential planner changes ranking after the first result;
- diversity value changes as expected;
- no hard fallback is bypassed.

### 3. Mutation witness fixture

Verify a scoped mutant survives the initial selected tests, causes negative evidence, and triggers another experiment or fallback.

### 4. Shift fixture

Use a change pattern outside the calibration support range and assert Optimize validation abstains/broadens rather than returning validated.

### 5. Certificate verification

Build a certificate, verify all evidence inclusions, mutate one record, and assert verification fails.

### 6. Leakage audit

Run historical replay with an injected future-only feature and confirm it cannot influence earlier predictions/calibration.

### 7. Benchmark claims

No README/portfolio metric may be updated until a frozen ChangeBench run has completed on multiple repositories with versioned dataset manifests and stored outputs.

---

## Learned-Model Gate

GNN/learned ranking work may begin only after B0-B7 deterministic benchmark infrastructure is stable.

A learned challenger must:

- train only on time-prior data;
- be evaluated on frozen future windows;
- include ablations;
- report inference/training overhead;
- beat the strongest deterministic baseline on a pre-declared objective without worsening protected false-safe/fallback constraints;
- remain non-authoritative until separately approved by policy design.

If it fails these criteria, keep the deterministic planner.
