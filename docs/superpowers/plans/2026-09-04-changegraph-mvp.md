# ChangeGraph MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub-native TypeScript/JavaScript change-impact engine that maps pull-request changes to affected tests, publishes explainable risk/confidence in GitHub Checks, calibrates predictions against full CI, and permits selective execution only when deterministic safety policy allows it.

**Architecture:** A TypeScript monorepo separates repository indexing, semantic diffing, graph traversal, test adapters, scoring, policy, GitHub integration, persistence, worker execution, and UI. The same core analyzer powers the local CLI and hosted GitHub App. PostgreSQL stores reports/history/jobs; per-revision graph traversal stays in memory until measured workloads justify specialized graph infrastructure.

**Tech Stack:** Node.js 24 LTS, TypeScript 6, pnpm 10, Vitest 5, Next.js 16.3.3+, React 19.2, PostgreSQL, Drizzle ORM, Zod, GitHub App/Webhooks/Checks API, TypeScript Compiler API, Docker for untrusted test execution, OpenTelemetry.

**Spec:** `docs/superpowers/specs/2026-09-04-changegraph-design.md`

## Global Constraints

- Runtime is Node.js 24 LTS. Node 20 is EOL and must not be used.
- TypeScript uses `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- Next.js stays on the security-patched 16.3.x Active LTS line, at or above 16.3.3 until a newer supported security line supersedes it.
- Vitest 5 uses `test.projects` in `vitest.config.ts`; do not create the deprecated `vitest.workspace.ts` configuration.
- ChangeGraph core analysis works with no LLM configured.
- LLM output never alters risk, confidence, or safety policy.
- A hard fallback or confidence below policy threshold broadens validation to the full suite.
- New repositories start in Observe mode. Optimize mode requires calibration plus owner opt-in.
- Untrusted repository code never executes inside the web/API process.
- Every selection, score contribution, warning, and fallback has evidence provenance.
- V1 deep support is TypeScript/JavaScript with Vitest and Jest.
- No graph database, vector database, billing system, generic chat interface, or multi-agent framework is part of the MVP.
- Every package created under `packages/*` or `apps/*` gets a `package.json`, a `tsconfig.json` extending `tsconfig.base.json`, and package name `@changegraph/<directory-name>` unless the package is private-only.

---

## Locked Repository Structure

```text
apps/
  cli/
  web/
  worker/
packages/
  config/
  db/
  diff/
  github/
  graph/
  history/
  indexer-ts/
  policy/
  repo/
  report/
  scoring/
  telemetry/
  test-jest/
  test-vitest/
  tests-core/
fixtures/
benchmarks/
docs/
```

---

## Task 1 — Foundation, Toolchain, and CI

**Files**
- Create `package.json`
- Create `pnpm-workspace.yaml`
- Create `.npmrc`
- Create `.nvmrc`
- Create `tsconfig.base.json`
- Create `vitest.config.ts`
- Create `.gitignore`
- Create `.github/workflows/ci.yml`
- Create `packages/report/package.json`
- Create `packages/report/tsconfig.json`
- Test `packages/report/src/smoke.test.ts`

**Produces:** one reproducible Node 24/TypeScript 6/Vitest 5 workspace used by every later task.

- [ ] **Step 1: create root package metadata**

```json
{
  "name": "changegraph",
  "private": true,
  "packageManager": "pnpm@10",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "test": "vitest run",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^6.0.0",
    "vitest": "^5.0.0"
  }
}
```

- [ ] **Step 2: configure pnpm and TypeScript**

`pnpm-workspace.yaml`:

```yaml
packages:
  - apps/*
  - packages/*
  - benchmarks
```

`.nvmrc`:

```text
24
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: configure Vitest 5 projects**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*', 'benchmarks']
  }
});
```

- [ ] **Step 4: prove the toolchain**

```ts
import { describe, expect, it } from 'vitest';

describe('toolchain', () => {
  it('runs on Node 24', () => {
    expect(Number(process.versions.node.split('.')[0])).toBe(24);
  });
});
```

Run `pnpm install && pnpm test`. Expected: PASS.

- [ ] **Step 5: add GitHub Actions CI**

CI uses Node 24 and runs `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm test`.

- [ ] **Step 6: commit**

```bash
git add .
git commit -m "chore: initialize ChangeGraph monorepo"
```

---

## Task 2 — Canonical Report, Evidence, and Repository Policy

**Files**
- Create `packages/report/src/types.ts`
- Create `packages/report/src/schema.ts`
- Create `packages/report/src/index.ts`
- Create `packages/config/src/types.ts`
- Create `packages/config/src/schema.ts`
- Create `packages/config/src/load.ts`
- Create `packages/config/src/defaults.ts`
- Test `packages/report/src/schema.test.ts`
- Test `packages/config/src/config.test.ts`

**Produces:** `ChangeGraphReportV1`, `EvidenceRecord`, `PolicyDecision`, `RepositoryPolicy`, and strict runtime parsing.

- [ ] **Step 1: write report validation tests**

```ts
const valid = {
  schemaVersion: 1,
  repository: { owner: 'acme', name: 'app' },
  pullRequest: { number: 1, baseSha: 'a'.repeat(40), headSha: 'b'.repeat(40) },
  risk: { score: 20, band: 'low', factors: [] },
  confidence: { score: 0.9, band: 'high', factors: [] },
  changes: [], impacts: [],
  tests: { selected: [], skipped: [], mandatory: [] },
  policy: { kind: 'advisory', reasons: ['observe mode'] },
  evidence: []
};

expect(parseReport(valid).schemaVersion).toBe(1);
expect(() => parseReport({ ...valid, confidence: { ...valid.confidence, score: 1.1 } })).toThrow();
```

- [ ] **Step 2: define discriminated policy union**

```ts
export type PolicyDecision =
  | { kind: 'advisory'; reasons: string[] }
  | { kind: 'selective'; reasons: string[] }
  | { kind: 'full-fallback'; reasons: string[] };
```

Every score factor is `{ key, raw, normalized, weight, contribution, evidenceIds }`.

- [ ] **Step 3: implement schemas with Zod**

Validate score ranges, SHA shape, enum values, unique evidence IDs, and policy/config unknown keys.

- [ ] **Step 4: implement safe repository defaults**

```ts
export const DEFAULT_POLICY = {
  version: 1,
  mode: 'observe',
  analysis: { maxDependencyDepth: 8, maxAffectedNodes: 25_000 },
  selectiveCi: {
    minConfidence: 0.85,
    maxChangedSourceRatio: 0.20,
    explorationRate: 0.05
  },
  sentinels: [],
  criticalPaths: []
} as const;
```

Do not assume every repository has `src/auth` or `src/payments`; those belong in examples, not global defaults.

- [ ] **Step 5: test strict config behavior**

Missing `.changegraph.yml` returns defaults. Unknown keys throw. User configuration may make policy stricter but cannot disable protected hard fallbacks.

- [ ] **Step 6: commit**

```bash
git add packages/report packages/config
git commit -m "feat: define report and repository policy schemas"
```

---

## Task 3 — Git Diff, File Classification, and Deterministic Fixtures

**Files**
- Create `packages/repo/src/git.ts`
- Create `packages/repo/src/types.ts`
- Create `packages/repo/src/classify.ts`
- Create `packages/repo/src/fixture-repo.ts`
- Test `packages/repo/src/git.test.ts`
- Create fixture source under `fixtures/ts-basic/`

**Produces:** `getChangedFiles`, `readFileAt`, `classifyFile`, and a fixture helper that creates temporary Git histories with named refs `fixture-base` and `fixture-head`.

- [ ] **Step 1: test classification**

```ts
expect(classifyFile('pnpm-lock.yaml')).toBe('lockfile');
expect(classifyFile('.github/workflows/ci.yml')).toBe('ci-config');
expect(classifyFile('vitest.config.ts')).toBe('test-config');
expect(classifyFile('src/session.ts')).toBe('source');
expect(classifyFile('src/session.test.ts')).toBe('test');
```

- [ ] **Step 2: implement Git operations with `execFile`**

Use Node's `execFile`/promisified wrapper with argument arrays. Never build a shell command string from repository paths or refs.

- [ ] **Step 3: implement fixture history helper**

The helper copies fixture source into a temporary directory, runs `git init`, creates a base commit and tag `fixture-base`, applies scenario edits, creates a head commit and tag `fixture-head`, and returns the temporary path.

- [ ] **Step 4: test changed-file retrieval**

Call `getChangedFiles(temp, 'fixture-base', 'fixture-head')` and assert exact path/status.

- [ ] **Step 5: commit**

```bash
git add packages/repo fixtures/ts-basic
git commit -m "feat: add safe Git diff and fixture histories"
```

---

## Task 4 — TypeScript Semantic Indexer

**Files**
- Create `packages/indexer-ts/src/program.ts`
- Create `packages/indexer-ts/src/indexer.ts`
- Create `packages/indexer-ts/src/symbols.ts`
- Create `packages/indexer-ts/src/edges.ts`
- Create `packages/indexer-ts/src/stable-key.ts`
- Create `packages/indexer-ts/src/types.ts`
- Test `packages/indexer-ts/src/indexer.test.ts`
- Create `fixtures/ts-monorepo/`

**Produces:** `indexRepository(root, policy): Promise<RepositoryIndex>`.

- [ ] **Step 1: create a semantic fixture**

```ts
// src/session.ts
export function createSession() { return 'token'; }

// src/login.ts
import { createSession } from './session.js';
export function login() { return createSession(); }

// tests/login.test.ts
import { login } from '../src/login.js';
```

- [ ] **Step 2: write graph expectations before implementation**

Assert nodes for the files/functions, import edge from login to session, reference/call relationship when resolvable, and `parseSuccessRatio === 1`.

- [ ] **Step 3: build TypeScript 6 programs**

Discover relevant `tsconfig.json` files; use TypeScript module resolution; exclude `node_modules`, generated output, coverage output, and policy ignores.

- [ ] **Step 4: emit nodes, edges, and stable keys**

Stable symbol key format:

```text
{package}:{normalized-file-path}:{kind}:{qualified-symbol-name}
```

For anonymous constructs without stable identity, retain file-level evidence instead of fabricating a symbol key.

- [ ] **Step 5: record uncertainty**

Computed import specifiers, unresolved imports/references, `eval`, and other dynamic behavior increment explicit health counters used by confidence.

- [ ] **Step 6: commit after tests pass**

```bash
git add packages/indexer-ts fixtures/ts-monorepo
git commit -m "feat: index TypeScript symbols and dependencies"
```

---

## Task 5 — Semantic Change Mapping and Impact Graph

**Files**
- Create `packages/diff/src/map-changes.ts`
- Create `packages/diff/src/signature.ts`
- Create `packages/diff/src/types.ts`
- Create `packages/graph/src/graph.ts`
- Create `packages/graph/src/traverse.ts`
- Create `packages/graph/src/weights.ts`
- Test `packages/diff/src/map-changes.test.ts`
- Test `packages/graph/src/traverse.test.ts`

**Produces:** `ChangedEntity[]`, `buildGraph`, and `expandImpact` with evidence paths.

- [ ] **Step 1: test body vs signature changes**

Body-only edit returns `changeType: 'body'`; exported parameter/return signature change returns `changeType: 'signature', exported: true`; unmappable top-level side effect returns file-level `unknown`.

- [ ] **Step 2: implement smallest-containing-declaration mapping**

Use base/head AST locations plus Git diff ranges. Compare signature representation separately from function body text.

- [ ] **Step 3: implement reverse adjacency graph**

Deduplicate edges by `(source,target,kind)` and retain provenance/source location.

- [ ] **Step 4: implement weighted impact traversal**

Use a priority queue. Default costs:

```text
tests/coverage edge   0.25
calls                 1.00
references            1.00
route-uses            1.00
imports               1.25
depends-on-package    1.50
convention/path       2.00
```

Respect depth 8 and 25,000-node default budgets.

- [ ] **Step 5: test truncation safety signal**

A synthetic graph exceeding the node budget returns `truncated: true` and health reason `affected-node-budget-exceeded`.

- [ ] **Step 6: commit**

```bash
git add packages/diff packages/graph
git commit -m "feat: map semantic changes to explainable impact paths"
```

---

## Task 6 — Vitest/Jest Discovery, Test Mapping, and Ranking

**Files**
- Create `packages/tests-core/src/types.ts`
- Create `packages/tests-core/src/adapter.ts`
- Create `packages/test-vitest/src/adapter.ts`
- Create `packages/test-jest/src/adapter.ts`
- Create `packages/scoring/src/test-priority.ts`
- Create `packages/scoring/src/normalize.ts`
- Test adapters and scoring in each package
- Create `fixtures/vitest-basic/` and `fixtures/jest-basic/`

**Produces:** `TestRunnerAdapter`, `TestInventory`, `TestSelection`, and `rankTests`.

- [ ] **Step 1: lock the adapter interface**

```ts
export interface TestRunnerAdapter {
  discover(context: RepoContext): Promise<TestInventory>;
  commandFor(selection: TestSelection): Promise<RunnerCommand>;
  parseResults(result: ProcessResult): Promise<TestRunResult>;
}
```

`RunnerCommand` stores `{ executable, args, cwd, env }`, never a shell string.

- [ ] **Step 2: implement Vitest 5 adapter with tests**

Discover test/config/setup files and generate file-level selective execution commands. Detecting named test cases is allowed, but file-level execution is the initial safe unit.

- [ ] **Step 3: implement Jest adapter behind the same interface**

Normalize test results into shared `TestCaseResult` structures.

- [ ] **Step 4: link tests to affected nodes**

Provenance kinds are direct static import, transitive static path, dynamic coverage, history, path affinity, or sentinel.

- [ ] **Step 5: implement exact initial ranking formula**

```ts
priority = 0.45 * staticScore
         + 0.25 * historyScore
         + 0.20 * coverageScore
         + 0.10 * pathScore;

staticScore = 1 / (1 + dependencyDistance);
```

Sentinel tests are mandatory and bypass ranking thresholds.

- [ ] **Step 6: commit**

```bash
git add packages/tests-core packages/test-vitest packages/test-jest packages/scoring fixtures
git commit -m "feat: rank affected Vitest and Jest tests"
```

---

## Task 7 — Risk, Confidence, and Non-Bypassable Safety Policy

**Files**
- Create `packages/scoring/src/risk.ts`
- Create `packages/scoring/src/confidence.ts`
- Create `packages/policy/src/fallbacks.ts`
- Create `packages/policy/src/decide.ts`
- Test score formulas and a complete policy matrix
- Create `fixtures/unsafe-config-change/`

**Produces:** `assessRisk`, `assessConfidence`, and pure `decideExecution`.

- [ ] **Step 1: implement and test risk**

```ts
risk = 100 * (
  0.25 * criticality +
  0.20 * fanout +
  0.15 * apiSurface +
  0.10 * changeMagnitude +
  0.20 * testGap +
  0.10 * instability
);
```

- [ ] **Step 2: implement and test confidence**

```ts
confidence =
  0.30 * indexCompleteness +
  0.25 * resolutionCompleteness +
  0.20 * testMappingCompleteness +
  0.10 * historyDepth +
  0.15 * runnerCompatibility;
```

- [ ] **Step 3: implement protected hard fallbacks**

Default full-suite triggers include lockfile/dependency-set changes, TypeScript resolution config, test config/global setup, test-controlling GitHub Actions workflow, database schema/migration, unsupported adapter, >20% indexed source files changed, relevant parser failure >2%, relevant unresolved edges >5%, and analysis graph truncation.

- [ ] **Step 4: test the decision matrix**

```text
observe + 0.95 confidence + safe       -> advisory
recommend + 0.95 + safe                -> advisory
optimize + 0.90 + safe                 -> selective
optimize + 0.70 + safe                 -> full-fallback
optimize + 0.95 + lockfile changed     -> full-fallback
optimize + 0.95 + parser failures 3%   -> full-fallback
```

- [ ] **Step 5: prove config cannot disable protected fallbacks**

Attempt to configure a lockfile exception and assert protected policy still returns `full-fallback`.

- [ ] **Step 6: commit**

```bash
git add packages/scoring packages/policy fixtures/unsafe-config-change
git commit -m "feat: enforce risk confidence and CI safety policy"
```

---

## Task 8 — End-to-End Local Analyzer and CLI

**Files**
- Create `packages/report/src/build-report.ts`
- Create `apps/cli/package.json`
- Create `apps/cli/src/main.ts`
- Create `apps/cli/src/analyze.ts`
- Create `apps/cli/src/format.ts`
- Create `apps/cli/src/fixture-demo.ts`
- Test `apps/cli/src/analyze.test.ts`
- Test `apps/cli/src/e2e.test.ts`

**Produces:** `changegraph index`, `changegraph analyze`, `changegraph tests`, and `pnpm fixture:analyze`.

- [ ] **Step 1: implement analyzer orchestration**

Exact order:

```text
classify diff
-> index base/head
-> map changed symbols
-> expand impact
-> discover/map tests
-> rank tests
-> assess risk
-> assess confidence
-> decide policy
-> validate ChangeGraphReportV1
```

- [ ] **Step 2: expose human and JSON output**

`changegraph analyze --repo . --base main --head HEAD --json` writes only schema-valid JSON to stdout. Human output prints risk, confidence, selected tests, evidence reasons, and fallback reasons.

- [ ] **Step 3: create deterministic fixture demo command**

`pnpm fixture:analyze` uses `createFixtureRepo('ts-basic-body-change')`, which creates temporary `fixture-base` and `fixture-head` refs, runs the analyzer, and prints the report. No hand-supplied SHA placeholders are required.

- [ ] **Step 4: assert deterministic snapshots**

Run the same fixture twice, normalize only runtime timestamps/temporary paths, and compare reports.

- [ ] **Step 5: commit**

```bash
git add apps/cli packages/report
git commit -m "feat: ship deterministic local ChangeGraph analysis"
```

---

## Task 9 — PostgreSQL Persistence, History, and Durable Analysis Jobs

**Files**
- Create `packages/db/src/schema.ts`
- Create `packages/db/src/client.ts`
- Create `packages/db/src/jobs.ts`
- Create `packages/db/drizzle.config.ts`
- Create `packages/history/src/bayesian.ts`
- Create `packages/history/src/decay.ts`
- Create `packages/history/src/aggregate.ts`
- Test DB and history integration with `@testcontainers/postgresql`

**Produces:** installation/repository/index/analysis/test history persistence plus a PostgreSQL-leased analysis-job queue.

- [ ] **Step 1: create tables from the design spec**

Add `analysis_jobs` with `id`, `analysis_id`, `status`, `attempts`, `available_at`, `leased_until`, `last_error`, `created_at`, and a unique constraint on `analysis_id`.

- [ ] **Step 2: implement atomic job claiming**

Use one transaction with `SELECT ... FOR UPDATE SKIP LOCKED`, set a lease expiration, and increment attempts. A crashed worker's expired lease makes the job reclaimable.

- [ ] **Step 3: test Bayesian history**

```ts
expect(historyFailure(0, 0)).toBeCloseTo(0.25);
expect(historyFailure(1, 1)).toBeCloseTo(0.4);
expect(historyFailure(9, 10)).toBeCloseTo(10 / 14);
```

Formula: `(coFailures + 1) / (coChangeRuns + 4)`.

- [ ] **Step 4: implement recency weighting**

```ts
export const recencyWeight = (ageDays: number) => Math.exp(-ageDays / 90);
```

- [ ] **Step 5: integration-test job leasing and history persistence**

Start disposable Postgres, enqueue one analysis, claim it once, verify a second worker cannot claim it before lease expiry, persist test results, and reload aggregates.

- [ ] **Step 6: commit**

```bash
git add packages/db packages/history
git commit -m "feat: persist ChangeGraph history and durable analysis jobs"
```

---

## Task 10 — GitHub App, Secure Webhooks, Worker, and Checks

**Files**
- Create `packages/github/src/verify-webhook.ts`
- Create `packages/github/src/auth.ts`
- Create `packages/github/src/client.ts`
- Create `packages/github/src/events.ts`
- Create `packages/github/src/checks.ts`
- Create `packages/github/src/check-format.ts`
- Create `apps/web/app/api/github/webhook/route.ts`
- Create `apps/worker/src/worker.ts`
- Create `apps/worker/src/jobs/analyze-pr.ts`
- Test signature verification, deduplication, supersession, and Check formatting

**Produces:** secure PR ingestion and GitHub-native advisory results.

- [ ] **Step 1: test and implement webhook HMAC verification**

Compute SHA-256 HMAC over raw bytes and compare equal-length buffers with Node `timingSafeEqual`. A one-byte body mutation must fail.

- [ ] **Step 2: deduplicate delivery IDs before job creation**

Persist `X-GitHub-Delivery`. Duplicate delivery returns `202` and cannot create a second `analysis_job`.

- [ ] **Step 3: support PR `opened`, `synchronize`, and `reopened`**

Resolve installation credentials only after signature validation. Store base/head SHA and enqueue analysis.

- [ ] **Step 4: implement supersession**

When a newer head SHA is current, a worker handling an older PR head marks it `cancelled_superseded` and does not publish that old analysis as current.

- [ ] **Step 5: publish Checks**

Start an in-progress Check, then complete with:

```text
Risk: High (72/100)
Confidence: 91%
Selected: 41/387
Decision: advisory
```

Include factor breakdown, selected-test reasons, fallback reason, and conservative line annotations where a valid changed source location exists.

- [ ] **Step 6: verify GitHub failure semantics**

Infrastructure/model failure never becomes a successful safety result. A model outage may still allow deterministic analysis to complete without AI text.

- [ ] **Step 7: commit**

```bash
git add packages/github apps/web/app/api/github apps/worker
git commit -m "feat: publish ChangeGraph advisory checks on pull requests"
```

---

## Task 11 — Shadow Calibration and Benchmark Harness

**Files**
- Create `benchmarks/package.json`
- Create `benchmarks/src/scenarios.ts`
- Create `benchmarks/src/replay.ts`
- Create `benchmarks/src/metrics.ts`
- Create `benchmarks/src/cli.ts`
- Create `packages/history/src/calibration.ts`
- Test metric definitions, no-future-leakage replay, and miss classification

**Produces:** repeatable safety/performance measurements and promotion recommendation.

- [ ] **Step 1: implement exact metrics**

```ts
failureRecall = selectedFailingTests / allFailingTests;
selectionRatio = selectedTests / allTests;
runtimeRatio = selectedTestDurationMs / allTestDurationMs;
```

- [ ] **Step 2: define controlled scenarios**

At minimum:

```text
ts-basic-body-change
ts-transitive-change
ts-export-signature-change
unrelated-change
dynamic-import-uncertainty
lockfile-fallback
test-config-fallback
monorepo-package-change
```

Each scenario generates a temporary Git history and known full-suite outcome.

- [ ] **Step 3: implement historical replay without future leakage**

When replaying event N, ranking only sees history from events before N.

- [ ] **Step 4: classify every miss**

Allowed causes:

```text
static-graph-miss
dynamic-dependency
missing-test-inventory
cold-history
adapter-error
threshold-error
flaky-unrelated
unknown
```

- [ ] **Step 5: implement promotion recommendation**

Recommendation requires comparable runs >=50, failing-test recall >=0.99, and no unresolved systematic miss class. It never flips repository mode automatically.

- [ ] **Step 6: expose repeatable CLI**

`pnpm --filter @changegraph/benchmarks benchmark ts-basic-body-change` prints expected/selected tests, full vs selected duration, recall, fallback, and evidence.

- [ ] **Step 7: commit**

```bash
git add benchmarks packages/history
git commit -m "feat: measure ChangeGraph safety in shadow mode"
```

---

## Task 12 — Policy-Approved Docker Test Execution

**Files**
- Create `packages/tests-core/src/executor.ts`
- Create `packages/tests-core/src/docker-executor.ts`
- Create `packages/tests-core/src/limits.ts`
- Create `apps/worker/src/jobs/run-tests.ts`
- Test executor argument safety and policy enforcement

**Produces:** an isolated execution boundary for selective/full test plans.

- [ ] **Step 1: lock executor contract**

```ts
export interface TestExecutor {
  execute(workspace: string, command: RunnerCommand, limits: ExecutionLimits): Promise<ProcessResult>;
}
```

- [ ] **Step 2: implement Docker executor**

Use `docker run --rm` with explicit argument arrays, CPU/memory/time/output limits, a disposable container, and no host credentials. Default network mode is `none`; repositories that require dependency installation use a separate dependency-preparation policy rather than silently enabling unrestricted runtime network access.

- [ ] **Step 3: mount only the ephemeral checked-out workspace**

No home directory, Docker socket, SSH agent, cloud credential directory, or application secrets are mounted.

- [ ] **Step 4: enforce policy before execution**

`run-tests.ts` accepts only the `TestSelection` attached to a validated `selective` decision or the full inventory attached to `full-fallback`. It cannot narrow the plan further.

- [ ] **Step 5: test malicious filename handling**

A test file named `a;touch-pwned.test.ts` remains one argument and cannot execute a second command. Confirm no host file is created.

- [ ] **Step 6: persist execution provenance**

Record exact tests, adapter version, container image digest, duration, exit status, and selective/full mode.

- [ ] **Step 7: commit**

```bash
git add packages/tests-core apps/worker/src/jobs/run-tests.ts
git commit -m "feat: execute policy-approved tests in isolated containers"
```

---

## Task 13 — Dashboard and Interactive Evidence UX

**Files**
- Create `apps/web/package.json`
- Create `apps/web/app/layout.tsx`
- Create `apps/web/app/page.tsx`
- Create `apps/web/app/repos/[owner]/[name]/page.tsx`
- Create `apps/web/app/repos/[owner]/[name]/pull/[number]/page.tsx`
- Create `apps/web/components/risk-card.tsx`
- Create `apps/web/components/confidence-card.tsx`
- Create `apps/web/components/test-plan.tsx`
- Create `apps/web/components/impact-graph.tsx`
- Test with Vitest 5 + Testing Library

**Produces:** recruiter-quality and maintainer-useful report visualization.

- [ ] **Step 1: install patched web dependencies**

Pin Next.js at `16.3.3` or a later 16.3.x security patch available on implementation day; use React 19.2-compatible versions and commit the lockfile.

- [ ] **Step 2: test accessible score cards**

Given risk 72/high and confidence 0.91/high, assert numeric score, textual band, and factors are rendered; do not communicate state through color alone.

- [ ] **Step 3: build PR page in evidence-first order**

```text
execution decision
risk + confidence
changed symbols
impacted systems
selected tests + reasons
impact graph
fallback/audit detail
```

- [ ] **Step 4: bound graph payloads**

Initial render contains changed nodes, selected tests, and shortest evidence paths only. Expansion fetches additional neighbors; never render the entire 25,000-node budget.

- [ ] **Step 5: build repository calibration page**

Show Observe/Recommend/Optimize mode, index health, failing-test recall, selection ratio, runtime ratio, fallback reasons, and miss taxonomy from real stored data.

- [ ] **Step 6: commit**

```bash
git add apps/web
git commit -m "feat: visualize pull request impact and calibration evidence"
```

---

## Task 14 — OpenTelemetry, Auditability, and Final MVP Verification

**Files**
- Create `packages/telemetry/src/tracing.ts`
- Create `packages/telemetry/src/metrics.ts`
- Create `packages/telemetry/src/index.ts`
- Instrument CLI analyzer, worker, GitHub, indexing, traversal, ranking, policy, and test execution
- Test no-exporter operation and source/secret redaction

**Produces:** measured performance and an auditable production path.

- [ ] **Step 1: instrument named spans**

```text
changegraph.webhook.verify
changegraph.github.fetch_pr
changegraph.repo.checkout
changegraph.indexer.index
changegraph.diff.map_symbols
changegraph.graph.expand_impact
changegraph.tests.discover
changegraph.tests.rank
changegraph.policy.decide
changegraph.runner.execute
changegraph.github.publish_check
```

- [ ] **Step 2: record operational/product metrics**

Analysis/index duration, graph size, parse/resolution health, selected/full test count, predicted/actual duration, fallback reason, GitHub API use, calibration misses, and false-negative audit events.

- [ ] **Step 3: prove telemetry is optional**

Run core tests with no exporter configured. Expected: PASS with no external connection attempt required for correctness.

- [ ] **Step 4: prove redaction**

Telemetry test inputs containing a fake token, source body, and webhook secret must not appear in exported attributes/log payload snapshots.

- [ ] **Step 5: run clean verification**

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm fixture:analyze
pnpm --filter @changegraph/benchmarks benchmark ts-basic-body-change
pnpm --filter @changegraph/benchmarks benchmark lockfile-fallback
```

Expected:

- all tests/static checks exit 0;
- `ts-basic-body-change` identifies its changed symbol, dependent test, evidence path, risk, confidence, and policy;
- `lockfile-fallback` returns `full-fallback`;
- benchmark output contains measured rather than hard-coded selected/full counts and durations.

- [ ] **Step 6: run GitHub installation verification**

On a dedicated test repository: open a PR, verify one in-progress Check, verify one completed advisory report, push a second commit, and verify the new head supersedes the old analysis.

- [ ] **Step 7: publish only measured claims**

Before adding performance numbers to README/portfolio, export benchmark results and verify they reproduce. Never convert the design targets (99% recall, 50% test reduction, 40% wall-clock reduction) into claims until data supports them.

- [ ] **Step 8: commit**

```bash
git add packages/telemetry apps packages docs
git commit -m "feat: complete observable ChangeGraph MVP"
```

---

# MVP Acceptance Gate

The MVP is not complete until all of the following are true:

1. Local CLI and hosted worker produce the same `ChangeGraphReportV1` for the same revision pair.
2. A TypeScript body/signature change maps to deterministic changed symbols.
3. Reverse graph traversal produces inspectable evidence paths to tests.
4. Vitest and Jest test files can be discovered and selected.
5. Risk and confidence are separately visible with factor contributions.
6. Protected hard fallbacks are non-bypassable by repository config.
7. A real GitHub App check appears on PRs and handles duplicate/superseded events correctly.
8. Shadow benchmarks measure failure recall, selection ratio, runtime ratio, fallback rate, and miss causes.
9. Selective execution happens only behind an explicit Optimize policy decision.
10. Untrusted test code executes outside the web/API privilege boundary.
11. Benchmark/report performance claims come from recorded measurements.
12. The core remains fully useful with all LLM features disabled.

---

# Separate Post-MVP Implementation Plans

The following are fully specified at product level in the design/roadmap but intentionally require separate implementation plans after MVP evidence is reviewed:

1. Evidence-linked LLM reviewer explanations.
2. Docker Sandboxes remediation agent for regression tests/fixes.
3. Python/pytest semantic and runner adapters.
4. SCIP index ingestion for broader language support.
5. Dynamic per-test coverage ingestion.
6. Learned ranking/calibration beyond transparent fixed weights.
7. Multi-repository/service dependency graphs.
8. Self-hosted/enterprise indexing and execution architecture.

Do not start these simply because they look impressive. Start them only after the MVP demonstrates reliable impact/test intelligence.
