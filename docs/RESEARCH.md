# ChangeGraph Research Landscape

**Research date:** 2026-09-04

This document records the external systems and first-party documentation that influenced ChangeGraph's design. It exists so future implementation decisions can distinguish researched precedent from ChangeGraph-specific hypotheses.

## 1. GitHub Apps and Checks

### Sources

- GitHub Apps: https://docs.github.com/en/apps
- GitHub App webhook tutorial: https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-a-github-app-that-responds-to-webhook-events
- Checks API: https://docs.github.com/en/rest/checks
- Check runs: https://docs.github.com/en/rest/checks/runs
- Building CI checks: https://docs.github.com/en/apps/creating-github-apps/writing-code-for-a-github-app/building-ci-checks-with-a-github-app
- Webhooks: https://docs.github.com/en/webhooks/about-webhooks

### Observations

GitHub Apps can receive pull-request and check-suite events through webhooks. GitHub's Checks API supports rich check runs, annotations on specific lines, re-runs, and structured status in a PR's Checks UI. GitHub documents that write access for creating check runs is available to GitHub Apps rather than normal OAuth/user authentication.

### Design consequence

ChangeGraph should be a GitHub App from the beginning, not a personal-access-token bot. The GitHub Check is the primary product surface. The dashboard is secondary detail/analytics.

---

## 2. GitHub coding agents

### Sources

- Copilot coding agents: https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents
- Research/plan/iterate workflow: https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/research-plan-iterate

### Observations

Current GitHub coding-agent workflows can research a repository, plan changes, modify branches, create pull requests, and participate in code review workflows. Agent-authored pull requests still require conventional validation and review.

### Design consequence

ChangeGraph should treat both human and agent-authored PRs identically at the analysis layer. The product opportunity is not another coding agent; it is validation and change intelligence that agents and humans can both consume.

---

## 3. Docker Sandboxes

### Sources

- Docker Sandboxes: https://docs.docker.com/ai/sandboxes/
- Getting started: https://docs.docker.com/ai/sandboxes/get-started/
- Supported agents: https://docs.docker.com/ai/sandboxes/agents/

### Observations

Docker Sandboxes currently run coding agents inside isolated microVM environments. Each sandbox has its own filesystem, network, and Docker daemon. Docker supports multiple coding agents, including Claude Code, Codex, Copilot, Cursor, Gemini, and others.

### Design consequence

ChangeGraph does not need to invent a sandbox runtime. Post-MVP remediation should define a generic `SandboxBackend` and support Docker Sandboxes as one backend. Agent execution remains downstream of deterministic impact analysis.

---

## 4. Nx affected graph

### Sources

- Affected tasks: https://nx.dev/docs/features/ci-features/affected
- Nx affected command: https://nx.dev/docs/reference/nx-commands
- Project/task graph concepts: https://nx.dev/docs/concepts/mental-model

### Observations

Nx uses Git changes plus a project graph to calculate which projects are affected, then limits tasks such as tests/builds to that affected subset. This is a mature example of deterministic change-aware CI reduction.

### Design consequence

ChangeGraph adopts the principle that changed files should be expanded through a dependency graph before choosing validation. The distinction is granularity: ChangeGraph aims at symbol/test evidence and integrates historical signals and explicit uncertainty, rather than depending solely on a configured project graph.

---

## 5. Predictive test selection / Launchable

### Source

- Test selection model overview: https://help.launchableinc.com/features/predictive-test-selection/how-launchable-selects-tests/

### Observations

Launchable documents predictive test selection using test execution history, test characteristics, and historical correlation between code changes and test failures to rank/select tests likely to reveal failures quickly.

### Design consequence

ChangeGraph should record per-test execution history and code-change correlations, but historical prediction is not sufficient for V1 safety. It is combined with static graph evidence and a deterministic fallback policy. Historical evidence is also Bayesian-smoothed so small sample counts cannot dominate.

---

## 6. Sourcegraph SCIP / semantic indexes

### Source

- Writing SCIP indexers: https://sourcegraph.com/docs/code-navigation/writing-an-indexer

### Observations

SCIP provides a language-independent representation of semantic code-index information produced by language-specific indexers. Sourcegraph recommends building an index from occurrences and progressively adding features.

### Design consequence

ChangeGraph V1 should use the TypeScript Compiler API directly to achieve deep TypeScript/JavaScript semantics quickly. Long term, a SCIP ingestion adapter is a strong route to multi-language support without implementing every semantic indexer ourselves.

---

## 7. TypeScript compiler direction

### Sources

- TypeScript 6.0 release notes: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html
- TypeScript docs: https://www.typescriptlang.org/docs/

### Observations

TypeScript 6.0 is current as of this plan and remains API-compatible with the TypeScript 5.9 knowledge model while preparing the ecosystem for the future native compiler. TypeScript's compiler tooling exposes syntax/type information and is a natural semantic source for a TypeScript-first V1.

### Design consequence

Use TypeScript 6 in the ChangeGraph codebase and keep the indexer API isolated so compiler implementation changes do not leak into scoring/report packages.

---

## 8. Current runtime/framework baselines

### Sources

- Node.js releases: https://nodejs.org/en/about/previous-releases
- Next.js release blog: https://nextjs.org/blog
- Vitest 5 announcement: https://vitest.dev/blog/vitest-5

### Observations

As of 2026-09-04:

- Node 24 is an LTS line; Node 26 is Current.
- Node's own guidance says production applications should use supported LTS releases.
- Next.js 16.3.3 is on the current Active LTS security-patched line.
- Vitest 5 was released on 2026-09-03.

### Design consequence

ChangeGraph plans on Node 24 LTS, patched Next.js 16.3.x, TypeScript 6, and Vitest 5 for its own test suite. Dependency versions should remain lockfile-pinned after implementation begins.

---

## 9. OpenTelemetry

### Source

- OpenTelemetry documentation: https://opentelemetry.io/docs/

### Observation

OpenTelemetry provides vendor-neutral APIs and conventions for traces, metrics, and logs.

### Design consequence

ChangeGraph should instrument analysis stages from the beginning. Performance claims such as “analysis took 4.2 seconds” or “test execution dropped 62%” should come from telemetry/benchmark evidence rather than handwritten demo numbers.

---

# 10. Competitive/adjacent capability matrix

This table is conceptual, not a claim that every listed project supports only the marked capability.

| Capability | Nx-style affected | Predictive test selection | GitHub Checks | ChangeGraph target |
|---|---:|---:|---:|---:|
| Git change input | Yes | Yes | N/A | Yes |
| Project dependency graph | Yes | Optional | N/A | Yes |
| Symbol-level impact evidence | Not core goal | Not core goal | N/A | Yes |
| Historical test-failure correlation | No | Yes | N/A | Yes |
| Risk/confidence split | No | Model-dependent | N/A | Yes |
| Explicit full-suite safety fallback | Workflow-specific | Product-specific | N/A | Yes |
| GitHub-native annotations | Via integrations | Via integrations | Native primitive | Yes |
| Isolated coding-agent remediation | No | No | No | Post-MVP |
| Evidence-linked AI explanation | No | No | No | Yes |

---

# 11. Research-derived differentiators to preserve

## 11.1 Risk and confidence are separate

Do not collapse them. A risky change can be well understood; a simple-looking change can be poorly understood.

## 11.2 Shadow mode is mandatory

The system must prove itself against full CI before being allowed to optimize CI.

## 11.3 Exploration prevents feedback collapse

A selector that never runs low-ranked tests can stop learning about missed relationships. Random/audit sampling is required for calibration.

## 11.4 Explainability is structural

The best explanation is not generated prose. It is an inspectable dependency/evidence path, optionally summarized by an LLM.

## 11.5 Agent remediation comes last

Agent patch generation is visually impressive but should not be built before the impact/test engine works. Otherwise ChangeGraph would become another generic coding-agent interface rather than a defensible developer-infrastructure project.

---

# 12. Open research questions for later experiments

These are research questions, not unspecified MVP requirements.

1. Does function/symbol-level graph analysis materially improve failing-test recall over file/package-level analysis on real TypeScript repositories?
2. What historical decay function best balances architectural drift with sparse data?
3. Can dynamic coverage be sampled cheaply enough to materially improve test mapping without slowing CI?
4. Which classes of JavaScript dynamism account for the largest false-negative risk?
5. How should risk weights be calibrated against real escaped failures rather than hand-selected thresholds?
6. Can graph centrality identify high-blast-radius code more accurately than simple fan-out?
7. How much random exploration is needed to detect selector blind spots while retaining CI savings?
8. Can agent-generated regression tests improve coverage without increasing flaky or overly implementation-specific tests?

Each question should eventually be answered by benchmark data and documented experiments rather than intuition.
