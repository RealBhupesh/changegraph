# AGENTS.md — ChangeGraph Engineering Rules

This repository is designed to be implemented with human and agentic contributors.

## Canonical current implementation brief

Before implementing or modifying the semantic-delta verification system, read:

1. `docs/implementation/CHANGEGRAPH_COMPLETE_IMPLEMENTATION_PLAN.md`
2. `docs/implementation/changegraph-status.md`

The September 6 complete implementation brief is the current execution source of truth. Earlier specs, research documents, and plans remain important architectural context, but when they conflict with the current execution brief, follow the current brief unless the user explicitly changes the direction again.

The brief requires integrated working code and tests—not another plan. Execute its dependency-ordered Units A–L, preserve existing working behavior, and update `docs/implementation/changegraph-status.md` with actual commands/results as work progresses.

Before changing **MVP/core code**, also read these files in order:

3. `README.md`
4. `docs/superpowers/specs/2026-09-04-changegraph-design.md`
5. `docs/ARCHITECTURE.md`
6. `docs/superpowers/plans/2026-09-04-changegraph-mvp.md`
7. `docs/ROADMAP.md`
8. `docs/RESEARCH.md`

Before changing **platform expansion code** such as MCP, Copilot agents, ChangeBench, Intent Drift, Minimum Evidence, Marketplace, or remediation, also read:

9. `docs/superpowers/specs/2026-09-04-changegraph-platform-expansion-design.md`
10. `docs/PLATFORM_ARCHITECTURE.md`
11. `docs/PLATFORM_RESEARCH.md`
12. `docs/MARKETPLACE.md`
13. `docs/superpowers/plans/2026-09-04-changegraph-platform-expansion.md`

Before changing **Evidence Science research code** such as temporal propagation, adaptive validation, mutation witnesses, calibration, invariants, metamorphic relations, provenance, or attestations, also read:

14. `docs/superpowers/specs/2026-09-04-changegraph-evidence-science-design.md`
15. `docs/EVIDENCE_SCIENCE_RESEARCH.md`
16. `docs/superpowers/plans/2026-09-04-changegraph-evidence-science.md`

## Product invariant

ChangeGraph is **change intelligence and adaptive evidence validation**, not a generic AI code-review wrapper.

The long-term evidence pipeline is:

```text
diff
-> semantic changed symbols
-> dependency/impact graph
-> reviewed executable semantic contract
-> deterministic verification obligations
-> counterfactual base/head execution
-> independent challenges / fuzzing / stateful checks
-> symbolic verification where supported
-> counterexamples / proof memory / adaptive evidence
-> deterministic policy decision
-> Behavioral Diff / Evidence Passport
-> optional repair evaluation
-> GitHub / CLI / web projections
```

Do not invert this architecture by asking an LLM which tests to run and then treating its answer as authoritative.

## Safety rules

- Low confidence or calibration-support mismatch broadens validation.
- Protected hard fallbacks cannot be disabled by repository configuration.
- LLM output cannot lower risk, raise confidence, raise Trust, suppress fallback, or mark a PR safe to merge.
- LLM prose is not evidence. It may propose an executable hypothesis or explain existing evidence IDs.
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
- Co-change and co-failure are association evidence, not causal proof.
- Mutation survivors may be `possibly-equivalent`; do not count every survivor as a testing failure.
- Mined invariants are likely invariants, not formal specifications.
- Metamorphic relations proposed by an LLM contribute zero trusted evidence until executable and validated.
- Agent provenance is metadata, not a default risk penalty.
- Same-agent code and same-agent tests belong to the same independence group unless independent evidence proves otherwise.
- Evidence Certificates/Passports attest to collected evidence and policy decisions; they do not prove bug freedom or security.
- Tests and fuzzing may produce `supported`, never `proven`.
- Solver `UNKNOWN`, translation failure, missing artifacts, empty domains, and exhausted budgets cannot become success.
- Base behavior is a compatibility reference, not a universal correctness oracle; independent properties must be evaluated on both revisions where required.
- The implementation agent may not silently weaken contracts, domains, comparators, normalizers, ignored fields, approval requirements, or trusted policy.
- Repository code and generated artifacts are untrusted and cannot self-issue a trusted `proven` result or access signing credentials.
- Existing CI remains intact unless an explicitly approved later policy says otherwise.
- No automatic commit, merge, deployment, rollback, or production execution is part of the semantic verifier.
- Cross-tenant case/proof/incident reuse requires explicit authorization.

## Evidence Science rules

### Adaptive planner

- The first planner is deterministic and fully auditable.
- Every selected experiment returns utility components, estimated cost source, expected evidence gain, and diversity gain.
- Planner estimates are labeled as estimates until measured.
- The planner must stop with `defer`, `needs-review`, or fallback when evidence remains insufficient; it may not invent confidence to finish cheaply.

### Calibration

- Do not display an arbitrary confidence number as probability that a PR is safe.
- Calibration artifacts are repository/regime/version specific.
- Record sample count, alpha/target, support region, model version, and shift diagnostics.
- Outside-support changes must abstain or broaden validation.
- Conformal or online-calibration guarantees must be stated only under the assumptions actually used by the implementation.

### Temporal / causal research

Maintain separate support dimensions:

```text
static
historical association
runtime/mechanistic
interventional
```

Never collapse these into an unqualified causal probability.

### ChangeBench leakage prevention

For benchmark PR/commit N, no feature derived from N's outcome or any later event may influence N's ranking, calibration, invariant model, temporal graph, or learned model.

Primary benchmark splits are time-ordered. Random splits are not allowed for the headline historical evaluation.

### Learned models

Do not add GNN/ML ranking to the authoritative path until deterministic baselines exist and the learned challenger wins on a frozen future window without worsening protected safety metrics.

## Semantic-delta implementation rules

- `.changegraph/contract.yml` and `.changegraph/policy.yml` are executable specifications only through validated typed schemas/ASTs. Never use `eval`, `Function`, arbitrary shell strings, or arbitrary expression execution.
- Contract definitions, bindings, policies, execution configuration, observables, comparators, normalizers, obligations, and artifacts are content-addressed/versioned according to the canonical brief.
- Approval state is stored separately from immutable content digests.
- Scope weakening is conservative: if semantic weakening cannot be decided safely, return `needs-review`.
- Required guarded obligations must have a nonempty applicable domain; vacuous success is forbidden.
- Observation status (`returned`, `threw`, `timed-out`, `crashed`, `protocol-error`, `nondeterministic`) is distinct from payload.
- Counterfactual base/head execution uses independent controlled environments with the same validated input/configuration and no ambient host secrets.
- Missing isolation never causes silent host execution for untrusted repositories.
- Passing fuzz inputs support only executed cases. Invalid generated inputs do not inflate evidence.
- Witness minimization must preserve schema validity, applicability, and the same reproducible violation.
- Solver `SAT` countermodels must be replayed before becoming confirmed runtime falsifications; replay mismatch is a translation/model issue.
- Formal proof memory and empirical case memory are separate stores and separate UI concepts.
- Proof reuse requires matching semantic/dependency/assumption/observable/config/verifier fingerprints; a previous green Check is never sufficient.
- Preserve all verification attempts. A later pass does not erase an earlier confirmed failure.
- Contradictory formal and runtime evidence blocks permission and triggers investigation.
- Evidence Passport integrity/signature verification is not equivalent to behavioral correctness.
- Repair candidates are evaluated against an immutable approved semantic contract and fresh challenges; they cannot win by weakening the spec.
- Interaction Sentinel verifies the exact merge candidate composition, not a hypothetical combination of independently green PRs.
- Stateful rehearsal is bounded to declared fixtures and disposable environments; no live production traffic or rollback.
- At-least-once job delivery is expected; deduplicate scheduling/result ingestion rather than claiming exactly-once execution.
- API, CLI, worker, GitHub Check, and web UI consume one canonical report/policy model.

## Engineering rules

- Node.js 24 LTS unless the actual repository baseline has changed and the canonical brief is updated accordingly.
- TypeScript 6 strict mode unless repository inspection proves a different current baseline that must be preserved.
- pnpm 10 workspace unless repository inspection proves otherwise.
- Vitest 5 with `test.projects`, not deprecated workspace configuration, unless the repository already uses a compatible different testing stack that the execution brief maps onto.
- Next.js stays on a supported security-patched release line specified in the implementation plan/repository.
- Core packages do not import from `apps/web`, `apps/mcp`, or other transport/UI apps.
- Git commands and test runner commands use argument arrays, never shell string interpolation.
- Every externally supplied filename/path/ref/PR URL/archive is untrusted input.
- Every score/evidence factor must be inspectable.
- Every selected evidence action must expose one or more evidence reasons.
- Every fallback must expose a reason.
- Every EvidenceItem/result must contain provenance/binding and canonical digests required by the current brief.
- Every MCP tool has explicit input/output schemas and an access class.
- ChangeBench historical replay always uses an `asOf` cutoff and rejects future evidence.
- Marketplace/privacy/support copy must reflect actual implemented behavior, never boilerplate claims that the code does not satisfy.
- Keep `docs/implementation/changegraph-status.md` current with exact commands and actual results.

## TDD workflow

For each implementation work unit/task:

1. inspect existing repository behavior and tests first;
2. write the smallest failing test for the behavior;
3. run the exact test and confirm failure for the intended reason;
4. implement the minimum real behavior;
5. connect it to the application instead of stopping at scaffolding;
6. run the focused test;
7. run the package/integration suite as appropriate;
8. run typecheck/lint/build checkpoints required by the repository;
9. record actual results in `docs/implementation/changegraph-status.md`;
10. commit only when separately authorized by the user/workflow.

Do not batch unrelated implementation units into one giant unreviewable change.

## Architecture restraint

Do not add these during MVP or early research unless benchmark evidence and a reviewed design change justify them:

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
- automatic merge flows;
- GNN ranking before benchmark baselines;
- integer-programming optimization before the deterministic planner is measured.

PostgreSQL plus in-memory per-index traversal remains the current graph architecture unless implementation evidence justifies a documented change.

## MCP / agent tool design

Prefer narrow domain tools such as:

```text
get_impact_paths
get_relevant_tests
minimum_evidence_plan
evidence_summary
next_best_experiment
mutation_witnesses
invariant_drift
calibration_status
semantic_contract_status
behavioral_diff
witness_replay_status
passport_integrity
```

over generic dangerous tools such as:

```text
execute_command
run_sql
run_shell
modify_repository
```

A tool should expose a domain capability, not unrestricted infrastructure.

## ChangeBench / benchmark rules

ChangeBench and the semantic-delta benchmark harness exist to falsify ChangeGraph claims, not market them.

- Full-suite/fixture failures are ground truth for relevant replay cases.
- Future history is forbidden.
- Synthetic fixtures and real OSS cases are separate cohorts.
- Safety/correctness metrics appear before efficiency metrics.
- Every miss/divergence remains inspectable.
- Tool commit/config/dataset versions and deterministic seeds are recorded.
- Formal proofs are reported separately from empirical support.
- Raw counts and denominators are retained; do not hide unknown/unsupported cases.
- Report per-repository/per-fixture distributions and failure cases, not only pooled means.
- Do not omit cases because ChangeGraph performs badly unless the exclusion criterion was defined before evaluation and is documented.

## Measured claims only

Values such as 99% failing-test recall, 50% test-count reduction, and 40% wall-clock reduction are **evaluation targets**, not product claims.

Do not put a metric in the README, portfolio, release notes, Marketplace listing, research summary, or outreach material unless it comes from a reproducible frozen benchmark run checked into or linked from the project.

## Change procedure for architecture decisions

If implementation reveals that the design is wrong:

1. document the observed evidence;
2. update the canonical implementation brief or an explicitly approved replacement decision;
3. update affected architecture/spec docs;
4. add/modify tests that express the new invariant;
5. update `docs/implementation/changegraph-status.md`;
6. then change implementation.

Do not silently drift away from the documented architecture.

## Definition of a strong ChangeGraph contribution

A strong contribution improves at least one of:

- semantic-contract correctness;
- scope-firewall strength;
- semantic accuracy;
- witness quality/replayability;
- falsification power;
- verification soundness within the supported subset;
- proof-memory reuse without unsound invalidation;
- tenant/repository isolation;
- artifact/passport integrity;
- merge-composition detection;
- stateful invariant coverage;
- failing-test recall;
- false-safe rate;
- validation cost at unchanged safety;
- mutation witness usefulness;
- evidence diversity robustness;
- calibration quality/abstention behavior;
- invariant/metamorphic evidence quality;
- temporal impact prediction;
- analysis latency;
- repository Trust calibration;
- intent-drift usefulness;
- provenance/verifiability;
- MCP interoperability;
- explainability;
- security/isolation;
- developer experience;
- benchmark quality;
- Marketplace installability/support quality.

More AI-generated code or more features alone is not a success metric.
