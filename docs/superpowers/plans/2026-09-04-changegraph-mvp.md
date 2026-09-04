# ChangeGraph MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub-native TypeScript/JavaScript change-impact engine that maps pull-request changes to affected tests, publishes explainable risk/confidence in GitHub Checks, calibrates against full CI, and only permits selective execution when deterministic safety policy allows it.

**Architecture:** A TypeScript monorepo separates repository indexing, diff mapping, graph traversal, test adapters, scoring, safety policy, GitHub integration, persistence, and UI. The core is deterministic and runnable locally through a CLI; GitHub/web/worker layers consume the same versioned analysis report. PostgreSQL persists installation/history/report data while graph traversal remains in-memory per repository index until measurements justify a dedicated graph store.

**Tech Stack:** Node.js 24 LTS, TypeScript 6, pnpm workspaces, Vitest 5, Next.js 16.3.x, React 19.2, PostgreSQL, Drizzle ORM, GitHub App/Webhooks/Checks API, TypeScript Compiler API, OpenTelemetry.

**Spec:** `docs/superpowers/specs/2026-09-04-changegraph-design.md`

## Global Constraints

- Runtime is Node.js 24 LTS; do not target Node 20, which is EOL as of this plan.
- TypeScript is strict and uses TypeScript 6.
- Next.js must stay on the patched 16.3.x Active LTS line, at or above 16.3.3 unless a newer security release supersedes it.
- ChangeGraph core analysis must work with no LLM configured.
- LLM output may never alter risk, confidence, or safety-policy decisions.
- Low confidence or a hard fallback trigger must broaden validation to full suite.
- New repositories begin in Observe mode; Optimize mode is never enabled automatically.
- Untrusted repository commands never execute inside the web/API process.
- Every test selection and risk item must have evidence provenance.
- V1 deep support is TypeScript/JavaScript with Vitest and Jest.
- No graph database, vector database, billing system, or multi-agent framework is added during the MVP.

---

## File Structure Locked by This Plan

```text
apps/
  web/
  worker/
  cli/
packages/
  config/
  db/
  github/
  repo/
  diff/
  indexer-ts/
  graph/
  tests-core/
  test-vitest/
  test-jest/
  history/
  scoring/
  policy/
  report/
  telemetry/
fixtures/
benchmarks/
docs/
```

---

### Task 1: Monorepo Foundation and Shared Tooling

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `.npmrc`
- Create: `.nvmrc`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `.gitignore`
- Create: `.github/workflows/ci.yml`
- Create: `packages/report/package.json`
- Create: `packages/report/tsconfig.json`
- Test: `packages/report/src/smoke.test.ts`

**Interfaces:**
- Produces: shared Node/TypeScript/Vitest conventions consumed by every later task.

- [ ] **Step 1: Create workspace metadata**

`package.json`:

```json
{
  "name": "changegraph",
  "private": true,
  "packageManager": "pnpm@10",
  "engines": { "node": ">=24 <25" },
  "scripts": {
    "build": "pnpm -r build",
    "test": "vitest run --workspace vitest.workspace.ts",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "typescript": "^6.0.0",
    "vitest": "^5.0.0"
  }
}
```

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

- [ ] **Step 2: Add strict TypeScript baseline**

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

- [ ] **Step 3: Add first test and run it**

`packages/report/src/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('workspace', () => {
  it('runs tests under Node 24', () => {
    expect(Number(process.versions.node.split('.')[0])).toBe(24);
  });
});
```

Run:

```bash
pnpm install
pnpm test
```

Expected: PASS.

- [ ] **Step 4: Add CI**

`.github/workflows/ci.yml` must use Node 24 and run `pnpm install --frozen-lockfile`, `pnpm typecheck`, and `pnpm test`.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize ChangeGraph TypeScript monorepo"
```

---

### Task 2: Versioned Analysis Report and Evidence Schema

**Files:**
- Create: `packages/report/src/types.ts`
- Create: `packages/report/src/schema.ts`
- Create: `packages/report/src/index.ts`
- Test: `packages/report/src/schema.test.ts`

**Interfaces:**
- Produces: `ChangeGraphReportV1`, `EvidenceRecord`, `RiskAssessment`, `ConfidenceAssessment`, `PolicyDecision`, and schema validation used by CLI, worker, GitHub publisher, DB, benchmark, and web.

- [ ] **Step 1: Write validation tests**

```ts
import { describe, expect, it } from 'vitest';
import { parseReport } from './schema.js';

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

describe('report schema', () => {
  it('accepts a valid v1 report', () => expect(parseReport(valid).schemaVersion).toBe(1));
  it('rejects confidence above 1', () => {
    expect(() => parseReport({ ...valid, confidence: { ...valid.confidence, score: 1.1 } })).toThrow();
  });
});
```

- [ ] **Step 2: Define exact report types**

Use discriminated unions for policy decisions:

```ts
export type PolicyDecision =
  | { kind: 'advisory'; reasons: string[] }
  | { kind: 'selective'; reasons: string[] }
  | { kind: 'full-fallback'; reasons: string[] };
```

Define score factors as `{ key, raw, normalized, weight, contribution, evidenceIds }` so every score is inspectable.

- [ ] **Step 3: Implement runtime schema validation**

Use a schema library such as Zod in `schema.ts`; validate SHA format, score ranges, enum values, and evidence IDs.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @changegraph/report test
```

Expected: all schema tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/report
git commit -m "feat: define versioned ChangeGraph analysis report"
```

---

### Task 3: Repository Policy Configuration

**Files:**
- Create: `packages/config/src/types.ts`
- Create: `packages/config/src/schema.ts`
- Create: `packages/config/src/load.ts`
- Create: `packages/config/src/defaults.ts`
- Test: `packages/config/src/config.test.ts`
- Create: `fixtures/config/valid/.changegraph.yml`
- Create: `fixtures/config/invalid/.changegraph.yml`

**Interfaces:**
- Produces: `RepositoryPolicy`, `loadRepositoryPolicy(root: string): Promise<RepositoryPolicy>`.

- [ ] **Step 1: Write tests for defaults and rejection**

```ts
it('defaults new repositories to observe mode', async () => {
  const config = await loadRepositoryPolicy(fixture('missing'));
  expect(config.mode).toBe('observe');
  expect(config.selectiveCi.minConfidence).toBe(0.85);
});

it('rejects unknown keys', async () => {
  await expect(loadRepositoryPolicy(fixture('invalid'))).rejects.toThrow(/unknown/i);
});
```

- [ ] **Step 2: Implement exact defaults**

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
  criticalPaths: ['src/auth/**', 'src/payments/**']
} as const;
```

- [ ] **Step 3: Parse `.changegraph.yml` strictly**

Unknown fields fail. User policy may increase `minConfidence` but the later policy engine must preserve non-overridable fallbacks.

- [ ] **Step 4: Test**

```bash
pnpm --filter @changegraph/config test
```

- [ ] **Step 5: Commit**

```bash
git add packages/config fixtures/config
git commit -m "feat: add strict repository policy configuration"
```

---

### Task 4: Git Repository and Diff Abstraction

**Files:**
- Create: `packages/repo/src/git.ts`
- Create: `packages/repo/src/types.ts`
- Create: `packages/repo/src/classify.ts`
- Test: `packages/repo/src/git.test.ts`
- Create: `fixtures/ts-basic/` repository fixture content

**Interfaces:**
- Produces:
  - `getChangedFiles(root, baseSha, headSha): Promise<ChangedFile[]>`
  - `readFileAt(root, sha, path): Promise<string | null>`
  - `classifyFile(path): FileClass`

- [ ] **Step 1: Write classification tests**

```ts
expect(classifyFile('pnpm-lock.yaml')).toBe('lockfile');
expect(classifyFile('.github/workflows/ci.yml')).toBe('ci-config');
expect(classifyFile('vitest.config.ts')).toBe('test-config');
expect(classifyFile('src/auth/session.ts')).toBe('source');
expect(classifyFile('src/auth/session.test.ts')).toBe('test');
```

- [ ] **Step 2: Implement Git commands with argument arrays**

Use `spawnFile`/`execFile` rather than shell-interpolated commands. Parse `git diff --name-status` and unified zero-context diff output.

- [ ] **Step 3: Add fixture Git history inside test setup**

The test creates a temporary repo, commits base, edits one source file, commits head, then asserts the changed file and status.

- [ ] **Step 4: Run tests**

```bash
pnpm --filter @changegraph/repo test
```

- [ ] **Step 5: Commit**

```bash
git add packages/repo fixtures/ts-basic
git commit -m "feat: add safe Git diff and file classification"
```

---

### Task 5: TypeScript Semantic Indexer

**Files:**
- Create: `packages/indexer-ts/src/indexer.ts`
- Create: `packages/indexer-ts/src/program.ts`
- Create: `packages/indexer-ts/src/symbols.ts`
- Create: `packages/indexer-ts/src/edges.ts`
- Create: `packages/indexer-ts/src/stable-key.ts`
- Create: `packages/indexer-ts/src/types.ts`
- Test: `packages/indexer-ts/src/indexer.test.ts`
- Expand: `fixtures/ts-basic/`
- Create: `fixtures/ts-monorepo/`

**Interfaces:**
- Consumes: repository root and `RepositoryPolicy`.
- Produces: `RepositoryIndex { nodes, edges, health, compilerConfigs }`.

- [ ] **Step 1: Write expected graph fixture test**

Fixture:

```ts
// src/session.ts
export function createSession() { return 'token'; }

// src/login.ts
import { createSession } from './session.js';
export function login() { return createSession(); }

// tests/login.test.ts
import { login } from '../src/login.js';
```

Test expectations:

```ts
expect(index.nodes.some(n => n.stableKey.endsWith(':function:createSession'))).toBe(true);
expect(index.edges).toContainEqual(expect.objectContaining({ kind: 'imports' }));
expect(index.health.parseSuccessRatio).toBe(1);
```

- [ ] **Step 2: Build TypeScript programs from discovered tsconfigs**

Use TypeScript 6 compiler APIs. Exclude `node_modules`, build output, coverage output, and repository policy ignore patterns.

- [ ] **Step 3: Emit nodes and edges**

Record declarations, imports, exports, re-exports, references, and statically resolvable calls with source locations.

- [ ] **Step 4: Record uncertainty**

Computed module specifiers and unresolvable references increment health counters; they are not silently discarded.

- [ ] **Step 5: Test and commit**

```bash
pnpm --filter @changegraph/indexer-ts test
git add packages/indexer-ts fixtures/ts-basic fixtures/ts-monorepo
git commit -m "feat: index TypeScript symbols and dependencies"
```

---

### Task 6: Semantic Diff to Changed Symbols

**Files:**
- Create: `packages/diff/src/map-changes.ts`
- Create: `packages/diff/src/signature.ts`
- Create: `packages/diff/src/types.ts`
- Test: `packages/diff/src/map-changes.test.ts`

**Interfaces:**
- Consumes: base/head file content, diff ranges, base/head index.
- Produces: `ChangedEntity[]` from the report package.

- [ ] **Step 1: Write body-vs-signature tests**

```ts
it('classifies body-only edit', () => {
  const result = mapChanges(baseBodyFixture, headBodyFixture, ranges);
  expect(result[0]?.changeType).toBe('body');
});

it('classifies exported signature edit', () => {
  const result = mapChanges(baseSignatureFixture, headSignatureFixture, ranges);
  expect(result[0]).toMatchObject({ changeType: 'signature', exported: true });
});
```

- [ ] **Step 2: Implement smallest-containing-symbol mapping**

Map changed lines to the narrowest declaration location. If no trustworthy symbol is found, emit a file-level `unknown` change.

- [ ] **Step 3: Compare signatures**

Normalize declaration signature text/type info separately from body so body-only edits do not look like API breaks.

- [ ] **Step 4: Test uncertainty**

Add a top-level side-effect change fixture and assert file-level fallback classification.

- [ ] **Step 5: Commit**

```bash
git add packages/diff
git commit -m "feat: map Git diffs to semantic TypeScript changes"
```

---

### Task 7: Graph Engine and Explainable Impact Paths

**Files:**
- Create: `packages/graph/src/graph.ts`
- Create: `packages/graph/src/traverse.ts`
- Create: `packages/graph/src/weights.ts`
- Create: `packages/graph/src/types.ts`
- Test: `packages/graph/src/traverse.test.ts`

**Interfaces:**
- Produces:
  - `buildGraph(index): ChangeGraph`
  - `expandImpact(graph, changed, options): ImpactResult`

- [ ] **Step 1: Write traversal test**

Construct:

```text
createSession <- login <- authRoute <- login.test
```

Assert `login.test` is impacted and the returned path contains every node in order.

- [ ] **Step 2: Implement reverse adjacency graph**

Store outgoing and incoming adjacency maps. Deduplicate edges by `(source,target,kind)`.

- [ ] **Step 3: Implement weighted shortest-path traversal**

Use a priority queue and edge costs from `docs/ARCHITECTURE.md`. Stop at depth/node budgets.

- [ ] **Step 4: Test budget overflow**

Create a synthetic graph above configured node budget and assert:

```ts
expect(result.truncated).toBe(true);
expect(result.healthReasons).toContain('affected-node-budget-exceeded');
```

- [ ] **Step 5: Commit**

```bash
git add packages/graph
git commit -m "feat: compute explainable reverse impact paths"
```

---

### Task 8: Test Inventory and Vitest/Jest Adapters

**Files:**
- Create: `packages/tests-core/src/types.ts`
- Create: `packages/tests-core/src/adapter.ts`
- Create: `packages/test-vitest/src/adapter.ts`
- Create: `packages/test-jest/src/adapter.ts`
- Test: `packages/test-vitest/src/adapter.test.ts`
- Test: `packages/test-jest/src/adapter.test.ts`
- Create: `fixtures/vitest-basic/`
- Create: `fixtures/jest-basic/`

**Interfaces:**
- Produces `TestRunnerAdapter` exactly as defined in the design spec.

- [ ] **Step 1: Define adapter interface**

```ts
export interface TestRunnerAdapter {
  discover(context: RepoContext): Promise<TestInventory>;
  commandFor(selection: TestSelection): Promise<RunnerCommand>;
  parseResults(result: ProcessResult): Promise<TestRunResult>;
}
```

- [ ] **Step 2: Write Vitest discovery/command tests**

Assert `tests/login.test.ts` is discovered and command generation produces executable + args array, not a shell string.

- [ ] **Step 3: Implement Vitest 5 adapter**

Discover config/setup files and test files. Initial selective execution may be file-level even when named test cases are discovered.

- [ ] **Step 4: Implement Jest adapter behind same interface**

Use Jest's supported file-selection invocation and normalize results to common types.

- [ ] **Step 5: Test and commit**

```bash
pnpm --filter @changegraph/test-vitest test
pnpm --filter @changegraph/test-jest test
git add packages/tests-core packages/test-vitest packages/test-jest fixtures/vitest-basic fixtures/jest-basic
git commit -m "feat: discover and invoke Vitest and Jest test subsets"
```

---

### Task 9: Test Mapping and Priority Scoring

**Files:**
- Create: `packages/scoring/src/test-priority.ts`
- Create: `packages/scoring/src/normalize.ts`
- Create: `packages/scoring/src/types.ts`
- Test: `packages/scoring/src/test-priority.test.ts`

**Interfaces:**
- Produces `rankTests(input): RankedTest[]` with evidence IDs.

- [ ] **Step 1: Write deterministic weight test**

```ts
const ranked = rankTests({
  candidates: [{ id: 'direct', static: 1, history: 0, coverage: 0, path: 0 },
               { id: 'history', static: 0, history: 1, coverage: 0, path: 0 }]
});
expect(ranked[0]?.id).toBe('direct');
expect(ranked.find(x => x.id === 'direct')?.score).toBeCloseTo(0.45);
```

- [ ] **Step 2: Implement exact initial formula**

```ts
score = 0.45 * staticScore
      + 0.25 * historyScore
      + 0.20 * coverageScore
      + 0.10 * pathScore;
```

Clamp every input to `[0,1]` and persist component contributions.

- [ ] **Step 3: Implement static distance score**

`staticScore = 1 / (1 + distance)` with direct explicit coverage/test edges promotable to `1.0`.

- [ ] **Step 4: Add sentinel precedence**

Mandatory/sentinel tests are selected before ranking and are never dropped for score threshold.

- [ ] **Step 5: Commit**

```bash
git add packages/scoring
git commit -m "feat: rank affected tests with explainable evidence"
```

---

### Task 10: Risk, Confidence, and Safety Policy

**Files:**
- Create: `packages/scoring/src/risk.ts`
- Create: `packages/scoring/src/confidence.ts`
- Create: `packages/policy/src/fallbacks.ts`
- Create: `packages/policy/src/decide.ts`
- Test: `packages/scoring/src/risk.test.ts`
- Test: `packages/scoring/src/confidence.test.ts`
- Test: `packages/policy/src/decide.test.ts`
- Create: `fixtures/unsafe-config-change/`

**Interfaces:**
- Produces `assessRisk`, `assessConfidence`, `decideExecution`.

- [ ] **Step 1: Test exact scoring formulas**

Risk:

```ts
risk = 100 * (
  0.25 * criticality +
  0.20 * fanout +
  0.15 * api +
  0.10 * changeMagnitude +
  0.20 * testGap +
  0.10 * instability
);
```

Confidence:

```ts
confidence =
  0.30 * indexCompleteness +
  0.25 * resolutionCompleteness +
  0.20 * testMappingCompleteness +
  0.10 * historyDepth +
  0.15 * runnerCompatibility;
```

- [ ] **Step 2: Implement hard fallback matcher**

Include lockfiles, root dependency manifests, tsconfig resolution changes, test config, global test setup, GitHub test workflow, schema/migrations, protected critical config, >20% source changes, parser failures >2%, unresolved relevant edges >5%, and unsupported adapters.

- [ ] **Step 3: Write policy matrix tests**

Required cases:

```text
observe + high confidence -> advisory
recommend + high confidence -> advisory/recommendation
optimize + confidence 0.90 + safe -> selective
optimize + confidence 0.70 -> full-fallback
optimize + lockfile change -> full-fallback
optimize + parser failure ratio 0.03 -> full-fallback
```

- [ ] **Step 4: Ensure config cannot disable protected fallbacks**

Add a test attempting to override a lockfile fallback and assert it remains full-fallback.

- [ ] **Step 5: Commit**

```bash
git add packages/scoring packages/policy fixtures/unsafe-config-change
git commit -m "feat: add deterministic risk confidence and safety policy"
```

---

### Task 11: End-to-End Local Analyzer and CLI

**Files:**
- Create: `packages/report/src/build-report.ts`
- Create: `apps/cli/src/main.ts`
- Create: `apps/cli/src/analyze.ts`
- Create: `apps/cli/src/format.ts`
- Test: `apps/cli/src/analyze.test.ts`
- Test: `apps/cli/src/e2e.test.ts`

**Interfaces:**
- Produces CLI commands:
  - `changegraph index`
  - `changegraph analyze --base <sha> --head <sha> --json`
  - `changegraph tests --base <sha> --head <sha>`

- [ ] **Step 1: Write E2E fixture test**

Create base/head commits in a fixture where `createSession` changes and `login.test.ts` depends transitively. Assert CLI JSON includes the changed symbol, test, evidence path, risk, confidence, and policy.

- [ ] **Step 2: Implement `buildReport` orchestration**

Sequence: diff -> index -> map changes -> impact -> discover tests -> rank -> risk/confidence -> policy -> report validation.

- [ ] **Step 3: Implement human and JSON CLI output**

Human output must print explicit fallback reasons. `--json` must output only the schema-valid report to stdout so tools can pipe it.

- [ ] **Step 4: Test deterministic output**

Run same fixture twice and compare normalized JSON snapshots.

- [ ] **Step 5: Commit**

```bash
git add apps/cli packages/report
git commit -m "feat: ship local ChangeGraph analysis CLI"
```

---

### Task 12: PostgreSQL Schema and Historical Model

**Files:**
- Create: `packages/db/src/schema.ts`
- Create: `packages/db/src/client.ts`
- Create: `packages/history/src/aggregate.ts`
- Create: `packages/history/src/decay.ts`
- Create: `packages/history/src/bayesian.ts`
- Test: `packages/history/src/history.test.ts`
- Create: `packages/db/drizzle.config.ts`

**Interfaces:**
- Produces:
  - persistence for installations/repos/indexes/analyses/test runs/results/audit events;
  - `historyFailure(coFailures, coChangeRuns)`;
  - decayed historical aggregate lookup.

- [ ] **Step 1: Define Drizzle tables from spec**

Use explicit unique constraints for GitHub installation/repository IDs and analysis identity `(repositoryId,pullNumber,headSha)`.

- [ ] **Step 2: Test Bayesian smoothing**

```ts
expect(historyFailure(0, 0)).toBeCloseTo(0.25);
expect(historyFailure(1, 1)).toBeCloseTo(0.4);
expect(historyFailure(9, 10)).toBeCloseTo(10 / 14);
```

Formula:

```ts
(coFailures + 1) / (coChangeRuns + 4)
```

- [ ] **Step 3: Implement 90-day exponential decay**

```ts
export const recencyWeight = (ageDays: number) => Math.exp(-ageDays / 90);
```

- [ ] **Step 4: Add DB integration test with disposable Postgres**

Persist analysis, test run, and results; reload and aggregate history.

- [ ] **Step 5: Commit**

```bash
git add packages/db packages/history
git commit -m "feat: persist analyses and historical test intelligence"
```

---

### Task 13: GitHub App Webhook Security and API Client

**Files:**
- Create: `packages/github/src/verify-webhook.ts`
- Create: `packages/github/src/auth.ts`
- Create: `packages/github/src/client.ts`
- Create: `packages/github/src/events.ts`
- Create: `apps/web/app/api/github/webhook/route.ts`
- Test: `packages/github/src/verify-webhook.test.ts`
- Test: `apps/web/app/api/github/webhook/route.test.ts`

**Interfaces:**
- Produces verified event envelope and installation-scoped GitHub client.

- [ ] **Step 1: Test HMAC verification**

Use a known secret/body pair; assert valid signature passes and one-byte body mutation fails.

- [ ] **Step 2: Implement constant-time verification**

Compute SHA-256 HMAC over raw bytes and compare equal-length buffers with `timingSafeEqual`.

- [ ] **Step 3: Deduplicate `X-GitHub-Delivery`**

Persist or atomically reserve delivery ID before queueing. Duplicate returns `202` without second analysis.

- [ ] **Step 4: Handle PR actions**

Accept `opened`, `synchronize`, `reopened`; ignore unrelated actions with successful no-op response.

- [ ] **Step 5: Commit**

```bash
git add packages/github apps/web/app/api/github/webhook
git commit -m "feat: securely ingest GitHub App pull request events"
```

---

### Task 14: Analysis Worker and GitHub Check Publisher

**Files:**
- Create: `apps/worker/src/jobs/analyze-pr.ts`
- Create: `apps/worker/src/worker.ts`
- Create: `packages/github/src/checks.ts`
- Create: `packages/github/src/check-format.ts`
- Test: `apps/worker/src/jobs/analyze-pr.test.ts`
- Test: `packages/github/src/checks.test.ts`

**Interfaces:**
- Consumes `AnalysisJob`.
- Produces start/update/complete Check runs and persisted report.

- [ ] **Step 1: Write supersession test**

Queue analysis for head A, then head B. When A worker starts after B is current, assert A returns `cancelled_superseded` without publishing a current result.

- [ ] **Step 2: Implement worker orchestration**

Checkout exact SHA in ephemeral workspace, call the same analyzer as CLI, persist report, cleanup in `finally`.

- [ ] **Step 3: Implement Check formatting**

Summary must include:

```text
Risk: <band> (<score>/100)
Confidence: <percent>
Selected: <selected>/<total>
Decision: advisory/selective/full fallback
```

Include factor breakdown and evidence reasons in details.

- [ ] **Step 4: Implement line annotations conservatively**

Only annotate changed lines with valid source locations. Keep internal full report even when GitHub annotation limits require batching/truncation.

- [ ] **Step 5: Commit**

```bash
git add apps/worker packages/github
git commit -m "feat: analyze pull requests and publish GitHub Checks"
```

---

### Task 15: Shadow Calibration and Benchmark Harness

**Files:**
- Create: `benchmarks/src/replay.ts`
- Create: `benchmarks/src/metrics.ts`
- Create: `benchmarks/src/types.ts`
- Create: `packages/history/src/calibration.ts`
- Test: `benchmarks/src/metrics.test.ts`
- Test: `packages/history/src/calibration.test.ts`

**Interfaces:**
- Produces `CalibrationResult` and repository trust metrics.

- [ ] **Step 1: Test metric definitions**

```ts
expect(failureRecall({ selectedFailures: 9, allFailures: 10 })).toBe(0.9);
expect(selectionRatio({ selectedTests: 40, allTests: 400 })).toBe(0.1);
expect(runtimeRatio({ selectedMs: 20_000, allMs: 100_000 })).toBe(0.2);
```

- [ ] **Step 2: Implement historical replay without future leakage**

For historical PR `N`, only feed history from runs before `N` into ranking.

- [ ] **Step 3: Implement miss taxonomy**

Require one of:

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

- [ ] **Step 4: Implement promotion recommendation**

Default recommendation is true only when comparable runs >=50, failing-test recall >=0.99, and no unresolved systematic miss class. This is a recommendation; owner opt-in remains required.

- [ ] **Step 5: Commit**

```bash
git add benchmarks packages/history
git commit -m "feat: benchmark selective test safety in shadow mode"
```

---

### Task 16: Isolated Selective Test Runner

**Files:**
- Create: `packages/tests-core/src/executor.ts`
- Create: `packages/tests-core/src/limits.ts`
- Create: `apps/worker/src/jobs/run-tests.ts`
- Test: `packages/tests-core/src/executor.test.ts`
- Test: `apps/worker/src/jobs/run-tests.test.ts`

**Interfaces:**
- Produces `executeRunnerCommand(command, limits): Promise<ProcessResult>`.

- [ ] **Step 1: Test process argument safety**

A filename containing spaces/semicolon must remain one process argument and must never create another shell command.

- [ ] **Step 2: Implement isolated executor abstraction**

The initial local implementation may use a disposable container/process boundary in development, but hosted production configuration must execute untrusted repository tests outside the web/API service with explicit CPU/memory/time/output limits.

- [ ] **Step 3: Enforce policy before execution**

`run-tests.ts` accepts only `selective` or `full-fallback` decisions produced by `packages/policy`; it may not invent a narrower selection.

- [ ] **Step 4: Persist execution provenance**

Store exact selected test IDs/files, command adapter version, duration, result, and whether selection was selective/full.

- [ ] **Step 5: Commit**

```bash
git add packages/tests-core apps/worker/src/jobs/run-tests.ts
git commit -m "feat: execute policy-approved test plans in isolation"
```

---

### Task 17: ChangeGraph Dashboard

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/repos/[owner]/[name]/page.tsx`
- Create: `apps/web/app/repos/[owner]/[name]/pull/[number]/page.tsx`
- Create: `apps/web/components/risk-card.tsx`
- Create: `apps/web/components/confidence-card.tsx`
- Create: `apps/web/components/test-plan.tsx`
- Create: `apps/web/components/impact-graph.tsx`
- Test: `apps/web/components/risk-card.test.tsx`
- Test: `apps/web/app/repos/[owner]/[name]/pull/[number]/page.test.tsx`

**Interfaces:**
- Consumes immutable `ChangeGraphReportV1` and aggregate repository metrics.

- [ ] **Step 1: Install patched web stack**

Use Next.js `16.3.3` or newer security patch on the 16.3.x line and React 19.2-compatible versions.

- [ ] **Step 2: Write score-card rendering tests**

Given risk 72/high and confidence 0.91/high, assert both numeric value and factor labels render. Avoid color-only semantics.

- [ ] **Step 3: Build PR report page**

Order:

1. decision summary;
2. risk/confidence;
3. changed/affected entities;
4. selected tests with reasons;
5. impact graph;
6. fallback/audit details.

- [ ] **Step 4: Implement bounded impact graph rendering**

Initial response renders focused nodes around changed entities and selected tests. Expansion fetches more data; do not send/render entire maximum graph.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat: visualize ChangeGraph pull request evidence"
```

---

### Task 18: OpenTelemetry and Production Diagnostics

**Files:**
- Create: `packages/telemetry/src/tracing.ts`
- Create: `packages/telemetry/src/metrics.ts`
- Create: `packages/telemetry/src/index.ts`
- Modify: analyzer/worker/GitHub runner entrypoints to create spans.
- Test: `packages/telemetry/src/telemetry.test.ts`

**Interfaces:**
- Produces `withSpan(name, attrs, fn)` and metric instruments used by analysis boundaries.

- [ ] **Step 1: Test no-op telemetry configuration**

Core analysis must work when no exporter endpoint is configured.

- [ ] **Step 2: Instrument required spans**

Use names from `docs/ARCHITECTURE.md`, including index, diff mapping, graph traversal, test discovery/ranking, policy, execution, GitHub check publishing.

- [ ] **Step 3: Add required metrics**

Record analysis duration, graph size, parse/resolution failure ratios, selected/full test count, predicted/actual runtime, fallback reason, GitHub API calls, and false-negative audit events.

- [ ] **Step 4: Redact source**

Telemetry attributes may contain hashes/paths according to config but never full file contents, tokens, secrets, webhook bodies, or model prompts by default.

- [ ] **Step 5: Commit**

```bash
git add packages/telemetry apps packages
git commit -m "feat: instrument ChangeGraph analysis with OpenTelemetry"
```

---

## MVP Verification Gate

Before declaring the MVP complete, run all of the following.

### 1. Clean install and static checks

```bash
rm -rf node_modules
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
```

Expected: all commands exit 0.

### 2. Deterministic fixture analysis

```bash
pnpm --filter @changegraph/cli changegraph analyze \
  --repo fixtures/ts-basic \
  --base <fixture-base-sha> \
  --head <fixture-head-sha> \
  --json > /tmp/report.json
```

Expected report properties:

- schemaVersion = 1;
- changed symbol identified;
- dependent test selected;
- evidence path present;
- risk/confidence factor breakdown present;
- policy reason present.

The fixture setup must provide stable named refs or generated SHAs so this command is reproducible in test tooling; do not hard-code fake SHAs in production docs/scripts.

### 3. Hard fallback suite

Run benchmark fixture PRs that change:

- `pnpm-lock.yaml`;
- `tsconfig.json` module resolution;
- Vitest config;
- GitHub test workflow;
- migration/schema;
- >20% source files.

Expected: each policy result is `full-fallback` under default policy.

### 4. GitHub integration

On an installation test repository:

1. open a PR;
2. confirm webhook acknowledgement;
3. confirm exactly one analysis for a delivery/head SHA;
4. confirm in-progress Check appears;
5. confirm completed Check shows risk, confidence, test selection, and decision;
6. push another commit;
7. confirm new head supersedes old analysis.

### 5. Shadow benchmark

Run at least the controlled fixture suite and one real open-source TypeScript repository in Observe mode. Publish actual measured:

- failing-test recall;
- selection ratio;
- runtime ratio;
- fallback rate;
- miss categories.

Do not claim production-level target performance until the benchmark data supports it.

---

# Post-MVP Plans Required Before Implementation

The following design sections are intentionally **not implemented by this MVP plan** and require their own implementation plans after the MVP evidence is reviewed:

1. Evidence-linked LLM explanations.
2. Docker Sandboxes agent remediation.
3. Python/pytest adapter.
4. SCIP ingestion.
5. Dynamic per-test coverage ingestion.
6. Learned ranking/model calibration beyond fixed transparent weights.
7. Multi-repository service graphs.
8. Self-hosted/enterprise runner architecture.

Their product behavior and safety boundaries are already specified in the design and roadmap, but each is substantial enough to deserve an independent TDD implementation plan.
