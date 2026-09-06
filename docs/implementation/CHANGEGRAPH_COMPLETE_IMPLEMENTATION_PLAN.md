# ChangeGraph — Complete Implementation Plan for Cursor Composer

> **Canonical implementation brief.** Synced from the user-maintained Notion source of truth on 2026-09-06. This document defines modules, contracts, execution behavior, persistence, APIs, UI, tests, and dependency order. It is a single execution brief for Cursor Composer—not a business plan or a calendar roadmap.
>
> Source: https://app.notion.com/p/3d3144f9056e8188816be7cfdcc2ae78?pvs=204

## 1. Cursor Execution Instructions

Use this document with the ChangeGraph repository open. The repository has not been inspected as part of writing this specification; discover existing implementations before deciding which files to create.

```text
Implement the complete specification below in the existing ChangeGraph repository.

1. Read repository instructions, package manifests, workspace configuration,
   architecture documentation, migrations, and existing tests first.
2. Preserve working features and uncommitted user changes. Extend existing
   modules rather than building a disconnected second application.
3. Map the logical packages and interfaces in this document to the actual
   repository. Keep its package manager, framework, ORM, queue, auth,
   logging, and component conventions wherever they already exist.
4. Execute the dependency-ordered work units in Section 27. These are
   implementation checkpoints, not dates or separate planning exercises.
5. Write failing tests, implement real behavior, run the tests, and connect
   each module to the application. Do not stop after generating scaffolding.
6. Do not replace difficult behavior with always-successful mocks, TODO
   implementations, disabled tests, fabricated proofs, or hardcoded demo results.
7. Use deterministic local fixtures for development. Test doubles are allowed
   at external boundaries in tests, not as production verifier implementations.
8. Run focused tests after each unit, then integration tests, typechecking,
   linting, build, and the complete end-to-end fixture suite.
9. If an external credential or runtime dependency is unavailable, implement
   its adapter and configuration checks, test the boundary locally, and report
   the live verification as blocked. Continue independent work. Do not claim
   an unexecuted integration succeeded.
10. Keep implementation status and exact verification commands in
    docs/implementation/changegraph-status.md so execution can resume without
    losing decisions. Record actual results, not anticipated results.
11. Do not deploy, merge, overwrite user work, or auto-commit unless separately
    authorized. Finish with changed files, executed checks, and remaining blockers.

The required output is working integrated code and tests, not another plan.
```

## 2. Required End-to-End Behavior

Given a repository, exact base/head revisions, a reviewed semantic contract, and supported fixtures, ChangeGraph must:

1. Resolve symbols and observables.
2. Validate permitted changes and preserved promises.
3. Generate deterministic verification obligations.
4. Execute base and head against identical controlled inputs.
5. Run independent boundary challenges and differential fuzzing.
6. Evaluate properties and distinguish expected from unexpected behavior.
7. Minimize and replay counterexamples.
8. Produce candidate regression tests.
9. Attempt bounded symbolic verification where supported.
10. Reuse valid evidence or proofs conservatively.
11. Render a Behavioral Diff in the CLI, web application, and GitHub Check.
12. Export an integrity-verifiable Evidence Passport.
13. Revalidate repair candidates without weakening the specification.
14. Recheck actual merge-queue compositions.
15. Preserve explicit failures, unsupported cases, timeouts, and unknowns throughout the system.

**Required innovative modules:** Contract Scope Firewall, Behavioral Diff/Witness Explorer, Independent Challenge Lab, Evidence Passport, Repair Lab, Behavioral Memory, and Interaction Sentinel. Implement each as a connected bounded capability, not a placeholder landing page.

## 3. Non-Negotiable Implementation Rules

- Tests and fuzzing can produce `supported`, never `proven`.
- Solver `UNKNOWN`, translation failure, missing artifacts, and exhausted budgets cannot become success.
- A valid signature establishes artifact authenticity/integrity, not software correctness.
- Base behavior is a compatibility reference, not a universal correctness oracle. Evaluate independent properties on both revisions.
- The code-writing agent cannot silently relax obligations, input domains, normalizers, ignored fields, or policy.
- An empty domain, zero relevant executions, or unresolved required subject cannot satisfy an obligation by omission.
- Every result is bound to tenant, repository, exact revisions, contract, policy, and execution configuration.
- Repository code and generated artifacts are untrusted. They cannot self-issue a trusted result or access signing credentials.
- Existing CI remains intact. ChangeGraph adds evidence; it does not silently replace required checks.
- No automatic commit, merge, deployment, or production rollback.
- No cross-tenant fixture, proof, or incident-data reuse without explicit authorization.

## 4. Repository Structure and Dependency Boundaries

Use these as logical ownership boundaries. Reuse matching packages if present; create a package only with its implementation, tests, and application wiring.

```text
packages/
  semantic-contract/       # strict schemas, predicate AST, digesting, scope diff
  obligations/             # subject resolution and deterministic obligations
  observables/             # observation schemas, normalization, comparators
  verifier-core/           # adapter contracts, result validation, budgets
  verifier-differential/   # isolated twin execution and observation comparison
  verifier-fuzz/           # generators, corpus, challenge provenance
  verifier-symbolic/       # TypeScript subset, IR, SMT translation
  counterexample/          # validity-preserving shrink, replay, test generation
  proof-memory/            # case/proof storage and conservative invalidation
  semantic-delta/          # classification, planner, policy/report projection
  attestations/            # manifests, evidence tree, signing, offline checking

apps/
  worker/                  # orchestration and disposable execution
  cli/                     # contract, analyze, replay, verify, repair commands
  web/                     # existing API/UI framework and GitHub integration

fixtures/semantic-delta/
  pricing/
  authorization/
  stateful-retry/
  merge-interaction/
  symbolic/
  hostile-inputs/

docs/implementation/
  changegraph-status.md
  supported-semantics.md
  execution-security.md
  local-verification.md
```

### Dependency direction

- Domain packages must not import web routes, UI components, or ORM clients.
- Verifier adapters depend on `verifier-core`, shared contracts, and observables.
- Orchestration depends on adapter interfaces; verifier implementations do not schedule themselves.
- Persistence and object storage sit behind injected repositories/stores.
- CLI, API, worker, GitHub Checks, and UI consume the same versioned report model.
- Use one deterministic policy evaluator; do not duplicate pass/fail logic in the frontend.

## 5. Canonical Types and Runtime Schemas

Implement runtime validation for every boundary using the repository’s validation library, or strict Zod schemas if none exists. Reject unknown security-critical fields.

```typescript
export type Digest = `sha256:${string}`;
export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type EvidenceState =
  | 'proven' | 'supported' | 'falsified' | 'unknown' | 'unsupported';
export type PolicyDecision = 'permit' | 'block' | 'needs-review';
export type Json =
  | null | boolean | number | string | Json[] | { [key: string]: Json };

export interface RunBinding {
  tenantId: string;
  repositoryId: string;
  baseSha: string;
  headSha: string;
  contractDefinitionDigest: Digest;
  contractBindingDigest: Digest;
  policyDigest: Digest;
  executionConfigDigest: Digest;
}

export interface VerificationObligation {
  id: string;
  digest: Digest;
  kind: 'allowed-relation' | 'preservation' | 'property';
  subjectId: string;
  observableId: string;
  severity: Severity;
  required: boolean;
  inputDomainDigest: Digest;
  predicateDigest: Digest;
  assumptionDigests: Digest[];
}

export interface ObligationResult {
  runId: string;
  attemptId: string;
  binding: RunBinding;
  obligationId: string;
  obligationDigest: Digest;
  state: EvidenceState;
  method: string;
  verifierVersion: string;
  applicableInputCount: number;
  executedInputCount: number;
  domainSatisfied: boolean | null;
  evidenceDigests: Digest[];
  witnessDigest?: Digest;
  proofArtifactDigest?: Digest;
  proofModelDigest?: Digest;
  reasonCode?: string;
  durationMs: number;
}
```

These are the minimum interface fields, not permission to leave referenced types or schemas undefined. Complete all types, exports, serialization, and schema tests during implementation.

### Enforced invariants

- A replay-confirmed runtime falsification includes a valid witness reference.
- A solver countermodel that cannot be replayed is retained as model evidence and does not masquerade as a confirmed runtime regression.
- `proven` requires a trusted supported verifier, a satisfiable nonempty domain, model/assumption digests, and persisted solver evidence. Independently checkable proof artifacts are identified separately from solver receipts.
- `supported` requires applicable successful executions and no observed violation for that attempt; it cannot satisfy a stronger method requirement.
- Failed, timed-out, or cancelled attempts remain recorded. Any report of completed evidence also shows incomplete work.
- Repeated runs get separate identities; deterministic content digests exclude incidental IDs and timestamps where appropriate.

## 6. Executable Semantic Contract

Implement `.changegraph/contract.yml` and `.changegraph/policy.yml`. Descriptive text is not executable code.

### Predicate language

Use a typed AST, never `eval`, `Function`, shell interpolation, or arbitrary expression strings.

```typescript
export type Operand =
  | { literal: Json }
  | { source: 'input' | 'base' | 'head'; path: string[] }
  | { op: 'add' | 'sub' | 'mul'; args: [Operand, Operand] };

export type Predicate =
  | { op: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte'; args: [Operand, Operand] }
  | { op: 'and' | 'or'; args: Predicate[] }
  | { op: 'not'; arg: Predicate };
```

- Type-check operand compatibility before execution. Ordering is numeric in the initial implementation; equality follows the approved typed value semantics.
- Reject missing paths, non-finite arithmetic, invalid numeric units, excessive nesting, oversized literals, unknown operators, and illegal property keys.
- Numeric function-fixture domains initially use safe integers. Reject arithmetic outside the permitted exact range rather than approximating it.
- Define `base` and `head` paths against the normalized return payload of the selected observable. Missing return payloads cannot compare equal merely because both are absent.
- Exceptions, process crashes, timeouts, and protocol errors have separate observation statuses. Contract predicates requiring returns specify how exceptions are handled; infrastructure failure is not a business-value return.

### Concrete fixture contract

The schema must accept this example as written. `step` means an offset from `min`; the selected range makes percentage calculations exact in integer cents.

```yaml
version: 1
intent:
  summary: Increase premium discount from 10 percent to 20 percent
  type: behavioral-change
inputDomain:
  type: object
  additionalProperties: false
  fields:
    subtotalCents:
      type: integer
      min: 0
      max: 100000
      step: 100
    tier:
      type: enum
      values: [standard, premium]
observables:
  - id: pricing-output
    subjectId: pricing.calculateDiscount
    kind: return-value
    normalizer: identity-json-v1
    comparator: exact-json-v1
obligations:
  - id: premium-discount-relation
    kind: allowed-relation
    subjectId: pricing.calculateDiscount
    observableId: pricing-output
    severity: high
    required: true
    when:
      op: eq
      args:
        - {source: input, path: [tier]}
        - {literal: premium}
    assert:
      op: eq
      args:
        - op: mul
          args:
            - {source: head, path: [discountCents]}
            - {literal: 10}
        - op: mul
          args:
            - {source: input, path: [subtotalCents]}
            - {literal: 2}
  - id: standard-discount-preserved
    kind: preservation
    subjectId: pricing.calculateDiscount
    observableId: pricing-output
    severity: critical
    required: true
    when:
      op: eq
      args:
        - {source: input, path: [tier]}
        - {literal: standard}
    assert:
      op: eq
      args:
        - {source: head, path: [discountCents]}
        - {source: base, path: [discountCents]}
  - id: discount-upper-bound
    kind: property
    subjectId: pricing.calculateDiscount
    observableId: pricing-output
    severity: critical
    required: true
    assert:
      op: lte
      args:
        - {source: head, path: [discountCents]}
        - {source: input, path: [subtotalCents]}
```

Also include a lower-bound property, explicit return-shape validation, and tests for invalid input domains in the actual fixture files.

### Canonicalization and binding

- Parse with size, nesting, duplicate-key, and YAML alias limits; disable custom executable tags.
- Canonicalize validated content using one documented JSON canonicalization implementation; preserve order where semantically meaningful.
- Compute `contractDefinitionDigest` from executable definitions, scope, assumptions, and versioned observable configuration.
- Compute `contractBindingDigest` from the definition digest, tenant/repository identity, exact base/head revisions, policy digest, and execution configuration.
- Store approvals separately, referencing the approved definition and permitted binding scope. Never include mutable approval state in a previously computed content digest.

## 7. Contract Scope Firewall and Approval

Implement:

```text
parseContract
validateContract
resolveSubjects
diffContractScope
evaluateApprovalRequirements
bindContractToRevision
```

### Required checks

- Deleted preservation/property obligations.
- Broadened allowed-change selectors.
- Narrowed input domains or newly impossible preconditions.
- Relaxed bounds, added ignored fields, changed comparators/normalizers.
- Changed critical subject mappings or mandatory repository rules.
- Duplicate IDs, missing subjects, missing observables, and contradictory requirements.

Classify changes conservatively. If semantic weakening cannot be determined, return `needs-review`; do not claim to decide arbitrary logical implication.

### Approval behavior

- Load trusted policy from the authorized repository configuration/baseline, not blindly from code under test.
- Validate reviewer permission and bind the approval to the exact reviewed definition.
- Critical changes require the configured independent reviewer or an explicit audited exception.
- A repair may reuse approval for unchanged semantic scope only when policy allows it; execution binding and evidence are always regenerated.
- CLI local analysis can run without external approval, but its report is visibly advisory and cannot fabricate an authorized merge-gate approval.

**Tests:** rejected weakening, accepted authorized revision, stale approval, unknown mapping, impossible guard, missing observation, and unauthorized policy modification.

## 8. Subject Resolution and Obligation Generation

- Use the existing ChangeGraph impact graph and stable symbol keys where available.
- Resolve explicit fixture adapter mappings first; use the TypeScript Compiler API for symbol/import resolution.
- Generate one deterministic obligation per executable contract rule, plus mandatory policy rules and critical out-of-scope impact preservation checks.
- Derive stable obligation IDs/digests from semantic content, not array position or database sequence.
- Sort generated output deterministically.
- Retain unresolved required subjects as explicit unresolved entries.
- Check that each guarded obligation has a nonempty applicable domain. A finite-domain witness or supported solver satisfiability check can establish this; inability to establish it remains unknown.
- A declared change relation is checked even if no base/head divergence occurred. A no-op implementation may violate a required change.
- Approved scope does not override independent invariant failures.

**Tests:** stable snapshots, reordered unrelated rules, changed predicate invalidation, critical impacted node outside scope, no-op change, and conflicting selectors.

## 9. Observable Framework

Implement a versioned adapter registry, runtime schemas, and pure deterministic normalizers/comparators.

### Required adapters

- **Function fixture:** return values and exceptions from a declared exported function.
- **HTTP fixture:** method, path, query, headers, request body; response status, selected headers, and body. Run a local isolated server with stubbed outbound dependencies.
- **State-transition fixture:** a bounded command sequence with initial state and declared observations after each command.
- **PostgreSQL effect fixture:** selected tables/columns in a disposable fixture database, including final state and business events.

### Observation statuses

```text
returned
threw
timed-out
crashed
protocol-error
nondeterministic
```

Preserve status independently of the serialized payload. Encode supported special values explicitly or reject them; never silently coerce `undefined`, `NaN`, cycles, or unsupported objects into ordinary JSON.

### Comparison rules

- Sort object keys, not arrays, unless the contract declares an order-insensitive comparator.
- HTTP header casing may be normalized; cookies, status, authorization, and monetary fields cannot be silently ignored.
- DB row ordering requires a declared stable key; missing keys cause ambiguity, not accidental positional equivalence.
- Time/random normalization must be declared, versioned, and included in the binding.
- Golden snapshots cover missing fields, nulls, exceptions, nested objects, numeric boundaries, ordering, and redaction.

## 10. Isolated Counterfactual Twin Runner

Implement one execution coordinator and a pluggable disposable sandbox provider.

### Run sequence

1. Authorize the repository and validate exact commit identifiers.
2. Create two clean detached worktrees or immutable source bundles outside the user’s working tree.
3. Prepare locked dependencies in constrained build environments.
4. Start independent base/head execution environments with the same fixture, seed, logical clock, configuration, and declared resources.
5. Send validated cases through a size-bounded protocol to a trusted harness.
6. Collect observations; evaluate contract predicates outside the repository process.
7. Persist evidence, classify results, and dispose of all temporary resources.

### Resource and determinism controls

- No inherited host secrets, SSH agents, signing keys, privileged sockets, or ambient cloud credentials.
- Read-only source where possible; bounded temporary writable directories.
- CPU, memory, process count, output size, disk, per-case timeout, and total run deadline.
- Deny outbound network; permit only fixture-local services and explicit preparation allowlists.
- Freeze supported clock APIs and seed supported randomness. Cryptographic randomness and unsupported schedulers require explicit adapter handling or an unsupported/nondeterministic result.
- Never share a mutable fixture database or filesystem between base and head.
- Cancel the complete descendant process tree on timeout/cancellation and release leases.
- Repeat selected cases to identify nondeterminism. Repetition is evidence, not proof of universal determinism.

### Providers

Implement a local fixture-development provider and the configured isolated worker provider. The local provider is clearly restricted to trusted fixtures. Containers are packaging, not a complete hostile-code isolation claim; use hardened disposable machines or a suitable stronger runtime for untrusted workloads. Never silently fall back to host execution when isolation is unavailable.

## 11. Independent Challenge Lab and Differential Fuzzing

Implement generators, corpus storage, provenance, mutation operators, and budgeted execution.

### Generation order

1. Explicit approved fixture cases.
2. Boundary cases from the input schema.
3. Reviewed regression witnesses applicable to the current contract.
4. Seeded property-based generation.
5. Mutation-informed and coverage-guided generation when instrumentation is supported.

Use the existing property-testing library or a pinned `fast-check` integration. Persist generator version, seed, shrink path, domain digest, and corpus membership.

### Required challenge families

- Integer bounds, zero, sign, rounding boundaries, missing optional fields, and enum transitions.
- Expired/absent entitlements and cross-tenant ownership.
- Duplicate requests, retries, and reordered commands only for adapters that declare those sequences valid.
- Contract attacks: removed obligations, weakened comparators, zero applicable cases, and forged execution output.
- Mutants for comparison operators, constants, branch conditions, and removed authorization guards on the supported AST subset.

### Independent corpus controls

Keep challenge storage outside repository execution. Record whether a case is development, regression, or holdout data. Revealing a failure consumes its holdout status; move it into regression memory and use fresh held-out cases for subsequent evaluation. The tested program sees its inputs, so do not claim perfect secrecy or independence from repeated adaptive queries.

### Search objective

Use deterministic tie-breaking and a documented score for newly exercised changed symbols, new branch pairs, critical observables, and previously unresolved obligations. Coverage instrumentation absence is explicit; do not synthesize coverage numbers.

Passing fuzz cases produce `supported` evidence over executed inputs, not proofs. Invalid generated inputs are counted separately and cannot inflate coverage.

## 12. Counterexamples, Minimization, and Regression Tests

### Witness record

Store input, input-domain digest, base/head observations, violated obligation, exact run binding, environment fixture digest, seeds, artifact references, reproduction outcome, and minimization trace.

### Shrink algorithm

- Generate smaller candidate inputs in a deterministic order.
- Revalidate each candidate against the input schema and obligation guard.
- Re-execute base and head in the required controlled environment.
- Accept a shrink only if it preserves the same relevant violation and remains reproducible.
- Shrink numbers, strings, arrays, object fields, and bounded command sequences using type-specific reducers.
- Stop on fixed attempt/time budgets; retain the smallest confirmed witness found.
- Use `locally-minimized` rather than `globally-minimal` unless exhaustive minimality was actually established. Budget exhaustion is not irreducibility.

### Replay

`changegraph witness replay` verifies artifact digests and bindings before execution. Never execute arbitrary commands embedded in a witness; reconstruct an allowlisted invocation from validated metadata.

### Regression-test generation

Generate a Vitest candidate containing the minimized input and approved expected relation/property. For a preservation regression, validate that the base passes and faulty head fails. For an intended-change property, the direction may differ; derive it from the obligation rather than a hardcoded base-pass rule. A repaired candidate must pass the same assertion without changing the contract.

Export a patch for review. Do not auto-commit or count a repair-author-generated test as independent holdout evidence.

## 13. TypeScript Verification IR and SMT Adapter

Implement a real bounded symbolic path after the executable differential path works.

### Initial supported subset

- Boolean and safe-integer inputs with explicit bounds.
- Immutable local bindings, conditionals, comparisons, bounded arithmetic, and statically known object fields.
- Pure direct calls that can be safely inlined within configured depth/size limits.
- Explicitly bounded enums and nullability with tagged encodings.

Start with this subset. Strings with complex operations, floating-point arithmetic, prototypes, reflection, dynamic import, arbitrary async scheduling, I/O, native code, `eval`, unbounded recursion, and unsupported exception semantics must be rejected with specific reasons.

### Required components

```text
TypeScript AST classifier
supported-subset validator
typed IR builder
reference IR interpreter
SMT encoder
solver process adapter
countermodel decoder
proof/solver receipt serializer
```

Use a pinned Z3-compatible backend behind the adapter. Do not fake solver results when the executable/package is missing.

### Soundness requirements

- Model JavaScript semantics faithfully within the declared subset. Mathematical integer arithmetic is not a sound replacement for arbitrary JavaScript `number` operations.
- Establish bounds preventing precision loss for every admitted operation, or reject the operation. Model signed zero and special values if admitted; otherwise exclude them explicitly.
- Differentially test the IR interpreter against actual JavaScript execution using generated and adversarial inputs.
- Establish domain satisfiability before accepting an equivalence proof; an unsatisfiable precondition must not create a useful-looking vacuous proof.
- Encode the negation of the required relation/property under the explicit domain.
- `UNSAT`: persist formula, assumptions, solver configuration/version, and evidence of supported translation; classify as proven in that model only.
- `SAT`: decode the countermodel and replay it in actual base/head code. A replay mismatch becomes a translation/model issue, not a confirmed application bug.
- `UNKNOWN`, timeout, missing solver, or unsupported syntax: retain the reason and run available alternative methods.

Proof-checkable artifacts and trusted-solver receipts are distinct artifact types. Only claim independent proof checking when the checker actually ran.

## 14. Behavioral Memory and Proof Reuse

Implement two separate stores.

### Case memory

Reviewed fixtures, incident witnesses, regression tests, owner-approved promises, and applicability metadata. Importing an incident creates a proposed promise that needs approval. If both versions violate it, label the failure pre-existing.

### Proof memory

Store only formal summaries under proof-specific schema. Keep empirically supported summaries in a separate evidence category so names and UI cannot imply proof.

Required reuse inputs:

```text
tenant + repository
subject semantic digest + obligation shape
transitive dependency fingerprint
input domain + assumptions
observable + comparator + normalizer digests
compiler and configuration digests
verifier/model version + retained evidence
```

Track reverse dependency edges. A missing dependency, dynamic unresolved import, incompatible verifier, changed normalizer, or unavailable proof artifact forces rechecking. Never reuse by file timestamp, symbol name, or previous green Check alone.

Separate a cached lemma from a PR certificate: a lemma may be reused if its conditions match, but every new revision needs a new report and binding.

**Tests:** unrelated change preserves an eligible summary; changed transitive dependency invalidates it; hidden/missing dependency forces conservative recheck; tenant mismatch prevents lookup; case memory is never promoted to proof.

## 15. Hybrid Planner, Budgets, and Result Aggregation

### Adapter contract

```typescript
export interface VerifierAdapter {
  id: string;
  version: string;
  supports(input: VerificationInput): SupportResult;
  estimateCost(input: VerificationInput): CostEstimate;
  verify(
    input: VerificationInput,
    context: VerificationContext,
  ): Promise<VerificationAttempt>;
}
```

Implement all referenced types, including cancellation, resource budget, artifact store, structured logging, and trusted result collection.

### Planning behavior

- Order required obligations by severity, then deterministic stable ID.
- Use mandatory replay/invariant checks and applicable cached evidence first.
- Choose symbolic, fuzzing, or stateful checks using declared capability and estimated cost.
- Record live hypotheses, experiment choices, consumed budget, and unresolved obligations.
- After a confirmed violation, retain the witness; optional further search obeys policy and remaining budget.
- A clean run reduces only the uncertainty actually addressed. Do not convert “no witness found” into universal elimination of a hypothesis.

### Aggregation rules

- Preserve every attempt; never replace an earlier failure with the latest passing attempt.
- Confirmed reproducible falsification takes precedence for the affected binding.
- Contradictory proof and runtime evidence triggers an integrity/translation investigation and blocks permission; do not pick the more favorable result.
- Partial supported evidence remains visible when other required work times out.
- Distinguish unsupported adapter capability from unknown analysis outcome.

### Policy evaluator

Return `permit`, `block`, or `needs-review` plus structured reasons. The default blocks required falsifications and requests review for required unresolved obligations, missing approvals, insufficient evidence methods, or incomplete execution. A permit requires an approved current binding and all required policy conditions. Overrides are separate audited decisions, not edits to evidence.

## 16. Evidence Passport and Offline Verification

Implement a versioned manifest compatible with an in-toto-style predicate where appropriate.

### Manifest contents

- Run binding and exact revisions.
- Contract definition, approval receipts, policy, and execution configuration.
- Every required obligation and its result, including unresolved states.
- Input/corpus, tool, compiler, solver, environment, comparator, and normalizer digests.
- Evidence leaves, witness references, proof receipts/artifacts, reuse lineage, and report digest.
- Completion status, optional signature metadata, and recorded overrides.

### Evidence tree

Hash canonical manifests and artifact bytes using distinct, versioned domain prefixes. Sort leaf identities deterministically, preserve multiplicity where required, and specify odd-node handling. Persist test vectors. Exclude the signature from the digest it signs. Avoid hidden dependencies on database row order or wall-clock time.

### Verification modes

- `integrity`: validate schema, digests, manifest relationships, configured trust roots, and signature if present.
- `replay`: explicitly authorized isolated execution using retained code and fixtures.
- `proof`: independently check supported proof artifacts when a checker is configured.

Implement local unsigned export and a real configured signing adapter. Missing signing configuration yields an unsigned artifact, never a fake signature. Signing credentials remain outside execution sandboxes.

Offline verification reports the freshness of revocation information; it cannot assert current non-revocation without a trusted current source. Archive extraction rejects path traversal, symlinks escaping the target, oversized files, and decompression bombs.

## 17. Repair Lab

Implement evaluation of supplied candidate patches/SHAs. A configured coding-agent provider may propose candidates, but candidate evaluation works without an LLM.

1. Accept a valid witness and an approved semantic contract definition.
2. Validate candidate provenance and create an isolated worktree per candidate without modifying the user’s working tree.
3. Produce a fresh execution binding for each candidate revision.
4. Replay the original witness, fresh challenges, preservation obligations, and required existing tests.
5. Rank by required failures, unresolved requirements, verified evidence coverage, then patch scope and execution cost.
6. Return results and an exportable patch for human review.

No candidate may win by deleting a test, weakening the domain, changing the comparator, or altering trusted policy. Such changes are separately flagged for review.

Enforce per-candidate and aggregate budgets. Test cancellation, candidate SHA substitution, overfitting to a revealed witness, contract changes, malformed patches, and path traversal. No auto-merge.

## 18. Interaction Sentinel and Merge Composition

Integrate actual merge-queue revisions, not hypothetical combined green badges.

- Resolve the queue candidate SHA and its base revision.
- Rebind contracts and mandatory promises to the composed revision.
- Reconcile overlapping contracts; unresolved conflicts require review.
- Prioritize shared subjects/dependencies, but retain mandatory checks and conservative fallback when impact information is incomplete.
- Cancel obsolete work when the queue changes.
- Issue evidence only for the exact tested composition.

### Required fixture

A service preserves `workers × batchSize <= 10`.

- Base: `2 × 2 = 4`.
- PR A: `4 × 2 = 8`.
- PR B: `2 × 4 = 8`.
- Actual composition: `4 × 4 = 16`, which must be falsified.

The test creates real local Git commits/branches and verifies each individual revision and the composed candidate. Do not hardcode the expected report without execution. Avoid enumerating all possible PR subsets; verify the actual composition and bounded explicitly requested candidates.

## 19. Stateful Rehearsal

Implement the bounded state-transition and PostgreSQL adapters, not an unrestricted production digital twin.

### Fixture schema

Initial snapshot → validated command sequence → controlled dependency responses → expected observables/invariants.

### Required cases

- Duplicate payment-like request cannot create a duplicate ledger effect.
- Retry after a declared transient failure preserves the approved invariant.
- Authorization/entitlement transitions preserve tenant ownership.
- A declared schema compatibility fixture tests old/new application versions against the permitted schema combinations.

Run each branch against an independent disposable database. Capture selected business effects and emitted events, not unrestricted customer databases.

Unsupported concurrency, irreversible rollback, or unmodeled external effects produce explicit unsupported results. No live production traffic or rollback is executed by these tests.

## 20. Persistence, Queueing, and Artifact Storage

Use the existing PostgreSQL/ORM/migration stack. Add migrations, indexes, scoped repositories, and transactional integration tests—not only interfaces.

### Logical records

```text
semantic_contracts             definition and immutable bindings
contract_approvals             actor, scope, digest, decision
policy_versions                immutable executable policy
observable_definitions         versioned schemas and comparator configuration
proof_obligations              content-addressed obligation definitions
verification_runs              immutable request plus lifecycle projection
verification_attempts          adapter invocations, budgets, terminal status
obligation_results             immutable evidence outcomes per attempt
semantic_divergences           expected/unexpected/unresolved observations
counterexample_witnesses       validity, replay, minimization, artifact references
challenge_cases                provenance, split, disclosure, applicability
behavioral_promises            reviewed incident-derived rules and ownership
proof_summaries                formal summary metadata
proof_dependencies             conservative invalidation edges
repair_candidates              source, binding, ranking, result references
merge_candidates               actual queue/base/head composition
semantic_delta_certificates    manifest, root, signature, integrity metadata
artifact_references            ownership, digest, storage location, retention
approval_overrides             immutable policy exceptions
run_events                     ordered progress and execution events
audit_events                   authorization and security-sensitive mutations
```

### Identity and consistency

- Scope every access by tenant and repository; opaque IDs are not authorization.
- Unique result identity includes run, obligation digest, verifier, and attempt.
- Approval receipts refer to immutable definitions, not mutable titles.
- Persist run creation and job enqueue via the existing reliable outbox/queue pattern.
- Workers use leases/heartbeats; expired work is retried safely with a new attempt identity.
- At-least-once delivery is expected. Deduplicate scheduling and result ingestion instead of claiming exactly-once execution.
- Lifecycle states: queued, preparing, running, completed, cancelled, timed-out, failed. Stale applicability is tracked independently.
- Use local content-addressed artifact storage for development and the existing object-storage adapter for deployment. Large traces/corpora stay outside relational rows.
- Enforce retention/deletion across source artifacts and derived bundles without losing necessary audit metadata. Do not log sensitive payloads.

## 21. API and CLI Contracts

Adapt paths to the current API style while preserving these operations. All mutation routes require authorization, schema validation, and idempotency where retryable.

### API operations

```text
POST /semantic/contracts/validate
POST /semantic/contracts/diff
POST /semantic/contracts/:digest/approvals
POST /semantic/runs
GET  /semantic/runs/:runId
GET  /semantic/runs/:runId/events
POST /semantic/runs/:runId/cancel
GET  /semantic/runs/:runId/obligations
GET  /semantic/witnesses/:witnessId
POST /semantic/witnesses/:witnessId/replay
POST /semantic/witnesses/:witnessId/regression-test
POST /semantic/runs/:runId/repair-candidates
GET  /semantic/runs/:runId/passport
POST /semantic/passports/verify
GET  /semantic/memory
GET  /semantic/memory/:entryId/invalidation
```

Run creation accepts repository identity, exact revisions, contract reference, authorized fixture configuration, and bounded execution options—not arbitrary shell commands or filesystem paths. Event streams support cursor-based resume. Downloads use scoped expiring access and explicit redaction behavior.

### CLI operations

```text
changegraph contract validate --file .changegraph/contract.yml
changegraph contract diff --base-contract <file> --head-contract <file>
changegraph semantic-delta analyze --base <sha> --head <sha> --contract <file>
changegraph semantic-delta analyze --base <sha> --head <sha> --contract <file> --json
changegraph witness replay --bundle <path>
changegraph witness minimize --bundle <path>
changegraph witness test --bundle <path> --framework vitest --out <path>
changegraph passport export --run <id> --out <path>
changegraph passport verify --file <path> --mode integrity
changegraph passport verify --file <path> --mode replay
changegraph passport verify --file <path> --mode proof
changegraph repair evaluate --run <id> --candidate <sha>
changegraph interaction analyze --base <sha> --head <merge-candidate-sha>
changegraph memory explain --entry <id>
```

### Exit behavior

For analysis commands: `0` = configured requirements satisfied; `1` = required falsification; `2` = invalid input/configuration; `3` = incomplete, unsupported-required, or needs review; `4` = infrastructure/internal error. Preserve existing CLI conventions if incompatible and document the mapping. A successful contract parse or integrity check is not a successful behavioral analysis.

`--json` writes only versioned machine-readable output to stdout; logs/progress go to stderr. Add deterministic CLI snapshot tests.

## 22. GitHub Integration

Extend the existing GitHub App and Check workflow.

- Verify webhook signatures and installation/repository access.
- Handle relevant pull-request revision events, authorized rerun actions, and merge-group events.
- Deduplicate deliveries and bind each requested action to the active revision and report.
- Do not execute privileged workflows from untrusted fork configuration.
- Publish queued/running/terminal states and update stale applicability immediately after new revisions.
- Avoid a success conclusion for incomplete evidence. Preserve distinct advisory and required-check policies; document their conclusion mapping.
- Paginate/truncate summaries safely and link to the full report.

### Check summary

```text
Contract: approved / awaiting review / stale
Policy: permit / block / needs review

Allowed relations
Preserved behaviors
Independent properties
Unexpected divergences
Unknown and unsupported obligations

[View Behavioral Diff]
[Replay witness]
[Inspect assumptions]
[Download Evidence Passport]
```

Provider boundary tests must cover real payload fixtures and signature verification. Live integration tests run only with configured test credentials; record blocked live checks honestly.

## 23. Web UI — Required Screens and States

Use the existing app framework, design system, routing, auth, and data-fetching conventions. Do not replace the application with a standalone mock dashboard.

### Run overview

Exact revisions, contract approval, policy decision, counts by evidence state, coverage denominator, execution status, consumed resources, and unresolved work. Use separate indicators for semantic evidence and passport signature integrity.

### Contract review

Structured scope diff, subject mappings, changed predicates/domains, normalizer changes, mandatory promises, reviewer actions, and stale approval warnings. Show YAML/JSON as an inspectable view, not the sole review interface.

### Behavioral Diff

Filterable obligations grouped by allowed relation, preservation, and property. Side-by-side base/head observations; expected/unexpected classification; method, evidence, and assumptions.

### Witness Explorer

Input, normalized observations, violated predicate, minimization history, reproduction status, artifact availability, replay action, and regression-test export. A timeline shows recorded adapter events; do not label it universal time travel.

### Repair Lab

Candidate revisions, immutable semantic scope, original witness result, fresh challenge results, unresolved obligations, and explained ranking.

### Behavioral Memory

Case/proof distinction, ownership, applicability, reuse eligibility, dependency graph, and invalidation reasons.

### Evidence Passport

Manifest inspection, integrity result, signing identity if present, replay/proof-check status, and precise missing-artifact errors.

### UI quality requirements

Loading, empty, error, cancelled, stale, partially completed, permission-denied, and unsupported states are implemented and tested. Status is never color-only. Support keyboard navigation, readable long identifiers, large results via pagination/virtualization, and escaped untrusted content. UI actions call real application APIs.

## 24. Security, Configuration, and Observability

### Configuration

Add validated settings for worker provider, artifact store, resource limits, solver path/version, allowed normalizers, fixture adapter registry, GitHub credentials, signing provider, and retention. Reuse environment naming conventions and add a documented example configuration without secrets.

Missing external configuration disables only the dependent capability with an explicit reason. Missing sandbox isolation must not trigger unsafe host execution.

### Security tests

- Cross-tenant run/witness/artifact access.
- Forged webhooks and untrusted fork privileges.
- Command injection, path traversal, malicious archives, and oversized inputs.
- YAML alias/depth abuse and malformed worker protocols.
- Sandbox credential inheritance, resource exhaustion, and incomplete process cleanup.
- Repository attempts to forge `proven` or substitute another run’s artifacts.
- XSS through observations, test output, filenames, and generated explanations.
- Signing-key exposure and trust-root substitution.

### Observability

Instrument run preparation, adapter execution, domain checks, case generation, minimization, artifact writes, reuse decisions, solver calls, and GitHub publishing. Record reason-coded errors, resource usage, replay outcomes, and queue delay without leaking fixture payloads. Keep high-cardinality run IDs in traces/logs rather than unbounded metric labels.

## 25. Mandatory Fixture and Regression Matrix

Every row is an executable test case, not sample text in the UI.

- **Allowed change:** premium 10% → 20% satisfies its exact relation on applicable inputs.
- **Unexpected change:** standard pricing changes accidentally; preserve obligation is falsified with a replayable witness.
- **Missing intended change:** head is a no-op; the required premium relation fails for a nonzero input.
- **Invalid discount:** independent lower/upper-bound properties catch invalid results.
- **Pre-existing bug:** both revisions violate a property; classify it without falsely attributing introduction to the PR.
- **Authorization:** cross-tenant access decision changes and yields a reproducible case.
- **Empty domain:** impossible guard cannot produce successful preservation.
- **Unresolved subject:** critical mapping failure remains visible and requires review.
- **Normalization attack:** ignoring a monetary/security field invalidates approval and prior evidence.
- **Nondeterminism:** unstable output never becomes a reliable blocking witness or a proof.
- **Timeout/crash:** bounded termination, resource cleanup, and incomplete evidence state.
- **Protocol forgery:** repository-supplied success/proof claims cannot bypass trusted evaluation.
- **Independent challenge:** an author-test-passing fault is discovered by a separate valid challenge.
- **Witness shrink:** smaller valid input preserves the original violation and replay.
- **Repair overfit:** a candidate special-casing a disclosed witness fails a fresh challenge.
- **Merge interaction:** individual revisions pass; actual composition violates the preserved bound.
- **Stateful retry:** duplicate/retry sequences preserve declared database effects.
- **Symbolic equivalent:** supported nonempty domain yields a persisted proof-model result.
- **Symbolic countermodel:** SAT input reproduces in JavaScript or is flagged as translation mismatch.
- **Unsupported TypeScript:** no silent approximation or fabricated proof.
- **Proof invalidation:** changed transitive dependency/assumption/comparator forces recheck.
- **Passport tampering:** modified bytes, wrong binding, untrusted signer, and missing leaves fail integrity checks.
- **Stale Check:** a new head or queue revision cannot inherit old success.
- **Worker retry:** duplicate deliveries do not duplicate authoritative result projection.
- **Tenant isolation:** identifiers from another tenant cannot be read, replayed, or reused.

## 26. Engineering Benchmark Harness

Extend existing ChangeBench if present; otherwise add a fixture-driven harness with versioned JSON output.

Compare full fixture tests, ordinary differential replay, random differential generation, guided generation, and hybrid verification with/without eligible reuse under declared budgets. Use fixed seeds and disjoint evaluation fixtures. Do not invent historical or production data.

Report raw counts and denominators for detected seeded faults, false divergences, unknown/unsupported cases, replay success, executed valid cases, solver outcomes, reused/invalidated summaries, execution time, and shrink attempts. Keep formal proofs separate from empirical support.

Tests must establish correctness of metric computation. Benchmarks may report actual measurements; CI gates use configured reproducible limits rather than hardcoded claims of superiority or arbitrary safety percentages.

## 27. Dependency-Ordered Implementation Work Units

Complete these in order where dependencies require it. Continue through the full specification; passing an early checkpoint is not permission to stop at a demo.

### Unit A — Repository integration map

Inspect the current stack and baseline checks. Map logical modules to actual files. Record existing failures separately; preserve user changes. Set up runtime schemas, test fixtures, and shared types without duplicating existing infrastructure.

**Exit:** exact build/test commands are known and the new packages integrate with workspace tooling.

### Unit B — Contracts, scope, and obligations

Implement predicate AST, strict parser, canonicalization, digest binding, subject resolution, approval checks, weakening detection, and obligation generation.

**Exit:** concrete contract fixture validates; attacks and no-op change requirements have executable tests.

### Unit C — Observables and isolated execution

Implement normalizers, comparators, function/HTTP fixtures, sandbox protocol, bounded resources, cancellation, and deterministic twin execution.

**Exit:** actual base/head code generates expected observations; timeout, crash, and nondeterminism paths are exercised.

### Unit D — Classification and counterexamples

Implement trusted predicate evaluation, divergence classification, witness persistence, validity-preserving shrinking, replay, and Vitest patch generation.

**Exit:** “green CI, broken promise” fixture is detected and independently replayed from a fresh environment.

### Unit E — Challenge Lab and stateful adapters

Implement seeded/boundary generation, provenance, corpus split/disclosure, supported mutants, guided search, command sequences, and disposable PostgreSQL effects.

**Exit:** author-test-passing seeded faults and stateful invariants are exercised with real results.

### Unit F — Persistence and application orchestration

Implement migrations, scoped repositories, queue/outbox integration, immutable attempts, artifact storage, worker leases, retries, and shared report projection.

**Exit:** runs survive worker retry and application restart without losing evidence or crossing tenant boundaries.

### Unit G — Planner, policy, CLI, and web API

Wire all current adapters, budgets, aggregation, report endpoints, authorization, CLI commands, and streaming progress.

**Exit:** users can initiate, inspect, cancel, replay, and export a real run through supported application surfaces.

### Unit H — Behavioral UI and GitHub Checks

Implement the screens in Section 23 and connect them to real APIs. Add provider payload tests, stale-result handling, and configured live GitHub verification.

**Exit:** no required screen depends on hardcoded results; Check summaries match the shared report exactly.

### Unit I — Symbolic subset and proof memory

Implement AST→IR→SMT, JS differential interpreter tests, SAT replay, non-vacuity, solver receipts, optional proof checking, and conservative formal reuse.

**Exit:** proven, falsified, unknown, unsupported, and invalidation fixtures all exercise real paths. Missing solver configuration is explicit, not bypassed.

### Unit J — Evidence Passport

Implement canonical evidence tree, export, safe import, integrity validation, configured signing, replay mode, and supported proof-check mode.

**Exit:** exported artifacts validate independently; tampering and binding substitution fail.

### Unit K — Repair Lab and Interaction Sentinel

Implement candidate isolation, immutable specification enforcement, fresh challenges, ranking, actual merge-composition execution, and queue invalidation.

**Exit:** repair-overfit and independently-passing/composition-failing fixtures behave as specified.

### Unit L — Full-system verification and cleanup

Run all fixtures, API/DB integrations, CLI snapshots, UI end-to-end tests, security cases, typecheck, lint, build, and benchmarks. Remove debug shortcuts, dead scaffolding, placeholder success paths, and undocumented configuration.

**Exit:** completion checklist below is backed by executed checks, with any unavailable live environment explicitly listed.

## 28. Definition of Done and Final Handoff

- [ ] Existing application behavior remains intact; baseline failures are not concealed.
- [ ] All required modules are connected to the same canonical domain/report model.
- [ ] The concrete contract example parses and executes without arbitrary expression evaluation.
- [ ] Contract weakening, missing applicability, and stale approval cannot bypass policy.
- [ ] Twin execution runs actual revisions in the configured isolated environment.
- [ ] Independent challenges generate valid cases with persisted provenance.
- [ ] Counterexamples minimize and replay with exact artifact/binding checks.
- [ ] Symbolic results reflect actual supported translation and solver outcomes.
- [ ] Proof reuse has invalidation counter-tests and tenant boundaries.
- [ ] CLI, API, UI, worker, and GitHub projections agree on result semantics.
- [ ] Repair candidates cannot change the specification to win.
- [ ] Actual merge composition is tested independently of individual PR results.
- [ ] Evidence Passports preserve unknowns and distinguish integrity from correctness.
- [ ] Resource limits, cancellation, retries, artifact safety, and authorization are tested.
- [ ] Required fixtures and end-to-end flows execute without hardcoded outcomes.
- [ ] Migrations, configuration examples, supported-semantics documentation, and local run instructions are complete.
- [ ] Final status lists exact commands executed, actual pass/fail results, and blocked live integrations.
- [ ] No unimplemented module is labeled complete; no unexecuted test is reported as passing.

> **Completion criterion:** a real change flows from reviewed contract through isolated verification, executable counterexample or scoped evidence, application UI, and a verifiable artifact. The complete feature set is implemented through dependency-ordered checkpoints, with correctness established by tests—not by elapsed time or generated scaffolding.
