# ChangeGraph Platform Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend a completed ChangeGraph MVP into a GitHub-native platform with repository trust, read-only MCP tools, a Copilot custom agent, ChangeBench, Intent Drift, Minimum Evidence Testing, interactive Check actions, isolated remediation requests, a public playground, and Marketplace-ready distribution.

**Architecture:** The deterministic ChangeGraph analyzer remains the only source of risk/confidence/impact truth. New platform surfaces consume versioned reports and evidence IDs through narrow packages. MCP and Copilot are evidence consumers; Check actions and remediation requests pass through the existing policy engine and isolated execution boundaries.

**Tech Stack:** Existing ChangeGraph MVP stack plus MCP TypeScript SDK v2 aligned to MCP 2026-07-28, GitHub Copilot custom-agent profiles, GitHub Checks requested actions, PostgreSQL, Next.js, Vitest, OpenTelemetry.

**Spec:** `docs/superpowers/specs/2026-09-04-changegraph-platform-expansion-design.md`

## Global Constraints

- Complete and verify the MVP plan before executing this expansion plan.
- ChangeGraph core analysis remains deterministic and functional without an LLM.
- MCP V1 exposes read-only tools only.
- GitHub Copilot custom agent may not override ChangeGraph risk, confidence, trust, or policy.
- Repository/installation authorization occurs on every MCP tool call.
- Intent text may increase review concern but may never reduce deterministic risk.
- Minimum Evidence Testing cannot optimize away mandatory evidence or hard fallbacks.
- ChangeBench historical replay must prevent future-data leakage.
- Requested remediation actions are bound to an exact repository, PR, report, and head SHA.
- No automatic merge path exists.
- Marketplace launch is free-first; billing is out of scope for this implementation plan.

---

## File Structure Added by This Plan

```text
apps/
  mcp/
  playground/
packages/
  trust/
  provenance/
  intent/
  evidence-optimizer/
  mcp-tools/
  remediation/
  marketplace/
agents/
  changegraph-reviewer.agent.md
benchmarks/
  changebench/
  baselines/
  datasets/
docs/
  MARKETPLACE.md
  PLATFORM_ARCHITECTURE.md
  PLATFORM_RESEARCH.md
```

---

### Task 1: Repository Trust State Machine

**Files:**
- Create: `packages/trust/src/types.ts`
- Create: `packages/trust/src/assess.ts`
- Create: `packages/trust/src/transitions.ts`
- Create: `packages/trust/src/index.ts`
- Test: `packages/trust/src/assess.test.ts`
- Test: `packages/trust/src/transitions.test.ts`
- Modify: `packages/report/src/types.ts`
- Modify: `packages/db/src/schema.ts`

**Interfaces:**
- Produces `RepositoryTrustAssessment` and `assessRepositoryTrust(input)`.
- Consumes shadow/calibration metrics from the MVP history layer.

- [ ] **Step 1: Write trust-state tests**

Required cases:

```ts
expect(assessRepositoryTrust({ comparableRuns: 0, ...healthy })).toMatchObject({ state: 'unproven' });
expect(assessRepositoryTrust({ comparableRuns: 20, ...healthy })).toMatchObject({ state: 'observed' });
expect(assessRepositoryTrust({ comparableRuns: 50, failureRecall: 0.995, falseSafeEvents: 0, ownerOptIn: false, ...healthy }))
  .toMatchObject({ state: 'calibrating' });
expect(assessRepositoryTrust({ comparableRuns: 50, failureRecall: 0.995, falseSafeEvents: 0, ownerOptIn: true, ...healthy }))
  .toMatchObject({ state: 'trusted' });
```

- [ ] **Step 2: Implement explicit states**

```ts
export type RepositoryTrustState =
  | 'unproven'
  | 'observed'
  | 'calibrating'
  | 'trusted'
  | 'degraded'
  | 'suspended';
```

- [ ] **Step 3: Implement immediate demotion rules**

A serious false-safe event, unsupported adapter transition, or explicit systematic miss can demote `trusted -> degraded/suspended` without waiting for a rolling average.

- [ ] **Step 4: Persist trust assessment version/reasons**

Never persist only a numeric score.

- [ ] **Step 5: Run tests and commit**

```bash
pnpm --filter @changegraph/trust test
git add packages/trust packages/report packages/db
git commit -m "feat: add repository trust state machine"
```

---

### Task 2: Author Provenance

**Files:**
- Create: `packages/provenance/src/types.ts`
- Create: `packages/provenance/src/github.ts`
- Test: `packages/provenance/src/github.test.ts`
- Modify: `packages/report/src/types.ts`

**Interfaces:**
- Produces `detectAuthorProvenance(event, pr): AuthorProvenance`.

- [ ] **Step 1: Write deterministic fixture tests**

Cover human actor, Dependabot, GitHub Copilot metadata when present, generic automation, and unknown.

- [ ] **Step 2: Implement conservative detection**

If metadata is ambiguous, return `unknown`. Do not infer an external agent merely from writing style or commit-message text.

- [ ] **Step 3: Add report field**

Provenance is metadata for analysis/benchmark segmentation and does not directly modify risk.

- [ ] **Step 4: Test serialization**

Verify old reports without provenance remain readable through schema version migration/default handling.

- [ ] **Step 5: Commit**

```bash
git add packages/provenance packages/report
git commit -m "feat: record conservative change author provenance"
```

---

### Task 3: Intent Drift Engine

**Files:**
- Create: `packages/intent/src/types.ts`
- Create: `packages/intent/src/collect.ts`
- Create: `packages/intent/src/normalize.ts`
- Create: `packages/intent/src/compare.ts`
- Create: `packages/intent/src/index.ts`
- Test: `packages/intent/src/compare.test.ts`
- Create: `fixtures/intent-drift/`
- Modify: `packages/report/src/types.ts`

**Interfaces:**
- Produces `ChangeIntent`, `ImpactReality`, `IntentDriftAssessment`.

- [ ] **Step 1: Build drift fixtures**

Cases:

```text
no drift: declared auth refresh -> auth refresh only
medium drift: declared UI copy -> shared component behavior
high drift: declared session bug -> auth middleware + public API + persistence
```

- [ ] **Step 2: Implement deterministic comparator**

Use normalized declared areas plus actual graph impact.

Initial signals:

```text
scopeExpansionRatio
undeclaredCriticalAreaCount
unmentionedPublicApiChange
unmentionedDataBoundaryChange
unmentionedSecurityBoundaryChange
```

- [ ] **Step 3: Ensure intent cannot lower risk**

Add a policy test where benign PR text claims "docs only" while a critical symbol changes; deterministic risk remains unchanged/increased.

- [ ] **Step 4: Optional extraction adapter boundary**

Define an `IntentExtractor` interface but ship a deterministic explicit/PR-metadata extractor first. LLM extraction remains optional and cannot bypass `compare`.

- [ ] **Step 5: Commit**

```bash
git add packages/intent packages/report fixtures/intent-drift
git commit -m "feat: compare declared change intent with actual impact"
```

---

### Task 4: Minimum Evidence Planner

**Files:**
- Create: `packages/evidence-optimizer/src/types.ts`
- Create: `packages/evidence-optimizer/src/greedy.ts`
- Create: `packages/evidence-optimizer/src/overlap.ts`
- Create: `packages/evidence-optimizer/src/constraints.ts`
- Create: `packages/evidence-optimizer/src/index.ts`
- Test: `packages/evidence-optimizer/src/greedy.test.ts`
- Modify: `packages/report/src/types.ts`

**Interfaces:**
- Produces `planMinimumEvidence(input): EvidencePlan`.

- [ ] **Step 1: Define evidence action schema**

```ts
export interface EvidenceAction {
  id: string;
  kind: 'test' | 'suite' | 'typecheck' | 'lint' | 'build' | 'schema-check' | 'sentinel' | 'full-suite';
  estimatedCostMs: number;
  coversEvidenceIds: string[];
  estimatedMarginalConfidence: number;
  mandatory: boolean;
}
```

- [ ] **Step 2: Write constraint tests**

Mandatory sentinel cannot be removed. Lockfile hard fallback returns a full-suite plan. Target confidence above achievable evidence forces full suite.

- [ ] **Step 3: Implement overlap-aware greedy selection**

At each iteration select the allowed action with highest conservative non-overlapping confidence gain per millisecond.

- [ ] **Step 4: Make every decision explainable**

Plan output contains selected actions, rejected alternatives summary, estimated cost, projected confidence, and constraints.

- [ ] **Step 5: Commit**

```bash
git add packages/evidence-optimizer packages/report
git commit -m "feat: optimize minimum safe validation evidence"
```

---

### Task 5: ChangeBench Core and Baselines

**Files:**
- Create: `benchmarks/changebench/src/types.ts`
- Create: `benchmarks/changebench/src/replay.ts`
- Create: `benchmarks/changebench/src/metrics.ts`
- Create: `benchmarks/changebench/src/report.ts`
- Create: `benchmarks/changebench/src/leakage.ts`
- Create: `benchmarks/baselines/src/full-suite.ts`
- Create: `benchmarks/baselines/src/changed-file.ts`
- Create: `benchmarks/baselines/src/package-static.ts`
- Create: `benchmarks/baselines/src/static-graph.ts`
- Test: `benchmarks/changebench/src/metrics.test.ts`
- Test: `benchmarks/changebench/src/leakage.test.ts`

**Interfaces:**
- Produces `BenchmarkSystem`, `ChangeBenchCase`, `ChangeBenchResult`.

- [ ] **Step 1: Write metric tests**

Test failure recall, false-safe rate, selection ratio, runtime ratio, and analysis latency aggregation.

- [ ] **Step 2: Enforce temporal cutoff**

History API for benchmark calls requires `asOfTimestamp`; tests inject a future record and assert it is rejected.

- [ ] **Step 3: Implement transparent baselines**

Every baseline uses the same case format and emits the same prediction shape.

- [ ] **Step 4: Produce machine-readable report**

JSON report contains dataset version, tool SHA/config hash, baseline versions, case-level outcomes, aggregate metrics, and miss taxonomy.

- [ ] **Step 5: Commit**

```bash
git add benchmarks/changebench benchmarks/baselines
git commit -m "feat: add reproducible ChangeBench benchmark harness"
```

---

### Task 6: ChangeBench Dataset Provenance and Public Report

**Files:**
- Create: `benchmarks/datasets/README.md`
- Create: `benchmarks/changebench/src/provenance.ts`
- Create: `benchmarks/changebench/src/html-report.ts`
- Create: `apps/web/app/benchmarks/page.tsx`
- Test: `benchmarks/changebench/src/provenance.test.ts`

**Interfaces:**
- Consumes ChangeBench JSON result.
- Produces public benchmark report with target-vs-measured distinction.

- [ ] **Step 1: Require dataset metadata**

Dataset manifest fields include source URL, license/provenance notes, case extraction method, temporal range, and dataset version.

- [ ] **Step 2: Reject unlabeled synthetic/real mixing**

Controlled fixtures and historical OSS cases must render as separate cohorts.

- [ ] **Step 3: Build benchmark page**

Show safety metrics before efficiency metrics. Always render failing-test misses and fallback rate.

- [ ] **Step 4: Add reproducibility block**

Display ChangeGraph commit SHA, config/model versions, benchmark dataset version, and machine/runtime metadata.

- [ ] **Step 5: Commit**

```bash
git add benchmarks/datasets benchmarks/changebench apps/web/app/benchmarks
git commit -m "feat: publish reproducible ChangeBench results"
```

---

### Task 7: Read-Only MCP Server

**Files:**
- Create: `apps/mcp/package.json`
- Create: `apps/mcp/src/server.ts`
- Create: `apps/mcp/src/auth.ts`
- Create: `apps/mcp/src/context.ts`
- Create: `packages/mcp-tools/src/types.ts`
- Create: `packages/mcp-tools/src/analyze-change.ts`
- Create: `packages/mcp-tools/src/impact-paths.ts`
- Create: `packages/mcp-tools/src/relevant-tests.ts`
- Create: `packages/mcp-tools/src/risk-confidence.ts`
- Create: `packages/mcp-tools/src/trust.ts`
- Create: `packages/mcp-tools/src/intent.ts`
- Create: `packages/mcp-tools/src/evidence-plan.ts`
- Test: `apps/mcp/src/server.test.ts`
- Test: `packages/mcp-tools/src/authorization.test.ts`

**Interfaces:**
- Exposes read-only MCP tools from the expansion specification.

- [ ] **Step 1: Add current MCP TypeScript SDK**

Use the stable SDK line implementing MCP 2026-07-28. Pin an exact compatible release in the lockfile.

- [ ] **Step 2: Test repository isolation**

Principal authorized for repository A must receive permission denial when passing repository B identifiers.

- [ ] **Step 3: Implement stateless tool context**

Every request authenticates, resolves repository scope, and creates a request ID independently.

- [ ] **Step 4: Register only read-only tools**

No shell/execute/general SQL/general Git tool exists.

- [ ] **Step 5: Validate output schemas and evidence references**

Tool output failing schema validation is an internal error, not silently returned to the agent.

- [ ] **Step 6: Add OpenTelemetry and commit**

```bash
pnpm --filter @changegraph/mcp test
git add apps/mcp packages/mcp-tools
git commit -m "feat: expose ChangeGraph intelligence over read-only MCP"
```

---

### Task 8: GitHub Copilot Custom Agent

**Files:**
- Create: `agents/changegraph-reviewer.agent.md`
- Create: `agents/README.md`
- Create: `fixtures/agents/expected-prompts.json`
- Test: `packages/mcp-tools/src/agent-contract.test.ts`

**Interfaces:**
- Consumes ChangeGraph MCP tools only for platform-specific intelligence.

- [ ] **Step 1: Write agent profile**

Use `target: github-copilot`, required description, and explicit tool allowlist.

- [ ] **Step 2: Encode behavioral invariants**

Profile instructs agent to cite evidence IDs, preserve risk/confidence values, and broaden validation on low confidence.

- [ ] **Step 3: Add contract fixtures**

Cases:

```text
what can this PR break?
why this test?
is it safe to skip full CI?
does implementation exceed intent?
```

Expected contract specifies which MCP tools should provide evidence, not exact prose.

- [ ] **Step 4: Validate no mutation tools are allowlisted**

Automated test parses frontmatter and rejects write/execute tools in V1.

- [ ] **Step 5: Commit**

```bash
git add agents fixtures/agents packages/mcp-tools
git commit -m "feat: add evidence-grounded GitHub Copilot ChangeGraph agent"
```

---

### Task 9: Interactive GitHub Check Requested Actions

**Files:**
- Modify: `packages/github/src/checks.ts`
- Create: `packages/github/src/requested-actions.ts`
- Modify: `packages/github/src/events.ts`
- Create: `apps/worker/src/jobs/request-full-suite.ts`
- Test: `packages/github/src/requested-actions.test.ts`
- Test: `apps/worker/src/jobs/request-full-suite.test.ts`

**Interfaces:**
- V1 requested action: `run_full_suite`.
- Later remediation actions are enabled only after Task 10.

- [ ] **Step 1: Render full-suite action on eligible completed Checks**

Action identifier is stable and versioned.

- [ ] **Step 2: Verify requested-action webhook**

Reuse webhook authentication and delivery deduplication.

- [ ] **Step 3: Bind to exact report/head SHA**

If current PR head differs from action report head, reject as stale and create/update explanation.

- [ ] **Step 4: Enqueue full validation**

Full-suite action can only broaden validation.

- [ ] **Step 5: Commit**

```bash
git add packages/github apps/worker/src/jobs/request-full-suite.ts
git commit -m "feat: add native GitHub Check full-validation action"
```

---

### Task 10: Remediation Request Orchestrator

**Files:**
- Create: `packages/remediation/src/types.ts`
- Create: `packages/remediation/src/request.ts`
- Create: `packages/remediation/src/policy.ts`
- Create: `apps/worker/src/jobs/remediate.ts`
- Test: `packages/remediation/src/request.test.ts`
- Test: `apps/worker/src/jobs/remediate.test.ts`
- Modify: `packages/github/src/requested-actions.ts`

**Interfaces:**
- Produces request receipts for `generate_regression_test` and `attempt_candidate_fix`.

- [ ] **Step 1: Reject stale/untrusted requests**

Tests cover stale head, suspended trust state, missing sandbox, and unauthorized actor.

- [ ] **Step 2: Generate evidence packet**

Task includes exact changed symbols, impact paths, target finding, selected tests, policy constraints, and head SHA.

- [ ] **Step 3: Execute only through sandbox abstraction**

No remediation job may edit the worker checkout directly.

- [ ] **Step 4: Validate candidate patch**

Run mandatory/selected tests and full suite when policy requires it.

- [ ] **Step 5: Return reviewable candidate only**

No automatic merge. PR creation remains a separate explicit user action/capability.

- [ ] **Step 6: Commit**

```bash
git add packages/remediation apps/worker/src/jobs/remediate.ts packages/github
git commit -m "feat: orchestrate isolated evidence-bound remediation requests"
```

---

### Task 11: Public PR Playground

**Files:**
- Create: `apps/playground/package.json`
- Create: `apps/playground/app/page.tsx`
- Create: `apps/playground/app/api/analyze/route.ts`
- Create: `apps/playground/src/validate-url.ts`
- Create: `apps/playground/src/rate-limit.ts`
- Test: `apps/playground/src/validate-url.test.ts`
- Test: `apps/playground/app/api/analyze/route.test.ts`

**Interfaces:**
- Input: public GitHub PR URL.
- Output: sanitized read-only ChangeGraph report.

- [ ] **Step 1: Accept only canonical public GitHub PR URLs**

Reject arbitrary URLs, non-PR paths, private/unresolvable repositories, and unsupported hosts.

- [ ] **Step 2: Add abuse controls**

Rate limit by principal/IP policy, cache by repo/base/head/analyzer version, cap repository size/analysis resource use.

- [ ] **Step 3: Disable test execution/remediation**

Playground V1 performs static/read-only analysis only.

- [ ] **Step 4: Sanitize output**

Do not expose internal installation IDs, tokens, worker paths, or operational metadata.

- [ ] **Step 5: Commit**

```bash
git add apps/playground
git commit -m "feat: add public read-only ChangeGraph PR playground"
```

---

### Task 12: Marketplace Compliance Surfaces

**Files:**
- Create: `apps/web/app/privacy/page.tsx`
- Create: `apps/web/app/terms/page.tsx`
- Create: `apps/web/app/support/page.tsx`
- Create: `apps/web/app/pricing/page.tsx`
- Create: `apps/web/app/docs/install/page.tsx`
- Create: `apps/web/app/docs/uninstall/page.tsx`
- Create: `packages/marketplace/src/events.ts`
- Create: `packages/marketplace/src/plans.ts`
- Test: `packages/marketplace/src/events.test.ts`
- Test: `apps/web/app/pricing/page.test.tsx`

**Interfaces:**
- Initial plan ID: `free`.
- Marketplace webhook events are idempotent/audited.

- [ ] **Step 1: Add public compliance pages**

Content must reflect real implemented data flows, not boilerplate claims.

- [ ] **Step 2: Add Free plan model**

No billing integration. Pricing page clearly states $0 initial Marketplace plan and current limits if any.

- [ ] **Step 3: Handle Marketplace purchase/plan event envelope**

Persist event ID/action/account/plan transition with deduplication. Do not grant unsupported paid features.

- [ ] **Step 4: Add uninstall/data lifecycle tests**

Ensure installation deletion stops access and queued privileged jobs.

- [ ] **Step 5: Commit**

```bash
git add apps/web packages/marketplace
git commit -m "feat: prepare free ChangeGraph App for Marketplace compliance"
```

---

### Task 13: Separate GitHub Action Distribution Repository

**Files in new repository `changegraph-action`:**
- Create: `action.yml`
- Create: `src/index.ts`
- Create: `dist/index.js`
- Create: `README.md`
- Create: `LICENSE`
- Create: `SECURITY.md`
- Create: `.github/workflows/test.yml`
- Create: `.github/workflows/release.yml`
- Test: `src/index.test.ts`

**Interfaces:**
- Inputs: `base`, `head`, policy/config path.
- Outputs: report path, selected tests JSON, decision, risk, confidence.

- [ ] **Step 1: Create separate public action repository only when main core is stable**

Do not create this repository during early private MVP churn.

- [ ] **Step 2: Make Action run the released ChangeGraph CLI/core**

Do not fork analysis logic into Action-specific code.

- [ ] **Step 3: Add clean-room workflow test**

Test a fixture repository using the Action exactly as external users would.

- [ ] **Step 4: Add immutable release process**

Create versioned release tags; update major tag only through controlled release automation.

- [ ] **Step 5: Prepare Marketplace metadata and commit/release**

Follow GitHub's then-current Action Marketplace requirements at publication time.

---

### Task 14: Marketplace Launch Gate and End-to-End Verification

**Files:**
- Create: `docs/release/MARKETPLACE_CHECKLIST.md`
- Create: `docs/release/THREAT_MODEL.md`
- Create: `docs/release/SUPPORT_RUNBOOK.md`
- Create: `docs/release/INCIDENT_RUNBOOK.md`

**Interfaces:**
- None; release gate.

- [ ] **Step 1: Run security verification**

Verify least-privilege permissions, webhook signatures, token redaction, repository authorization, isolated execution, stale action rejection, and data deletion behavior.

- [ ] **Step 2: Run external-repository install test**

From an account/repository that did not develop ChangeGraph:

```text
install -> open PR -> receive Check -> inspect evidence -> request full suite -> uninstall
```

- [ ] **Step 3: Run MCP/Copilot evidence test**

Ask the ChangeGraph Reviewer the four contract prompts and confirm conclusions correspond to MCP evidence.

- [ ] **Step 4: Run ChangeBench release benchmark**

Publish measured safety/efficiency metrics, with misses visible.

- [ ] **Step 5: Validate every Marketplace link/asset**

Privacy, support, pricing, docs, screenshots, feature card, logo, status/contact routes.

- [ ] **Step 6: Submit free GitHub App listing**

Only after the then-current GitHub Marketplace requirements are re-read and checklist is updated if requirements changed.

---

# Expansion Verification Gate

Before calling the platform expansion complete:

```bash
pnpm typecheck
pnpm test
```

Expected: zero failures.

Additional required evidence:

- repository trust transitions tested;
- Intent Drift fixtures deterministic;
- Minimum Evidence planner cannot bypass full fallbacks;
- ChangeBench leakage test catches future history;
- MCP cross-repository authorization test passes;
- MCP tools are read-only in V1;
- Copilot profile does not allow mutation tools;
- Check requested-action stale-head test passes;
- remediation sandbox tests demonstrate no host-workspace mutation;
- public playground refuses private/arbitrary URLs;
- Marketplace install/uninstall lifecycle test passes;
- published benchmark clearly labels measured values vs targets.

# Execution order

Do not parallelize tasks that depend on the same domain contract prematurely.

Recommended batches:

```text
Batch 1: Tasks 1-4
Batch 2: Tasks 5-6
Batch 3: Task 7
Batch 4: Task 8
Batch 5: Tasks 9-10
Batch 6: Task 11
Batch 7: Task 12
Batch 8: Task 13
Batch 9: Task 14
```

The most valuable public milestone after the MVP is **Task 5/6 ChangeBench + Task 7/8 MCP/Copilot**, because together they demonstrate both measurable technical substance and integration with the current agent ecosystem.
